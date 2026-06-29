import { useState, useEffect } from 'react'
import { fetchGames, GENRES } from './api'
import SolitaireBoard from './SolitaireBoard'

function App() {
  const [games, setGames] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('')
  const [loading, setLoading] = useState(true)
  const [myList, setMyList] = useState([])
  const [activeTab, setActiveTab] = useState('browse')

  useEffect(() => {
    setLoading(true)
    fetchGames(selectedGenre).then(data => {
      setGames(data)
      setLoading(false)
    })
  }, [selectedGenre])

  const toggleGame = (game) => {
    setMyList(prev =>
      prev.find(g => g.id === game.id)
        ? prev.filter(g => g.id !== game.id)
        : [...prev, game]
    )
  }

  const isAdded = (game) => myList.find(g => g.id === game.id)

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="p-6 border-b border-gray-800 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-purple-400">🎮 GameDeck</h1>
        <div className="bg-purple-900 px-4 py-2 rounded-full text-sm font-medium">
          My Deck: {myList.length} games
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 pt-4">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-5 py-2 rounded-full text-sm font-bold transition-all
            ${activeTab === 'browse' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          🕹️ Browse Games
        </button>
        <button
          onClick={() => setActiveTab('mydeck')}
          className={`px-5 py-2 rounded-full text-sm font-bold transition-all
            ${activeTab === 'mydeck' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          🃏 My Deck {myList.length > 0 && `(${myList.length})`}
        </button>
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <>
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
            <div className="text-center text-gray-400 mt-20 text-xl">
              Loading games... 🎮
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 px-6 pb-6">
              {games.map(game => (
                <div
                  key={game.id}
                  className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-purple-500 transition-all group"
                >
                  <div className="relative">
                    <img
                      src={game.background_image}
                      alt={game.name}
                      className="w-full h-40 object-cover group-hover:scale-105 transition-all"
                    />
                    <button
                      onClick={() => toggleGame(game)}
                      className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-bold transition-all
                        ${isAdded(game)
                          ? 'bg-green-500 text-white'
                          : 'bg-black/70 text-white hover:bg-purple-600'}`}
                    >
                      {isAdded(game) ? '✓ Added' : '+ Add'}
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-white truncate">{game.name}</p>
                    <p className="text-xs text-yellow-400 mt-1">⭐ {game.rating}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* My Deck Tab */}
      {activeTab === 'mydeck' && (
        <SolitaireBoard myList={myList} setMyList={setMyList} />
      )}

    </div>
  )
}

export default App