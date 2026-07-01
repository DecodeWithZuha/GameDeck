import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

// Difficulty settings: pairs count and grid columns
const DIFFICULTIES = {
  easy:   { pairs: 6,  cols: 4, label: 'Easy',   emoji: '🟢' },
  medium: { pairs: 10, cols: 5, label: 'Medium',  emoji: '🟡' },
  hard:   { pairs: 15, cols: 6, label: 'Hard',    emoji: '🔴' },
}

function formatTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

// Shuffle an array using Fisher-Yates algorithm
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Build the card grid from the user's deck
function buildCards(games, pairs) {
  const picked = shuffle(games).slice(0, pairs)
  // Each game appears twice (one pair)
  const doubled = picked.flatMap((g, i) => [
    { id: `${g.id}-a`, pairId: g.id, name: g.name, image: g.background_image },
    { id: `${g.id}-b`, pairId: g.id, name: g.name, image: g.background_image },
  ])
  return shuffle(doubled)
}

export default function MemoryGame({ myList, user }) {
  const [difficulty, setDifficulty] = useState(null)
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])   // indices of currently face-up (unmatched) cards
  const [matched, setMatched] = useState([])   // pairIds that have been matched
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [won, setWon] = useState(false)
  const [locked, setLocked] = useState(false)  // prevents clicking during mismatch delay
  const [sharing, setSharing] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const timerRef = useRef(null)

  // Timer tick
  useEffect(() => {
    if (running && !won) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [running, won])

  const startGame = (diff) => {
    const cfg = DIFFICULTIES[diff]
    setDifficulty(diff)
    setCards(buildCards(myList, cfg.pairs))
    setFlipped([])
    setMatched([])
    setMoves(0)
    setSeconds(0)
    setWon(false)
    setLocked(false)
    setRunning(true)
  }

  const resetToPicker = () => {
    clearInterval(timerRef.current)
    setDifficulty(null)
    setRunning(false)
    setWon(false)
  }

  const handleCardClick = (index) => {
    if (locked || won) return
    const card = cards[index]

    // Ignore already-matched or already-flipped cards
    if (matched.includes(card.pairId)) return
    if (flipped.includes(index)) return
    if (flipped.length === 2) return

    const newFlipped = [...flipped, index]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setMoves(m => m + 1)
      const [a, b] = newFlipped.map(i => cards[i])

      if (a.pairId === b.pairId) {
        // Match found
        const newMatched = [...matched, a.pairId]
        setMatched(newMatched)
        setFlipped([])
        // Check win condition
        if (newMatched.length === cards.length / 2) {
          setWon(true)
          setRunning(false)
        }
      } else {
        // No match — flip back after a short delay
        setLocked(true)
        setTimeout(() => {
          setFlipped([])
          setLocked(false)
        }, 900)
      }
    }
  }

  const handleShare = async () => {
    setSharing(true)
    try {
      const docRef = await addDoc(collection(db, 'memory_results'), {
        difficulty,
        time: seconds,
        moves,
        pairs: DIFFICULTIES[difficulty].pairs,
        userName: user?.displayName || 'A Gamer',
        createdAt: serverTimestamp(),
      })
      const link = `${window.location.origin}${window.location.pathname}?memoryResult=${docRef.id}`
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

  const cfg = difficulty ? DIFFICULTIES[difficulty] : null

  // ---------- Difficulty / game picker ----------
  if (!difficulty) {
    return (
      <div className="p-3 sm:p-6">
        <h2 className="text-lg sm:text-2xl font-bold text-green-400 mb-2">🃏 Memory Match</h2>
        <p className="text-gray-400 text-sm mb-6">
          Flip cards to find matching game covers from your deck!
        </p>

        {myList.length < 6 ? (
          <div className="text-center text-gray-600 py-16">
            <p className="text-4xl mb-3">🃏</p>
            <p>Add at least 6 games to your deck to play Memory Match.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
            {Object.entries(DIFFICULTIES).map(([key, d]) => (
              <button
                key={key}
                disabled={myList.length < d.pairs}
                onClick={() => startGame(key)}
                className={`bg-gray-900 border-2 rounded-xl p-5 transition-all text-left
                  ${myList.length < d.pairs
                    ? 'border-gray-800 opacity-40 cursor-not-allowed'
                    : 'border-gray-700 hover:border-green-400 hover:scale-105'}`}
              >
                <p className="text-2xl mb-2">{d.emoji}</p>
                <p className="text-white font-bold">{d.label}</p>
                <p className="text-gray-400 text-xs mt-1">{d.pairs} pairs · {d.pairs * 2} cards</p>
                {myList.length < d.pairs && (
                  <p className="text-gray-600 text-xs mt-2">Need {d.pairs} games in deck</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ---------- Win screen ----------
  if (won) {
    return (
      <div className="p-3 sm:p-6 text-center">
        <p className="text-6xl mb-4">🎉</p>
        <h3 className="text-2xl font-bold text-green-400 mb-2">You Won!</h3>
        <p className="text-gray-400 mb-6">
          {cfg.label} · Time: <span className="text-white font-bold">{formatTime(seconds)}</span>
          {' '}· Moves: <span className="text-white font-bold">{moves}</span>
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={() => startGame(difficulty)}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full text-sm font-bold transition-all">
            🔁 Play Again
          </button>
          <button onClick={handleShare} disabled={sharing}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all
              ${shareCopied ? 'bg-green-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}
              ${sharing ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {sharing ? '⏳...' : shareCopied ? '✅ Copied!' : '🔗 Share Result'}
          </button>
          <button onClick={resetToPicker}
            className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-full text-sm font-bold transition-all">
            🏠 Menu
          </button>
        </div>
      </div>
    )
  }

  // ---------- Active game board ----------
  return (
    <div className="p-3 sm:p-6">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5 justify-between">
        <button onClick={resetToPicker} className="text-gray-400 hover:text-white text-sm">
          ← Menu
        </button>
        <div className="flex gap-2 flex-wrap justify-center">
          <div className="bg-gray-800 px-4 py-1.5 rounded-full text-sm font-bold text-white">
            ⏱️ {formatTime(seconds)}
          </div>
          <div className="bg-gray-800 px-4 py-1.5 rounded-full text-sm font-bold text-white">
            🔢 {moves} moves
          </div>
          <div className="bg-gray-800 px-4 py-1.5 rounded-full text-sm font-bold text-white">
            ✅ {matched.length}/{cards.length / 2} pairs
          </div>
          <div className="bg-green-900/50 border border-green-700 px-4 py-1.5 rounded-full text-xs font-bold text-green-300">
            {cfg.label}
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div
        className="grid gap-2 sm:gap-3 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))`,
          maxWidth: cfg.cols <= 4 ? '400px' : cfg.cols <= 5 ? '520px' : '640px',
        }}
      >
        {cards.map((card, index) => {
          const isFaceUp = flipped.includes(index) || matched.includes(card.pairId)
          const isMatchedCard = matched.includes(card.pairId)

          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(index)}
              className="relative cursor-pointer"
              style={{ perspective: '600px' }}
            >
              {/* Card flip container */}
              <div
                className="relative w-full transition-transform duration-300"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFaceUp ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  aspectRatio: '3/4',
                }}
              >
                {/* Card back */}
                <div
                  className="absolute inset-0 rounded-xl border-2 border-gray-700 bg-gray-900 flex items-center justify-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="text-2xl sm:text-3xl">🎮</span>
                </div>

                {/* Card front (game cover) */}
                <div
                  className={`absolute inset-0 rounded-xl border-2 overflow-hidden
                    ${isMatchedCard ? 'border-green-400 ring-2 ring-green-400/50' : 'border-purple-500'}`}
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <img
                    src={card.image}
                    alt={card.name}
                    className="w-full h-full object-cover"
                  />
                  {isMatchedCard && (
                    <div className="absolute inset-0 bg-green-400/20 flex items-center justify-center">
                      <span className="text-2xl">✅</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
