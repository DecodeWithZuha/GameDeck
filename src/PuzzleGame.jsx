import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const DIFFICULTIES = {
  easy: { size: 3, label: 'Easy', sub: '9 pieces' },
  medium: { size: 5, label: 'Medium', sub: '25 pieces' },
  hard: { size: 7, label: 'Hard', sub: '49 pieces' },
  extreme: { size: 9, label: 'Extreme', sub: '81 pieces' },
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// Builds a shuffled, solvable puzzle order for an N x N grid.
// The last tile (index size*size - 1) is the empty slot.
function createShuffledOrder(size) {
  const total = size * size
  let order = Array.from({ length: total }, (_, i) => i)

  const isSolvable = (arr) => {
    const tiles = arr.filter(v => v !== total - 1)
    let inversions = 0
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        if (tiles[i] > tiles[j]) inversions++
      }
    }
    const blankRow = Math.floor(arr.indexOf(total - 1) / size)
    const blankRowFromBottom = size - blankRow
    if (size % 2 === 1) {
      return inversions % 2 === 0
    } else {
      if (blankRowFromBottom % 2 === 0) return inversions % 2 === 1
      return inversions % 2 === 0
    }
  }

  const shuffle = (arr) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  let attempt = shuffle(order)
  let tries = 0
  while ((!isSolvable(attempt) || isSolved(attempt)) && tries < 200) {
    attempt = shuffle(order)
    tries++
  }
  return attempt
}

function isSolved(order) {
  return order.every((v, i) => v === i)
}

function getNeighbors(index, size) {
  const row = Math.floor(index / size)
  const col = index % size
  const neighbors = []
  if (row > 0) neighbors.push(index - size)
  if (row < size - 1) neighbors.push(index + size)
  if (col > 0) neighbors.push(index - 1)
  if (col < size - 1) neighbors.push(index + 1)
  return neighbors
}

export default function PuzzleGame({ myList, user }) {
  const [selectedGame, setSelectedGame] = useState(null)
  const [difficulty, setDifficulty] = useState('easy')
  const [order, setOrder] = useState(null)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [solved, setSolved] = useState(false)
  const [moves, setMoves] = useState(0)
  const [showReference, setShowReference] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const timerRef = useRef(null)

  const size = DIFFICULTIES[difficulty].size
  const total = size * size

  useEffect(() => {
    if (running && !solved) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [running, solved])

  const startPuzzle = (game, diff) => {
    setSelectedGame(game)
    setDifficulty(diff)
    const newOrder = createShuffledOrder(DIFFICULTIES[diff].size)
    setOrder(newOrder)
    setSeconds(0)
    setMoves(0)
    setSolved(false)
    setRunning(true)
  }

  const resetToPicker = () => {
    clearInterval(timerRef.current)
    setSelectedGame(null)
    setOrder(null)
    setRunning(false)
    setSolved(false)
  }

  const handleTileClick = (clickedIndex) => {
    if (solved || !order) return
    const blankIndex = order.indexOf(total - 1)
    const neighbors = getNeighbors(blankIndex, size)
    if (!neighbors.includes(clickedIndex)) return

    const newOrder = [...order]
    ;[newOrder[blankIndex], newOrder[clickedIndex]] = [newOrder[clickedIndex], newOrder[blankIndex]]
    setOrder(newOrder)
    setMoves(m => m + 1)

    if (isSolved(newOrder)) {
      setSolved(true)
      setRunning(false)
    }
  }

  const handleShareResult = async () => {
    if (!selectedGame) return
    setSharing(true)
    try {
      const docRef = await addDoc(collection(db, 'puzzle_results'), {
        gameName: selectedGame.name,
        gameImage: selectedGame.background_image,
        difficulty,
        time: seconds,
        moves,
        userName: user?.displayName || 'A Gamer',
        createdAt: serverTimestamp(),
      })
      const link = `${window.location.origin}${window.location.pathname}?puzzleResult=${docRef.id}`
      try {
        await navigator.clipboard.writeText(link)
      } catch {
        const ta = document.createElement('textarea')
        ta.value = link
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 3000)
    } catch (err) {
      console.error('Failed to share puzzle result:', err)
      alert('ERROR. Try again.')
    } finally {
      setSharing(false)
    }
  }

  // ---------- Picker screen ----------
  if (!selectedGame) {
    return (
      <div className="p-3 sm:p-6">
        <h2 className="text-lg sm:text-2xl font-bold text-cyan-400 mb-2">🧩 Puzzle Game</h2>
        <p className="text-gray-400 text-sm mb-6">
          Choose a game from your deck and select a difficulty to start the puzzle.
        </p>

        {myList.length === 0 ? (
          <div className="text-center text-gray-600 py-16">
            <p className="text-4xl mb-3">🃏</p>
            <p>Choose a game from your deck to start the puzzle.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {myList.map(game => (
              <button
                key={game.id}
                onClick={() => setSelectedGame(game)}
                className="rounded-xl overflow-hidden border-2 border-gray-700 hover:border-cyan-400 transition-all hover:scale-105 text-left"
              >
                <img
                  src={game.background_image}
                  alt={game.name}
                  className="w-full h-24 sm:h-32 object-cover"
                />
                <div className="bg-gray-900 p-2">
                  <p className="text-white text-xs font-bold truncate">{game.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ---------- Difficulty picker for the selected game ----------
  if (selectedGame && !order) {
    return (
      <div className="p-3 sm:p-6">
        <button
          onClick={resetToPicker}
          className="text-gray-400 hover:text-white text-sm mb-4"
        >
          ← Choose a different game
        </button>

        <div className="flex flex-col items-center text-center mb-8">
          <img
            src={selectedGame.background_image}
            alt={selectedGame.name}
            className="w-48 h-32 object-cover rounded-xl border-2 border-cyan-500 mb-4"
          />
          <h2 className="text-xl font-bold text-white">{selectedGame.name}</h2>
          <p className="text-gray-400 text-sm mt-1">Choose your difficulty</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {Object.entries(DIFFICULTIES).map(([key, d]) => (
            <button
              key={key}
              onClick={() => startPuzzle(selectedGame, key)}
              className="bg-gray-900 border-2 border-gray-700 hover:border-cyan-400 rounded-xl p-4 transition-all hover:scale-105"
            >
              <p className="text-2xl mb-1">
                {key === 'easy' ? '🟢' : key === 'medium' ? '🟡' : key === 'hard' ? '🟠' : '🔴'}
              </p>
              <p className="text-white font-bold text-sm">{d.label}</p>
              <p className="text-gray-500 text-xs">{d.size}×{d.size} · {d.sub}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ---------- Active puzzle screen ----------
  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <button
          onClick={resetToPicker}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <div className="bg-gray-800 px-4 py-1.5 rounded-full text-sm font-bold text-white">
            ⏱️ {formatTime(seconds)}
          </div>
          <div className="bg-gray-800 px-4 py-1.5 rounded-full text-sm font-bold text-white">
            🔢 {moves} moves
          </div>
          <div className="bg-cyan-900/50 border border-cyan-700 px-4 py-1.5 rounded-full text-xs font-bold text-cyan-300">
            {DIFFICULTIES[difficulty].label} ({size}×{size})
          </div>
          <button
            onClick={() => setShowReference(s => !s)}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-1.5 rounded-full text-xs font-bold text-white transition-all"
          >
            {showReference ? '🙈 Hide Help' : '👁️ Show Help'}
          </button>
        </div>
      </div>

      {solved ? (
        <div className="text-center py-10">
          <p className="text-6xl mb-4">🎉</p>
          <h3 className="text-2xl font-bold text-green-400 mb-2">Solved!</h3>
          <p className="text-gray-400 mb-1">
            {selectedGame.name} · {DIFFICULTIES[difficulty].label}
          </p>
          <p className="text-gray-400 mb-6">
            Time: <span className="text-white font-bold">{formatTime(seconds)}</span> · Moves: <span className="text-white font-bold">{moves}</span>
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => startPuzzle(selectedGame, difficulty)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-full text-sm font-bold transition-all"
            >
              🔁 Play Again
            </button>
            <button
              onClick={handleShareResult}
              disabled={sharing}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all
                ${shareCopied ? 'bg-green-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}
                ${sharing ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {sharing ? '⏳ Creating...' : shareCopied ? '✅ Link Copied!' : '🔗 Share Result'}
            </button>
            <button
              onClick={resetToPicker}
              className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-full text-sm font-bold transition-all"
            >
              🃏 New Puzzle
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
          {/* Puzzle board */}
          <div className="mx-auto">
            <div
              className="grid bg-gray-900 rounded-xl overflow-hidden border-2 border-cyan-700 shadow-2xl"
              style={{
                gridTemplateColumns: `repeat(${size}, 1fr)`,
                width: 'min(90vw, 480px)',
                height: 'min(90vw, 480px)',
              }}
            >
              {order.map((tileValue, posIndex) => {
                const isBlank = tileValue === total - 1
                const tileRow = Math.floor(tileValue / size)
                const tileCol = tileValue % size
                return (
                  <div
                    key={posIndex}
                    onClick={() => handleTileClick(posIndex)}
                    className={`relative border border-gray-950 ${isBlank ? '' : 'cursor-pointer hover:opacity-90'}`}
                    style={{
                      backgroundImage: isBlank ? 'none' : `url(${selectedGame.background_image})`,
                      backgroundSize: `${size * 100}% ${size * 100}%`,
                      backgroundPosition: `${(tileCol / (size - 1)) * 100}% ${(tileRow / (size - 1)) * 100}%`,
                      backgroundColor: isBlank ? '#030712' : undefined,
                    }}
                  />
                )
              })}
            </div>
          </div>

          {/* Reference image */}
          {showReference && (
            <div className="mx-auto lg:sticky lg:top-4">
              <p className="text-gray-400 text-xs mb-2 text-center">Reference</p>
              <img
                src={selectedGame.background_image}
                alt={selectedGame.name}
                className="rounded-xl border-2 border-gray-700 shadow-xl"
                style={{ width: 'min(60vw, 220px)' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
