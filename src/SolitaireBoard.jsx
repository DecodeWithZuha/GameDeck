import { useState } from 'react'
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

function GameCard({ game, inTop10 = false }) {
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
      {...listeners}
      className={`relative group cursor-grab active:cursor-grabbing rounded-xl overflow-hidden border-2 
        ${inTop10
          ? 'border-purple-500 w-full'
          : 'border-gray-700 hover:border-purple-400 w-full'}
        shadow-xl transition-all hover:scale-105 hover:z-50`}
    >
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

function DroppableSlot({ number, id }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 border-dashed h-40 sm:h-56 flex flex-col 
        items-center justify-center transition-all
        ${isOver
          ? 'border-purple-400 bg-purple-900/20'
          : 'border-gray-600 hover:border-gray-500'}`}
    >
      <p className="text-xl sm:text-3xl font-black text-gray-700">#{number}</p>
      <p className="text-xs text-gray-600 mt-1 hidden sm:block">Drop here</p>
    </div>
  )
}

export default function SolitaireBoard({ myList, setMyList, user }) {
  const [top10, setTop10] = useState(Array(10).fill(null))
  const [activeGame, setActiveGame] = useState(null)
  const [copied, setCopied] = useState(false)

  // Both PointerSensor (desktop) and TouchSensor (mobile) support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 }
    })
  )

  const deckGames = myList.filter(g => !top10.find(t => t?.id === g.id))

  // Mobile: 3 cols, Desktop: 7 cols
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const COLS = isMobile ? 3 : 7
  const columns = Array.from({ length: COLS }, () => [])
  deckGames.forEach((game, i) => {
    columns[i % COLS].push(game)
  })

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
      if (newTop10[slotIndex] !== null && prevSlot !== -1) {
        newTop10[prevSlot] = newTop10[slotIndex]
      }
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
        return
      }

      if (activeSlot === -1 && overSlot !== -1) {
        const newTop10 = [...top10]
        newTop10[overSlot] = game
        setTop10(newTop10)
        return
      }

      if (activeSlot === -1 && overSlot === -1) {
        const emptySlot = top10.findIndex(t => t === null)
        if (emptySlot !== -1) {
          const newTop10 = [...top10]
          newTop10[emptySlot] = game
          setTop10(newTop10)
        }
        return
      }
    }
  }

  const handleShare = async () => {
    const filled = top10.filter(Boolean)
    if (filled.length === 0) {
      alert('Pehle Top 10 mein kuch games add karo!')
      return
    }
    const minimal = filled.map(g => ({
      id: g.id,
      name: g.name,
      background_image: g.background_image,
      rating: g.rating,
    }))
    const data = encodeURIComponent(JSON.stringify(minimal))
    const userName = encodeURIComponent(user?.displayName || 'A Gamer')
    const link = `${window.location.origin}${window.location.pathname}?share=true&picks=${data}&user=${userName}`

    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = link
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  const top10Ids = top10.filter(Boolean).map(g => `card-${g.id}`)
  const deckIds = deckGames.map(g => `card-${g.id}`)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-3 sm:p-6">

        {/* TOP 10 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-yellow-400">🏆 My Top 10</h2>
            <button
              onClick={handleShare}
              className={`px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all
                ${copied
                  ? 'bg-green-500 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
            >
              {copied ? '✅ Copied!' : '🔗 Share'}
            </button>
          </div>

          {/* Mobile: 5 cols per row x 2 rows, Desktop: 10 in one row */}
          <SortableContext items={top10Ids} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-5 sm:grid-cols-5 lg:grid-cols-10 gap-2 sm:gap-3">
              {top10.map((game, index) => (
                <div key={index} className="relative">
                  <div className={`absolute -top-2 -left-2 z-10 w-5 h-5 sm:w-7 sm:h-7 rounded-full 
                    flex items-center justify-center text-xs font-black shadow-lg
                    ${index === 0 ? 'bg-yellow-400 text-black' :
                      index === 1 ? 'bg-gray-300 text-black' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-purple-700 text-white'}`}>
                    {index + 1}
                  </div>
                  {game
                    ? <GameCard game={game} inTop10={true} />
                    : <DroppableSlot number={index + 1} id={`slot-${index}`} />
                  }
                </div>
              ))}
            </div>
          </SortableContext>
        </div>

        <div className="border-t border-gray-700 mb-6" />

        {/* MY DECK */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-purple-400 mb-4">
            🃏 My Deck ({deckGames.length} games)
          </h2>
          <p className="text-xs text-gray-500 mb-3 sm:hidden">
            📱 Press & hold a card to drag it
          </p>

          {deckGames.length === 0 ? (
            <div className="text-center text-gray-600 py-10">
              <p className="text-4xl mb-2">🎉</p>
              <p>Sab games Top 10 mein hain!</p>
            </div>
          ) : (
            <SortableContext items={deckIds} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2 sm:gap-3">
                {deckGames.map((game) => (
                  <GameCard key={game.id} game={game} inTop10={false} />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeGame && (
          <div className="rounded-xl overflow-hidden border-2 border-purple-500 w-24 sm:w-32 shadow-2xl rotate-3 opacity-90">
            <img
              src={activeGame.background_image}
              alt={activeGame.name}
              className="w-full h-28 sm:h-36 object-cover"
            />
            <div className="bg-gray-900 p-2">
              <p className="text-white text-xs font-bold truncate">{activeGame.name}</p>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
