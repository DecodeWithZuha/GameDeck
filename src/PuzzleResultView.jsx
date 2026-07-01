import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function PuzzleResultView() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const load = async () => {
      const params = new URLSearchParams(window.location.search)
      const id = params.get('puzzleResult')
      if (!id) {
        setLoading(false)
        setNotFound(true)
        return
      }
      try {
        const ref = doc(db, 'puzzle_results', id)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          setResult(snap.data())
        } else {
          setNotFound(true)
        }
      } catch (err) {
        console.error('Failed to load puzzle result:', err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400 text-xl">Loading result...</p>
      </div>
    )
  }

  if (notFound || !result) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400 text-xl">Result not found 😢</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-bold text-cyan-400 mb-1">🧩 Puzzle Solved!</h1>
      <p className="text-gray-400 mb-8">
        {result.userName ? `${result.userName} just solved a puzzle` : 'Puzzle completed'}
      </p>

      <img
        src={result.gameImage}
        alt={result.gameName}
        className="w-64 h-40 object-cover rounded-xl border-2 border-cyan-500 shadow-2xl mb-6"
      />

      <h2 className="text-xl font-bold text-white mb-1">{result.gameName}</h2>
      <p className="text-cyan-300 text-sm font-bold mb-6 capitalize">{result.difficulty} difficulty</p>

      <div className="flex gap-6 mb-10">
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-6 py-3">
          <p className="text-2xl font-black text-white">{formatTime(result.time)}</p>
          <p className="text-gray-500 text-xs">Time</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-6 py-3">
          <p className="text-2xl font-black text-white">{result.moves}</p>
          <p className="text-gray-500 text-xs">Moves</p>
        </div>
      </div>

      <button
        onClick={() => window.location.href = window.location.origin}
        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-bold transition-all"
      >
        🎮 Try GameDeck Yourself
      </button>
    </div>
  )
}
