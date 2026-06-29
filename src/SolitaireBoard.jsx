import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Single draggable card
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
          : 'border-gray-700 hover:border-purple-400 w-32'} 
        shadow-xl transition-all hover:scale-105 hover:z-50`}
    >
      <img
        src={game.background_image}
        alt={game.name}
        className={`w-full object-cover ${inTop10 ? 'h-44' : 'h-40'}`}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 
        opacity-0 group-hover:opacity-100 transition-all">
        <p className="text-white text-xs font-bold truncate">{game.name}</p>
        <p className="text-yellow-400 text-xs">⭐ {game.rating}</p>
      </div>
      {/* Always visible name at bottom */}
      <div className="bg-gray-900 p-2">
        <p className="text-white text-xs font-bold truncate">{game.name}</p>
        <p className="text-yellow-400 text-xs">⭐ {game.rating}</p>
      </div>
    </div>
  )
}

// Empty slot for Top 10
function EmptySlot({ number }) {
  return (
    <div className="relative rounded-xl border-2 border-dashed border-gray-600 
      w-full h-56 flex flex-col items-center justify-center text-gray-600
      hover:border-purple-500 transition-all">
      <p className="text-3xl font-black text-gray-700">#{number}</p>
      <p className="text-xs mt-1">Drop here</p>
    </div>
  )
}

export default function SolitaireBoard({ myList, setMyList }) {
  const [top10, setTop10] = useState(Array(10).fill(null))
  const [activeGame, setActiveGame] = useState(null)
  const [shareLink, setShareLink] = useState('')
  const [copied, setCopied] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 5 }
  }))

  // Games not in top 10
  const deckGames = myList.filter(
    g => !top10.find(t => t?.id === g.id)
  )

  // Split deck into columns (solitaire style)
  const columns = Array.from({ length: 7 }, () => [])
  deckGames.forEach((game, i) => {
    columns[i % 7].push(game)
  })

  const handleDragStart = (event) => {
    const id = event.active.id
    const gameId = parseInt(id.replace('card-', ''))
    const found = myList.find(g => g.id === gameId)
    setActiveGame(found || null)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveGame(null)

    if (!over) return

    const activeId = active.id
    const overId = over.id
    const gameId = parseInt(activeId.replace('card-', ''))
    const game = myList.find(g => g.id === gameId)

    // Drop on top10 slot
    if (overId.toString().startsWith('slot-')) {
      const slotIndex = parseInt(overId.toString().replace('slot-', ''))
      const newTop10 = [...top10]

      // Remove from previous slot if exists
      const prevSlot = newTop10.findIndex(t => t?.id === gameId)
      if (prevSlot !== -1) newTop10[prevSlot] = null

      // If slot occupied, swap
      if (newTop10[slotIndex]) {
        if (prevSlot !== -1) {
          newTop10[prevSlot] = newTop10[slotIndex]
        }
      }
      newTop10[slotIndex] = game
      setTop10(newTop10)
      return
    }

    // Reorder within top10
    if (activeId.startsWith('card-') && overId.startsWith('card-')) {
      const overGameId = parseInt(overId.replace('card-', ''))
      const activeSlot = top10.findIndex(t => t?.id === gameId)
      const overSlot = top10.findIndex(t => t?.id === overGameId)

      if (activeSlot !== -1 && overSlot !== -1) {
        const newTop10 = [...top10]
        ;[newTop10[activeSlot], newTop10[overSlot]] = [newTop10[overSlot], newTop10[activeSlot]]
        setTop10(newTop10)
        return
      }
    }
  }

  // Generate share link
  const handleShare = () => {
    const filled = top10.filter(Boolean)
    if (filled.length === 0) {
      alert('Add at least one game to Top 10 first!')
      return
    }
    const data = encodeURIComponent(JSON.stringify(filled))
    const link = `${window.location.origin}?share=true&picks=${data}`
    setShareLink(link)
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  const top10Ids = top10
    .filter(Boolean)
    .map(g => `card-${g.id}`)

  const deckIds = deckGames.map(g => `card-${g.id}`)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-6">

        {/* TOP 10 SECTION */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-yellow-400">
              🏆 My Top 10
            </h2>
            <button
              onClick={handleShare}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all
                ${copied
                  ? 'bg-green-500 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
            >
              {copied ? '✅ Link Copied!' : '🔗 Share Top 10'}
            </button>
          </div>

          {/* 10 slots horizontal */}
          <SortableContext items={top10Ids} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-5 lg:grid-cols-10 gap-3">
              {top10.map((game, index) => (
                <div key={index} className="relative">
                  {/* Rank number */}
                  <div className={`absolute -top-2 -left-2 z-10 w-7 h-7 rounded-full 
                    flex items-center justify-center text-xs font-black shadow-lg
                    ${index === 0 ? 'bg-yellow-400 text-black' :
                      index === 1 ? 'bg-gray-300 text-black' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-purple-700 text-white'}`}>
                    {index + 1}
                  </div>

                  {game ? (
                    <GameCard game={game} inTop10={true} />
                  ) : (
                    <DroppableSlot number={index + 1} id={`slot-${index}`} />
                  )}
                </div>
              ))}
            </div>
          </SortableContext>
        </div>

        {/* DIVIDER */}
        <div className="border-t border-gray-700 mb-6" />

        {/* MY DECK SECTION */}
        <div>
          <h2 className="text-xl font-bold text-purple-400 mb-4">
            🃏 My Deck ({deckGames.length} games)
          </h2>

          {deckGames.length === 0 ? (
            <div className="text-center text-gray-600 py-10">
              <p className="text-4xl mb-2">🎮</p>
              <p>All games are in your Top 10!</p>
            </div>
          ) : (
            <SortableContext items={deckIds} strategy={rectSortingStrategy}>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {columns.map((col, colIndex) => (
                  <div key={colIndex} className="flex flex-col gap-[-60px] min-w-32.5">
                    {col.map((game, cardIndex) => (
                      <div
                        key={game.id}
                        style={{ marginTop: cardIndex === 0 ? 0 : '-60px' }}
                      >
                        <GameCard game={game} inTop10={false} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeGame ? (
          <div className="rounded-xl overflow-hidden border-2 border-purple-500 w-32 shadow-2xl rotate-3 opacity-90">
            <img
              src={activeGame.background_image}
              alt={activeGame.name}
              className="w-full h-40 object-cover"
            />
            <div className="bg-gray-900 p-2">
              <p className="text-white text-xs font-bold truncate">{activeGame.name}</p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// Droppable empty slot using useDroppable
function DroppableSlot({ number, id }) {
  const { setNodeRef, isOver } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 border-dashed h-56 flex flex-col 
        items-center justify-center transition-all
        ${isOver
          ? 'border-purple-400 bg-purple-900/20'
          : 'border-gray-600 hover:border-gray-500'}`}
    >
      <p className="text-3xl font-black text-gray-700">#{number}</p>
      <p className="text-xs text-gray-600 mt-1">Drop here</p>
    </div>
  )
}