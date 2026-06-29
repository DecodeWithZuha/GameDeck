import { useState, useEffect } from 'react'
import { fetchGames, GENRES } from './api'
import SolitaireBoard from './SolitaireBoard'
import ShareView from './ShareView'

function App() {
  const [games, setGames] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('')
  const [loading, setLoading] = useState(true)
  const [myList, setMyList] = useState([])
  const [activeTab, setActiveTab] = useState('browse')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // Check if share link
  const params = new URLSearchParams(window.location.search)
  const isShareView = params.get('share') === 'true'

  useEffect(() => {
    setLoading(true)
    fetchGames(selectedGenre, search).then(data => {
      setGames(data)
      setLoading(false)
    })
  }, [selectedGenre, search])

  const toggleGame = (game) => {
    setMyList(prev =>
      prev.find(g => g.id === game.id)
        ? prev.filter(g => g.id !== game.id)
        : [...prev, game]
    )
  }

  const isAdded = (game) => myList.find(g => g.id === game.id)

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setSelectedGenre('')
  }

  // Share view
  if (isShareView) return <ShareView />

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="p-5 border-b border-gray-800 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-purple-400">🎮 GameDeck</h1>
        <div className="bg-purple-900/50 border border-purple-700 px-4 py-2 rounded-full text-sm font-medium text-purple-300">
          🃏 My Deck: {myList.length} games
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 pt-5">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-5 py-2 rounded-full text-sm font-bold transition-all
            ${activeTab === 'browse'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          🕹️ Browse Games
        </button>
        <button
          onClick={() => setActiveTab('mydeck')}
          className={`px-5 py-2 rounded-full text-sm font-bold transition-all
            ${activeTab === 'mydeck'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          🃏 My Deck {myList.length > 0 && `(${myList.length})`}
        </button>
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <>
          {/* Search + Genre Filter */}
          <div className="px-6 pt-5 pb-2">

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search games... e.g. GTA, Minecraft"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all"
              />
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-full text-sm font-bold transition-all"
              >
                🔍 Search
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setSearchInput('') }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-full text-sm transition-all"
                >
                  ✕ Clear
                </button>
              )}
            </form>

            {/* Genre Pills */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { setSelectedGenre(''); setSearch(''); setSearchInput('') }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all
                  ${selectedGenre === '' && !search
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                All
              </button>
              {GENRES.map(genre => (
                <button
                  key={genre.slug}
                  onClick={() => { setSelectedGenre(genre.slug); setSearch(''); setSearchInput('') }}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all
                    ${selectedGenre === genre.slug
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>

          {/* Search result label */}
          {search && (
            <p className="px-6 py-2 text-gray-400 text-sm">
              Results for: <span className="text-purple-400 font-semibold">"{search}"</span>
            </p>
          )}

          {/* Games Grid */}
          {loading ? (
            <div className="text-center text-gray-500 mt-24">
              <p className="text-4xl mb-3">🎮</p>
              <p className="text-lg">Loading games...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center text-gray-500 mt-24">
              <p className="text-4xl mb-3">😢</p>
              <p className="text-lg">No games found for "{search}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-6">
              {games.map(game => (
                <div
                  key={game.id}
                  className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-purple-500 transition-all group"
                >
                  <div className="relative">
                    <img
                      src={game.background_image}
                      alt={game.name}
                      className="w-full h-40 object-cover group-hover:scale-105 transition-all duration-300"
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
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {game.genres?.map(g => g.name).join(', ')}
                    </p>
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