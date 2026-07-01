import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

function formatTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

// Give a rank title based on score
function getRank(score) {
  if (score >= 500) return { title: 'Bubble Master 🏆', color: 'text-yellow-400' }
  if (score >= 300) return { title: 'Sharp Shooter 🎯', color: 'text-cyan-400' }
  if (score >= 150) return { title: 'Bubble Popper 💥', color: 'text-pink-400' }
  return { title: 'Getting Started 🫧', color: 'text-gray-400' }
}

export default function BubbleResultView() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const load = async () => {
      const params = new URLSearchParams(window.location.search)
      const id = params.get('bubbleResult')
      if (!id) { setLoading(false); setNotFound(true); return }
      try {
        const snap = await getDoc(doc(db, 'bubble_results', id))
        if (snap.exists()) setResult(snap.data())
        else setNotFound(true)
      } catch (err) {
        console.error('Failed to load bubble result:', err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-400 text-xl animate-pulse">Loading result...</p>
    </div>
  )

  if (notFound || !result) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-400 text-xl">Result not found 😢</p>
    </div>
  )

  const rank = getRank(result.score)
  const won = result.result === 'won'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 text-center">
      {/* Header */}
      <p className="text-6xl mb-3">{won ? '🏆' : '💥'}</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-pink-400 mb-1">🫧 Bubble Shooter</h1>
      <p className="text-gray-400 mb-2">
        Score shared by <span className="text-white font-bold">{result.userName}</span>
      </p>

      {/* Outcome badge */}
      <div className={`inline-block px-4 py-1 rounded-full text-sm font-bold mb-6
        ${won ? 'bg-green-900/50 border border-green-600 text-green-400' : 'bg-red-900/50 border border-red-700 text-red-400'}`}>
        {won ? '✅ Board Cleared!' : '💀 Game Over'}
      </div>

      {/* Rank */}
      <p className={`text-xl font-bold mb-8 ${rank.color}`}>{rank.title}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-10 w-full max-w-xs">
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-5">
          <p className="text-3xl font-black text-pink-400">{result.score}</p>
          <p className="text-gray-500 text-xs mt-1">Score</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-5">
          <p className="text-3xl font-black text-white">{formatTime(result.time)}</p>
          <p className="text-gray-500 text-xs mt-1">Time</p>
        </div>
      </div>

      <button
        onClick={() => window.location.href = window.location.origin}
        className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-full font-bold text-lg transition-all"
      >
        🫧 Beat Their Score!
      </button>
    </div>
  )
}
