import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function GameCard({ game }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: game.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative w-32 h-44 rounded-xl overflow-hidden border-2 border-gray-700 hover:border-purple-500 cursor-grab active:cursor-grabbing shadow-xl transition-all hover:scale-105"
    >
      <img
        src={game.background_image}
        alt={game.name}
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1">
        <p className="text-white text-xs font-bold truncate">{game.name}</p>
        <p className="text-yellow-400 text-xs">⭐ {game.rating}</p>
      </div>
    </div>
  )
}

export default function SolitaireBoard({ myList, setMyList }) {
  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setMyList((items) => {
        const oldIndex = items.findIndex((g) => g.id === active.id)
        const newIndex = items.findIndex((g) => g.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  // Share function
  const handleShare = async () => {
    const text = `🎮 My GameDeck Picks:\n\n` +
      myList.map((g, i) => `${i + 1}. ${g.name} ⭐${g.rating}`).join('\n') +
      `\n\nMade with GameDeck 🕹️`

    if (navigator.share) {
      await navigator.share({ title: 'My GameDeck', text })
    } else {
      await navigator.clipboard.writeText(text)
      alert('List copied! Paste anywhere to share 🎮')
    }
  }

  // Split into columns like solitaire (7 columns)
  const columns = Array.from({ length: 7 }, () => [])
  myList.forEach((game, i) => {
    columns[i % 7].push(game)
  })

  if (myList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-4xl mb-4">🃏</p>
        <p className="text-lg">Add games to build your deck!</p>
        <p className="text-sm mt-2">Browse games above and click + Add</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-purple-400">
          🃏 My Deck ({myList.length} games)
        </h2>
        <button
          onClick={handleShare}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full text-sm font-bold transition-all"
        >
          🔗 Share My Picks
        </button>
      </div>

      {/* Solitaire Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={myList.map((g) => g.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((col, colIndex) => (
              <div key={colIndex} className="flex flex-col gap-2 min-w-[130px]">
                {col.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}