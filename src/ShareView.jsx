import { useEffect, useState } from 'react'

export default function ShareView() {
  const [games, setGames] = useState([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const data = params.get('picks')
    if (data) {
      try {
        const parsed = JSON.parse(decodeURIComponent(data))
        setGames(parsed)
      } catch (e) {
        console.error('Invalid share link')
      }
    }
  }, [])

  if (games.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400 text-xl">No picks found in this link 😢</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-purple-400 mb-2">🎮 GameDeck</h1>
        <p className="text-gray-400 text-lg">Someone's Top 10 Game Picks</p>
      </div>

      {/* Top 10 Grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-6">
        {games.map((game, index) => (
          <div key={game.id} className="relative group">
            {/* Rank Badge */}
            <div className={`absolute -top-3 -left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shadow-lg
              ${index === 0 ? 'bg-yellow-400 text-black' :
                index === 1 ? 'bg-gray-300 text-black' :
                index === 2 ? 'bg-amber-600 text-white' :
                'bg-purple-700 text-white'}`}>
              {index + 1}
            </div>

            {/* Card */}
            <div className="rounded-xl overflow-hidden border-2 border-gray-700 group-hover:border-purple-500 transition-all group-hover:scale-105 shadow-xl">
              <img
                src={game.background_image}
                alt={game.name}
                className="w-full h-48 object-cover"
              />
              <div className="bg-gray-900 p-2">
                <p className="text-white text-xs font-bold truncate">{game.name}</p>
                <p className="text-yellow-400 text-xs">⭐ {game.rating}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center mt-12">
        <p className="text-gray-500 text-sm mb-3">Want to make your own list?</p>
        <button
          onClick={() => window.location.href = window.location.origin}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-bold transition-all"
        >
          🎮 Create My GameDeck
        </button>
      </div>
    </div>
  )
}