import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { fetchCandidatePool } from './api'
import { getRecommendations } from './recommend'

const isMobileDevice = () =>
  typeof window !== 'undefined' &&
  (window.innerWidth < 640 || 'ontouchstart' in window)

function GameCard({ game, inTop10 = false, selected = false, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `card-${game.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isMobileDevice() ? {} : listeners)}
      onClick={onClick}
      className={`relative group rounded-xl overflow-hidden border-2 w-full
        ${inTop10 ? 'border-purple-500' : selected ? 'border-cyan-400 ring-2 ring-cyan-400' : 'border-gray-700 hover:border-purple-400'}
        shadow-xl transition-all hover:scale-105 hover:z-50
        ${isMobileDevice() ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
    >
      {selected && (
        <div className="absolute inset-0 bg-cyan-400/20 z-10 flex items-center justify-center">
          <span className="text-cyan-300 font-black text-lg">✓</span>
        </div>
      )}
      <img
        src={game.background_image}
        alt={game.name}
        className={`w-full object-cover ${inTop10 ? 'h-28 sm:h-44' : 'h-24 sm:h-36'}`}
      />
      <div className="bg-gray-900 p-1.5 sm:p-2">
        <p className="text-white text-xs font-bold truncate">{game.name}</p>
        <p className="text-yellow-400 text-xs">⭐ {game.rating}</p>
      </div>
    </div>
  )
}

function DroppableSlot({ number, id, onTap, highlight }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      onClick={onTap}
      className={`rounded-xl border-2 border-dashed h-40 sm:h-56 flex flex-col 
        items-center justify-center transition-all
        ${highlight ? 'border-cyan-400 bg-cyan-900/20 cursor-pointer' :
          isOver ? 'border-purple-400 bg-purple-900/20' :
          'border-gray-600 hover:border-gray-500'}`}
    >
      <p className="text-xl sm:text-3xl font-black text-gray-700">#{number}</p>
      <p className="text-xs text-gray-600 mt-1 hidden sm:block">
        {highlight ? 'Tap to place' : 'Drop here'}
      </p>
      {highlight && <p className="text-xs text-cyan-400 mt-1 sm:hidden">Tap to place</p>}
    </div>
  )
}

function RecommendationCard({ rec }) {
  const matchColor =
    rec.match_percent >= 75 ? 'bg-green-600' :
    rec.match_percent >= 50 ? 'bg-yellow-600' : 'bg-gray-600'

  return (
    <div className="rounded-xl overflow-hidden border-2 border-gray-700 hover:border-pink-400 transition-all shadow-xl">
      <div className="relative">
        <img
          src={rec.background_image}
          alt={rec.name}
          className="w-full h-24 sm:h-32 object-cover"
        />
        <div className={`absolute top-1.5 right-1.5 ${matchColor} text-white text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full shadow-lg`}>
          {rec.match_percent}% match
        </div>
      </div>
      <div className="bg-gray-900 p-1.5 sm:p-2">
        <p className="text-white text-xs font-bold truncate">{rec.name}</p>
        <p className="text-yellow-400 text-xs">⭐ {rec.rating}</p>
      </div>
    </div>
  )
}

export default function SolitaireBoard({ myList, setMyList, user }) {
  const [top10, setTop10] = useState(Array(10).fill(null))
  const [activeGame, setActiveGame] = useState(null)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [recommendations, setRecommendations] = useState([])
  const [loadingRecs, setLoadingRecs] = useState(false)
  // Mobile tap-to-rank state
  const [selectedCard, setSelectedCard] = useState(null) // game object

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  )

  const deckGames = myList.filter(g => !top10.find(t => t?.id === g.id))

  // JS-based recommendations — runs in browser, no backend
  useEffect(() => {
    if (myList.length === 0) { setRecommendations([]); return }
    let cancelled = false
    const run = async () => {
      setLoadingRecs(true)
      try {
        const pool = await fetchCandidatePool()
        const recs = getRecommendations(myList, pool, 6)
        if (!cancelled) setRecommendations(recs)
      } catch (err) {
        console.error('Recommendation error:', err)
      } finally {
        if (!cancelled) setLoadingRecs(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [myList])

  // ---------- Mobile tap-to-rank logic ----------
  const handleCardTap = (game) => {
    if (!isMobileDevice()) return
    if (selectedCard?.id === game.id) {
      setSelectedCard(null) // deselect
    } else {
      setSelectedCard(game)
    }
  }

  const handleSlotTap = (slotIndex) => {
    if (!isMobileDevice() || !selectedCard) return
    const newTop10 = [...top10]
    // Remove from previous slot if already in top10
    const prevSlot = newTop10.findIndex(t => t?.id === selectedCard.id)
    if (prevSlot !== -1) newTop10[prevSlot] = null
    // If slot was occupied, swap
    const displaced = newTop10[slotIndex]
    newTop10[slotIndex] = selectedCard
    if (displaced && prevSlot !== -1) newTop10[prevSlot] = displaced
    setTop10(newTop10)
    setSelectedCard(null)
  }

  // ---------- Desktop drag logic ----------
  const handleDragStart = (event) => {
    const gameId = parseInt(event.active.id.toString().replace('card-', ''))
    setActiveGame(myList.find(g => g.id === gameId) || null)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveGame(null)
    if (!over) return
    const activeIdStr = active.id.toString()
    const overIdStr = over.id.toString()
    const gameId = parseInt(activeIdStr.replace('card-', ''))
    const game = myList.find(g => g.id === gameId)
    if (!game) return

    if (overIdStr.startsWith('slot-')) {
      const slotIndex = parseInt(overIdStr.replace('slot-', ''))
      const newTop10 = [...top10]
      const prevSlot = newTop10.findIndex(t => t?.id === gameId)
      if (prevSlot !== -1) newTop10[prevSlot] = null
      if (newTop10[slotIndex] !== null && prevSlot !== -1) newTop10[prevSlot] = newTop10[slotIndex]
      newTop10[slotIndex] = game
      setTop10(newTop10)
      return
    }

    if (overIdStr.startsWith('card-')) {
      const overGameId = parseInt(overIdStr.replace('card-', ''))
      const activeSlot = top10.findIndex(t => t?.id === gameId)
      const overSlot = top10.findIndex(t => t?.id === overGameId)
      if (activeSlot !== -1 && overSlot !== -1) {
        const newTop10 = [...top10]
        ;[newTop10[activeSlot], newTop10[overSlot]] = [newTop10[overSlot], newTop10[activeSlot]]
        setTop10(newTop10)
      } else if (activeSlot === -1 && overSlot !== -1) {
        const newTop10 = [...top10]; newTop10[overSlot] = game; setTop10(newTop10)
      } else if (activeSlot === -1 && overSlot === -1) {
        const emptySlot = top10.findIndex(t => t === null)
        if (emptySlot !== -1) {
          const newTop10 = [...top10]; newTop10[emptySlot] = game; setTop10(newTop10)
        }
      }
    }
  }

  // ---------- Secure share ----------
  const handleShare = async () => {
    const filled = top10.filter(Boolean)
    if (filled.length === 0) { alert('Pehle Top 10 mein kuch games add karo!'); return }
    setSharing(true)
    try {
      const minimal = filled.map(g => ({ id: g.id, name: g.name, background_image: g.background_image, rating: g.rating }))
      const docRef = await addDoc(collection(db, 'shares'), {
        picks: minimal, userName: user?.displayName || 'A Gamer', createdAt: serverTimestamp(),
      })
      const link = `${window.location.origin}${window.location.pathname}?share=${docRef.id}`
      try { await navigator.clipboard.writeText(link) } catch {
        const ta = document.createElement('textarea'); ta.value = link
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      setCopied(true); setTimeout(() => setCopied(false), 3000)
    } catch (err) { console.error(err); alert('Share mein masla, dobara try karo.') }
    finally { setSharing(false) }
  }

  const top10Ids = top10.filter(Boolean).map(g => `card-${g.id}`)
  const deckIds = deckGames.map(g => `card-${g.id}`)
  const mobile = isMobileDevice()

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="p-3 sm:p-6">

        {/* Mobile hint */}
        {mobile && (
          <div className="mb-4 bg-cyan-900/30 border border-cyan-700 rounded-xl px-4 py-2 text-xs text-cyan-300">
            📱 <strong>Deck se game tap karo</strong> (highlight hoga) → phir Top 10 ka khaali slot tap karo — wahan chala jayega!
          </div>
        )}

        {/* TOP 10 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-yellow-400">🏆 My Top 10</h2>
            <button onClick={handleShare} disabled={sharing}
              className={`px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all
                ${copied ? 'bg-green-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}
                ${sharing ? 'opacity-60 cursor-not-allowed' : ''}`}>
              {sharing ? '⏳...' : copied ? '✅ Copied!' : '🔗 Share'}
            </button>
          </div>

          <SortableContext items={top10Ids} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-5 lg:grid-cols-10 gap-2 sm:gap-3">
              {top10.map((game, index) => (
                <div key={index} className="relative">
                  <div className={`absolute -top-2 -left-2 z-10 w-5 h-5 sm:w-7 sm:h-7 rounded-full 
                    flex items-center justify-center text-xs font-black shadow-lg
                    ${index === 0 ? 'bg-yellow-400 text-black' : index === 1 ? 'bg-gray-300 text-black' :
                      index === 2 ? 'bg-amber-600 text-white' : 'bg-purple-700 text-white'}`}>
                    {index + 1}
                  </div>
                  {game
                    ? <GameCard game={game} inTop10 onClick={() => handleCardTap(game)} />
                    : <DroppableSlot number={index + 1} id={`slot-${index}`}
                        highlight={mobile && !!selectedCard}
                        onTap={() => handleSlotTap(index)} />
                  }
                </div>
              ))}
            </div>
          </SortableContext>
        </div>

        {/* RECOMMENDATIONS */}
        {myList.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-pink-400 mb-1">✨ Recommended For You</h2>
            <p className="text-xs text-gray-500 mb-4">
              Based on the genres in your deck
            </p>
            {loadingRecs ? (
              <div className="text-center text-gray-500 py-8">
                <p className="text-2xl mb-2">🤖</p>
                <p className="text-sm">Finding games you'll love...</p>
              </div>
            ) : recommendations.length === 0 ? (
              <p className="text-gray-600 text-sm">No recommendations found — add more games to your deck!</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
                {recommendations.map(rec => <RecommendationCard key={rec.id} rec={rec} />)}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-700 mb-6" />

        {/* MY DECK */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-purple-400 mb-4">
            🃏 My Deck ({deckGames.length} games)
          </h2>
          {mobile && (
            <p className="text-xs text-gray-500 mb-3">
              {selectedCard
                ? `"${selectedCard.name}" selected — Top 10 ka khaali slot tap karo`
                : 'Game tap karo → phir Top 10 mein slot tap karo'}
            </p>
          )}

          {deckGames.length === 0 ? (
            <div className="text-center text-gray-600 py-10">
              <p className="text-4xl mb-2">🎉</p>
              <p>Sab games Top 10 mein hain!</p>
            </div>
          ) : (
            <SortableContext items={deckIds} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2 sm:gap-3">
                {deckGames.map(game => (
                  <GameCard
                    key={game.id}
                    game={game}
                    selected={selectedCard?.id === game.id}
                    onClick={() => handleCardTap(game)}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeGame && (
          <div className="rounded-xl overflow-hidden border-2 border-purple-500 w-24 sm:w-32 shadow-2xl rotate-3 opacity-90">
            <img src={activeGame.background_image} alt={activeGame.name} className="w-full h-28 sm:h-36 object-cover" />
            <div className="bg-gray-900 p-2">
              <p className="text-white text-xs font-bold truncate">{activeGame.name}</p>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
