// Pure JS genre-based similarity recommendations
// Uses cosine similarity on genre vectors (same logic as KNN with cosine distance)
// No external backend needed — runs entirely in the browser

const buildVocab = (games) => {
  const genres = new Set()
  games.forEach(g => (g.genres || []).forEach(genre => genres.add(genre.name || genre)))
  return [...genres].sort()
}

const vectorize = (game, vocab) => {
  const vec = new Array(vocab.length).fill(0)
  ;(game.genres || []).forEach(genre => {
    const name = genre.name || genre
    const idx = vocab.indexOf(name)
    if (idx !== -1) vec[idx] = 1
  })
  return vec
}

const cosineSim = (a, b) => {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

export const getRecommendations = (userDeck, candidatePool, topN = 6) => {
  if (!userDeck.length || !candidatePool.length) return []

  const deckIds = new Set(userDeck.map(g => g.id))
  const candidates = candidatePool.filter(g => !deckIds.has(g.id))
  if (!candidates.length) return []

  const vocab = buildVocab([...userDeck, ...candidates])
  if (!vocab.length) return []

  // User profile = average of all deck game vectors
  const deckVecs = userDeck.map(g => vectorize(g, vocab))
  const profile = vocab.map((_, i) => {
    const sum = deckVecs.reduce((acc, v) => acc + v[i], 0)
    return sum / deckVecs.length
  })

  const scored = candidates.map(game => {
    const vec = vectorize(game, vocab)
    const sim = cosineSim(profile, vec)
    return { ...game, match_percent: Math.round(sim * 100 * 10) / 10 }
  })

  return scored
    .filter(g => g.match_percent > 0)
    .sort((a, b) => b.match_percent - a.match_percent)
    .slice(0, topN)
}
