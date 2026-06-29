import { useState, useEffect } from 'react'
import { fetchGames, GENRES } from './api'

function App() {
  const [games, setGames] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchGames(selectedGenre).then(data => {
      setGames(data)
      setLoading(false)
    })
  }, [selectedGenre])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-3xl font-bold text-purple-400">🎮 GameDeck</h1>
      </div>

      {/* Genre Filter */}
      <div className="flex gap-3 p-6 flex-wrap">
        <button
          onClick={() => setSelectedGenre('')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all
            ${selectedGenre === '' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
        >
          All
        </button>
        {GENRES.map(genre => (
          <button
            key={genre.slug}
            onClick={() => setSelectedGenre(genre.slug)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all
              ${selectedGenre === genre.slug ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            {genre.name}
          </button>
        ))}
      </div>

      {/* Games Grid */}
      {loading ? (
        <div className="text-center text-gray-400 mt-20 text-xl">Loading games...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-6">
          {games.map(game => (
            <div key={game.id} className="bg-gray-900 rounded-xl overflow-hidden hover:scale-105 transition-all cursor-pointer border border-gray-800 hover:border-purple-500">
              <img
                src={game.background_image}
                alt={game.name}
                className="w-full h-40 object-cover"
              />
              <div className="p-3">
                <p className="text-sm font-semibold text-white truncate">{game.name}</p>
                <p className="text-xs text-yellow-400 mt-1">⭐ {game.rating}</p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default App