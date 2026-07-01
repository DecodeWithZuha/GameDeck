import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { fetchGames, GENRES } from './api'
import SolitaireBoard from './SolitaireBoard'
import ShareView from './ShareView'
import PuzzleGame from './PuzzleGame'
import PuzzleResultView from './PuzzleResultView'
import MemoryGame from './MemoryGame'
import BubbleShooter from './BubbleShooter'
import Auth from './Auth'

function App() {
  const [games, setGames] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('')
  const [loading, setLoading] = useState(true)
  const [myList, setMyList] = useState([])
  const [activeTab, setActiveTab] = useState('browse')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [user, setUser] = useState(null)
  const [dataLoading, setDataLoading] = useState(false)

  const params = new URLSearchParams(window.location.search)
  // Route to share/result views based on URL params
  const isShareView = params.has('share')
  const isPuzzleResult = params.has('puzzleResult')
  const isMemoryResult = params.has('memoryResult')
  const isBubbleResult = params.has('bubbleResult')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        setDataLoading(true)
        const ref = doc(db, 'users', firebaseUser.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const data = snap.data()
          if (data.myList) setMyList(data.myList)
        }
        setDataLoading(false)
      } else {
        setMyList([])
      }
    })
    return () => unsub()
  }, [])

  // Persist user deck to Firestore on every change
  useEffect(() => {
    if (!user || dataLoading) return
    const ref = doc(db, 'users', user.uid)
    setDoc(ref, { myList }, { merge: true })
  }, [myList, user])

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

  // Route to standalone share/result pages
  if (isShareView) return <ShareView />
  if (isPuzzleResult) return <PuzzleResultView />
  if (isMemoryResult) return <MemoryResultView />
  if (isBubbleResult) return <BubbleResultView />

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="p-5 border-b border-gray-800 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-purple-400">🎮 GameDeck</h1>
        <div className="flex items-center gap-4">
          {user && (
            <div className="bg-purple-900/50 border border-purple-700 px-4 py-2 rounded-full text-sm font-medium text-purple-300">
              🃏 {myList.length} games
            </div>
          )}
          <Auth user={user} />
        </div>
      </div>

      {/* Not logged in */}
      {!user ? (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6">
          <p className="text-6xl mb-6">🎮</p>
          <h2 className="text-3xl font-bold text-white mb-3">Welcome to GameDeck</h2>
          <p className="text-gray-400 text-lg mb-8 max-w-md">
            Build your personal game collection, create your Top 10, and share with friends!
          </p>
          <Auth user={user} />
        </div>
      ) : (
        <>
          {/* Tab navigation */}
          <div className="flex gap-2 px-4 sm:px-6 pt-5 flex-wrap">
            <button onClick={() => setActiveTab('browse')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all
                ${activeTab === 'browse' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              🕹️ Browse
            </button>
            <button onClick={() => setActiveTab('mydeck')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all
                ${activeTab === 'mydeck' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              🃏 My Deck {myList.length > 0 && `(${myList.length})`}
            </button>
            <button onClick={() => setActiveTab('puzzle')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all
                ${activeTab === 'puzzle' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              🧩 Puzzle
            </button>
            <button onClick={() => setActiveTab('memory')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all
                ${activeTab === 'memory' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              🃏 Memory
            </button>
            <button onClick={() => setActiveTab('bubble')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all
                ${activeTab === 'bubble' ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              🫧 Bubble
            </button>
          </div>

          {/* Browse Games tab */}
          {activeTab === 'browse' && (
            <>
              <div className="px-6 pt-5 pb-2">
                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                  <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                    placeholder="Search games... e.g. GTA, Minecraft"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all" />
                  <button type="submit"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-full text-sm font-bold transition-all">
                    🔍 Search
                  </button>
                  {search && (
                    <button type="button" onClick={() => { setSearch(''); setSearchInput('') }}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-full text-sm transition-all">
                      ✕
                    </button>
                  )}
                </form>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => { setSelectedGenre(''); setSearch(''); setSearchInput('') }}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all
                      ${selectedGenre === '' && !search ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                    All
                  </button>
                  {GENRES.map(genre => (
                    <button key={genre.slug}
                      onClick={() => { setSelectedGenre(genre.slug); setSearch(''); setSearchInput('') }}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all
                        ${selectedGenre === genre.slug ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                      {genre.name}
                    </button>
                  ))}
                </div>
              </div>
              {search && (
                <p className="px-6 py-2 text-gray-400 text-sm">
                  Results for: <span className="text-purple-400 font-semibold">"{search}"</span>
                </p>
              )}
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
                    <div key={game.id}
                      className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-purple-500 transition-all group">
                      <div className="relative">
                        <img src={game.background_image} alt={game.name}
                          className="w-full h-40 object-cover group-hover:scale-105 transition-all duration-300" />
                        <button onClick={() => toggleGame(game)}
                          className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-bold transition-all
                            ${isAdded(game) ? 'bg-green-500 text-white' : 'bg-black/70 text-white hover:bg-purple-600'}`}>
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

          {activeTab === 'mydeck' && (
            <SolitaireBoard myList={myList} setMyList={setMyList} user={user} />
          )}

          {activeTab === 'puzzle' && (
            <PuzzleGame myList={myList} user={user} />
          )}

          {activeTab === 'memory' && (
            <MemoryGame myList={myList} user={user} />
          )}

          {activeTab === 'bubble' && (
            <BubbleShooter myList={myList} user={user} />
          )}
        </>
      )}
    </div>
  )
}

export default App
