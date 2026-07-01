import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

function formatTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

// Rates the player's performance based on moves and pairs
function getRating(moves, pairs) {
  const ratio = moves / pairs
  if (ratio <= 1.5) return { stars: '⭐⭐⭐', label: 'Perfect Memory!' }
  if (ratio <= 2.5) return { stars: '⭐⭐', label: 'Great Job!' }
  return { stars: '⭐', label: 'Keep Practicing!' }
}

export default function MemoryResultView() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const load = async () => {
      const params = new URLSearchParams(window.location.search)
      const id = params.get('memoryResult')
      if (!id) { setLoading(false); setNotFound(true); return }
      try {
        const snap = await getDoc(doc(db, 'memory_results', id))
        if (snap.exists()) setResult(snap.data())
        else setNotFound(true)
      } catch (err) {
        console.error('Failed to load memory result:', err)
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

  const rating = getRating(result.moves, result.pairs)

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 text-center">
      {/* Header */}
      <h1 className="text-3xl sm:text-4xl font-bold text-green-400 mb-1">🃏 Memory Match</h1>
      <p className="text-gray-400 mb-8">Result shared by <span className="text-white font-bold">{result.userName}</span></p>

      {/* Rating */}
      <div className="text-4xl mb-1">{rating.stars}</div>
      <p className="text-lg font-bold text-white mb-8">{rating.label}</p>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10 w-full max-w-lg">
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-4">
          <p className="text-2xl font-black text-green-400">{formatTime(result.time)}</p>
          <p className="text-gray-500 text-xs mt-1">Time</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-4">
          <p className="text-2xl font-black text-white">{result.moves}</p>
          <p className="text-gray-500 text-xs mt-1">Moves</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-4">
          <p className="text-2xl font-black text-yellow-400">{result.pairs}</p>
          <p className="text-gray-500 text-xs mt-1">Pairs</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-4">
          <p className="text-xl font-black text-purple-400 capitalize">{result.difficulty}</p>
          <p className="text-gray-500 text-xs mt-1">Difficulty</p>
        </div>
      </div>

      <button
        onClick={() => window.location.href = window.location.origin}
        className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-bold text-lg transition-all"
      >
        🎮 Beat Their Score!
      </button>
    </div>
  )
}
