import { useState, useEffect, useRef, useCallback } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

// Grid configuration
const COLS = 10
const ROWS = 12          // total rows in the grid (only top rows are filled initially)
const FILLED_ROWS = 5    // rows filled at game start
const BUBBLE_R = 24      // bubble radius in pixels
const W = COLS * BUBBLE_R * 2
const H = (ROWS + 2) * BUBBLE_R * 2
const SHOOTER_Y = H - BUBBLE_R * 2

// Extract a representative color from a game cover using an offscreen canvas
function extractColor(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1; canvas.height = 1
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, 1, 1)
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
      resolve(`rgb(${r},${g},${b})`)
    }
    img.onerror = () => resolve('#7c3aed') // fallback purple
    img.src = imageUrl
  })
}

// Build the initial bubble grid from a palette of game colors
function buildGrid(palette) {
  const grid = []
  for (let row = 0; row < ROWS; row++) {
    grid.push([])
    for (let col = 0; col < COLS; col++) {
      if (row < FILLED_ROWS) {
        // Pick a random color from the palette for filled rows
        grid[row].push(palette[Math.floor(Math.random() * palette.length)])
      } else {
        grid[row].push(null) // empty cell
      }
    }
  }
  return grid
}

// Convert grid row/col to canvas pixel center
function gridToPixel(row, col) {
  const offset = row % 2 === 0 ? 0 : BUBBLE_R // hex offset for odd rows
  return {
    x: col * BUBBLE_R * 2 + BUBBLE_R + offset,
    y: row * BUBBLE_R * 2 + BUBBLE_R,
  }
}

// Find all bubbles connected to the top that are reachable (flood fill)
function findConnectedToTop(grid) {
  const visited = new Set()
  const queue = []

  // Seed with all bubbles in row 0
  for (let col = 0; col < COLS; col++) {
    if (grid[0][col]) {
      const key = `0,${col}`
      visited.add(key)
      queue.push([0, col])
    }
  }

  while (queue.length) {
    const [r, c] = queue.shift()
    for (const [nr, nc] of getNeighbors(r, c)) {
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
      const key = `${nr},${nc}`
      if (!visited.has(key) && grid[nr][nc]) {
        visited.add(key)
        queue.push([nr, nc])
      }
    }
  }
  return visited
}

// Get hex-grid neighbors for a given row/col
function getNeighbors(row, col) {
  const isEven = row % 2 === 0
  return [
    [row - 1, isEven ? col - 1 : col],
    [row - 1, isEven ? col : col + 1],
    [row,     col - 1],
    [row,     col + 1],
    [row + 1, isEven ? col - 1 : col],
    [row + 1, isEven ? col : col + 1],
  ]
}

// Flood fill to find all same-color bubbles connected to a starting cell
function findCluster(grid, startRow, startCol, color) {
  const visited = new Set()
  const queue = [[startRow, startCol]]
  const cluster = []

  while (queue.length) {
    const [r, c] = queue.shift()
    const key = `${r},${c}`
    if (visited.has(key)) continue
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue
    if (grid[r][c] !== color) continue
    visited.add(key)
    cluster.push([r, c])
    for (const [nr, nc] of getNeighbors(r, c)) queue.push([nr, nc])
  }
  return cluster
}

function formatTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

export default function BubbleShooter({ myList, user }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(null) // holds mutable game state between renders
  const animRef = useRef(null)

  const [phase, setPhase] = useState('loading') // loading | playing | won | lost
  const [score, setScore] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [sharing, setSharing] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [palette, setPalette] = useState([])
  const timerRef = useRef(null)

  // Extract colors from the user's deck covers to build the bubble palette
  useEffect(() => {
    if (myList.length === 0) return
    const samples = myList.slice(0, 8)
    Promise.all(samples.map(g => extractColor(g.background_image))).then(colors => {
      // Deduplicate similar colors (basic check)
      const unique = [...new Set(colors)]
      setPalette(unique.length >= 2 ? unique : ['#7c3aed', '#06b6d4', '#f59e0b', '#10b981'])
      setPhase('ready')
    })
  }, [myList])

  // Timer
  useEffect(() => {
    if (phase === 'playing') {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [phase])

  const startGame = useCallback(() => {
    if (!palette.length) return
    const grid = buildGrid(palette)
    const shooterColor = palette[Math.floor(Math.random() * palette.length)]
    const nextColor = palette[Math.floor(Math.random() * palette.length)]

    stateRef.current = {
      grid,
      palette,
      shooterColor,
      nextColor,
      bullet: null,      // { x, y, vx, vy, color }
      score: 0,
      angle: -Math.PI / 2, // straight up initially
    }

    setScore(0)
    setSeconds(0)
    setPhase('playing')
  }, [palette])

  // Main game loop: draw everything on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !stateRef.current) return
    const ctx = canvas.getContext('2d')
    const state = stateRef.current

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#030712'
    ctx.fillRect(0, 0, W, H)

    // Draw grid bubbles
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const color = state.grid[row][col]
        if (!color) continue
        const { x, y } = gridToPixel(row, col)
        ctx.beginPath()
        ctx.arc(x, y, BUBBLE_R - 2, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    // Draw danger line (if bubbles reach row 9)
    ctx.strokeStyle = 'rgba(239,68,68,0.3)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, ROWS / 1.4 * BUBBLE_R * 2)
    ctx.lineTo(W, ROWS / 1.4 * BUBBLE_R * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw shooter aim line
    const sx = W / 2
    const sy = SHOOTER_Y
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    ctx.setLineDash([6, 8])
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx + Math.cos(state.angle) * 120, sy + Math.sin(state.angle) * 120)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // Draw shooter bubble
    ctx.beginPath()
    ctx.arc(sx, sy, BUBBLE_R - 2, 0, Math.PI * 2)
    ctx.fillStyle = state.shooterColor
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw "next" bubble (smaller, to the side)
    ctx.beginPath()
    ctx.arc(sx + BUBBLE_R * 3, sy, BUBBLE_R * 0.65, 0, Math.PI * 2)
    ctx.fillStyle = state.nextColor
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Draw flying bullet
    if (state.bullet) {
      ctx.beginPath()
      ctx.arc(state.bullet.x, state.bullet.y, BUBBLE_R - 2, 0, Math.PI * 2)
      ctx.fillStyle = state.bullet.color
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }, [])

  // Move bullet and handle collision each frame
  const tick = useCallback(() => {
    const state = stateRef.current
    if (!state || phase !== 'playing') return

    if (state.bullet) {
      const b = state.bullet

      // Bounce off left/right walls
      if (b.x - BUBBLE_R <= 0 || b.x + BUBBLE_R >= W) b.vx *= -1
      b.x += b.vx
      b.y += b.vy

      // Snap bullet to grid when it hits the top wall or another bubble
      let snapped = false

      if (b.y - BUBBLE_R <= 0) {
        // Hit the ceiling — snap to row 0
        const col = Math.round((b.x - BUBBLE_R) / (BUBBLE_R * 2))
        snapBullet(state, 0, Math.max(0, Math.min(COLS - 1, col)))
        snapped = true
      } else {
        // Check collision with existing grid bubbles
        outer: for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            if (!state.grid[row][col]) continue
            const { x, y } = gridToPixel(row, col)
            const dx = b.x - x, dy = b.y - y
            if (dx * dx + dy * dy < (BUBBLE_R * 2) ** 2) {
              // Find the nearest empty cell adjacent to the hit bubble
              const neighbors = getNeighbors(row, col)
              let best = null, bestDist = Infinity
              for (const [nr, nc] of neighbors) {
                if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
                if (state.grid[nr][nc]) continue
                const { x: nx, y: ny } = gridToPixel(nr, nc)
                const d = (b.x - nx) ** 2 + (b.y - ny) ** 2
                if (d < bestDist) { bestDist = d; best = [nr, nc] }
              }
              if (best) {
                snapBullet(state, best[0], best[1])
              } else {
                // No adjacent empty — just place on the hit row
                snapBullet(state, row, col)
              }
              snapped = true
              break outer
            }
          }
        }
      }

      if (!snapped) {
        // Bullet fell below the grid (shouldn't happen but safety check)
        if (b.y > H) state.bullet = null
      }
    }

    draw()
    animRef.current = requestAnimationFrame(tick)
  }, [phase, draw])

  // Snap a bullet to the grid, pop clusters, check win/lose
  const snapBullet = (state, row, col) => {
    state.grid[row][col] = state.bullet.color
    state.bullet = null

    // Find connected same-color cluster
    const cluster = findCluster(state.grid, row, col, state.grid[row][col])

    if (cluster.length >= 3) {
      // Pop the cluster
      cluster.forEach(([r, c]) => { state.grid[r][c] = null })
      const popped = cluster.length

      // Remove bubbles no longer connected to the ceiling (floating)
      const connected = findConnectedToTop(state.grid)
      let floaters = 0
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (state.grid[r][c] && !connected.has(`${r},${c}`)) {
            state.grid[r][c] = null
            floaters++
          }
        }
      }
      const gained = popped * 10 + floaters * 20
      state.score += gained
      setScore(state.score)
    }

    // Check lose: any bubble reached the bottom rows
    for (let col = 0; col < COLS; col++) {
      if (state.grid[ROWS - 1][col] || state.grid[ROWS - 2][col]) {
        setPhase('lost')
        return
      }
    }

    // Check win: no bubbles left
    const anyLeft = state.grid.some(row => row.some(c => c !== null))
    if (!anyLeft) { setPhase('won'); return }

    // Load next bubble into the shooter
    state.shooterColor = state.nextColor
    state.nextColor = state.palette[Math.floor(Math.random() * state.palette.length)]
  }

  // Start animation loop when phase is playing
  useEffect(() => {
    if (phase === 'playing') {
      animRef.current = requestAnimationFrame(tick)
    }
    return () => cancelAnimationFrame(animRef.current)
  }, [phase, tick])

  // Mouse / touch move: rotate shooter angle
  const handlePointerMove = (e) => {
    if (!stateRef.current || phase !== 'playing') return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const mx = (clientX - rect.left) * (W / rect.width)
    const my = (clientY - rect.top) * (H / rect.height)
    const angle = Math.atan2(my - SHOOTER_Y, mx - W / 2)
    // Clamp so the shooter can't aim straight down
    stateRef.current.angle = Math.max(-Math.PI + 0.2, Math.min(-0.2, angle))
  }

  // Click / tap: shoot the bubble
  const handleShoot = () => {
    if (!stateRef.current || phase !== 'playing') return
    const state = stateRef.current
    if (state.bullet) return // already one in the air
    const SPEED = 10
    state.bullet = {
      x: W / 2,
      y: SHOOTER_Y,
      vx: Math.cos(state.angle) * SPEED,
      vy: Math.sin(state.angle) * SPEED,
      color: state.shooterColor,
    }
  }

  const handleShare = async () => {
    setSharing(true)
    try {
      const docRef = await addDoc(collection(db, 'bubble_results'), {
        score,
        time: seconds,
        result: phase,
        userName: user?.displayName || 'A Gamer',
        createdAt: serverTimestamp(),
      })
      const link = `${window.location.origin}${window.location.pathname}?bubbleResult=${docRef.id}`
      try { await navigator.clipboard.writeText(link) } catch {
        const ta = document.createElement('textarea')
        ta.value = link
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 3000)
    } catch (err) {
      console.error('Share failed:', err)
    } finally {
      setSharing(false)
    }
  }

  // ---------- Loading ----------
  if (phase === 'loading') {
    return (
      <div className="p-6 text-center text-gray-400">
        <p className="text-2xl mb-2">🫧</p>
        <p>Extracting colors from your game covers...</p>
      </div>
    )
  }

  // ---------- No games ----------
  if (myList.length === 0) {
    return (
      <div className="p-6 text-center text-gray-600">
        <p className="text-4xl mb-3">🃏</p>
        <p>Add games to your deck to play Bubble Shooter!</p>
      </div>
    )
  }

  // ---------- Ready to start ----------
  if (phase === 'ready') {
    return (
      <div className="p-3 sm:p-6 text-center">
        <h2 className="text-lg sm:text-2xl font-bold text-cyan-400 mb-2">🫧 Bubble Shooter</h2>
        <p className="text-gray-400 text-sm mb-6">
          Bubbles are colored using your game covers. Match 3 or more to pop them!
        </p>
        {/* Color palette preview */}
        <div className="flex gap-2 justify-center mb-8 flex-wrap">
          {palette.map((color, i) => (
            <div key={i} className="w-8 h-8 rounded-full border-2 border-gray-700 shadow"
              style={{ backgroundColor: color }} />
          ))}
        </div>
        <button onClick={startGame}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-3 rounded-full font-bold text-lg transition-all">
          🎮 Start Game
        </button>
      </div>
    )
  }

  // ---------- Win / lose ----------
  if (phase === 'won' || phase === 'lost') {
    return (
      <div className="p-3 sm:p-6 text-center">
        <p className="text-6xl mb-4">{phase === 'won' ? '🏆' : '💥'}</p>
        <h3 className={`text-2xl font-bold mb-2 ${phase === 'won' ? 'text-yellow-400' : 'text-red-400'}`}>
          {phase === 'won' ? 'Board Cleared!' : 'Game Over!'}
        </h3>
        <p className="text-gray-400 mb-6">
          Score: <span className="text-white font-bold text-xl">{score}</span>
          {' '}· Time: <span className="text-white font-bold">{formatTime(seconds)}</span>
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={startGame}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-full text-sm font-bold transition-all">
            🔁 Play Again
          </button>
          <button onClick={handleShare} disabled={sharing}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all
              ${shareCopied ? 'bg-green-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}
              ${sharing ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {sharing ? '⏳...' : shareCopied ? '✅ Copied!' : '🔗 Share Score'}
          </button>
          <button onClick={() => setPhase('ready')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-full text-sm font-bold transition-all">
            🏠 Menu
          </button>
        </div>
      </div>
    )
  }

  // ---------- Active game ----------
  return (
    <div className="p-3 sm:p-6">
      {/* HUD */}
      <div className="flex flex-wrap items-center gap-3 mb-4 justify-between">
        <button onClick={() => { cancelAnimationFrame(animRef.current); setPhase('ready') }}
          className="text-gray-400 hover:text-white text-sm">
          ← Menu
        </button>
        <div className="flex gap-2 flex-wrap">
          <div className="bg-gray-800 px-4 py-1.5 rounded-full text-sm font-bold text-white">
            ⭐ {score}
          </div>
          <div className="bg-gray-800 px-4 py-1.5 rounded-full text-sm font-bold text-white">
            ⏱️ {formatTime(seconds)}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs text-gray-500 mb-3 text-center">
        🖱️ Move to aim · Click/tap to shoot · Match 3+ same-color bubbles to pop!
      </p>

      {/* Game canvas */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="rounded-xl border-2 border-gray-700 cursor-crosshair"
          style={{ maxWidth: '100%', touchAction: 'none' }}
          onMouseMove={handlePointerMove}
          onTouchMove={handlePointerMove}
          onClick={handleShoot}
          onTouchEnd={handleShoot}
        />
      </div>
    </div>
  )
}
