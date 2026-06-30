const RECOMMEND_API_URL = import.meta.env.VITE_RECOMMEND_API_URL

// Sends the user's deck + a candidate pool to the Python KNN backend
// and returns recommended games with a match_percent score.
export const fetchRecommendations = async (userDeck, candidatePool, topN = 6) => {
  if (!RECOMMEND_API_URL) {
    console.warn('VITE_RECOMMEND_API_URL is not set; skipping recommendations')
    return []
  }
  if (!userDeck.length || !candidatePool.length) return []

  const toPayload = (g) => ({
    id: g.id,
    name: g.name,
    background_image: g.background_image,
    rating: g.rating || 0,
    genres: (g.genres || []).map(genre => genre.name),
  })

  try {
    const res = await fetch(`${RECOMMEND_API_URL}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_deck: userDeck.map(toPayload),
        candidate_pool: candidatePool.map(toPayload),
        top_n: topN,
      }),
    })
    if (!res.ok) throw new Error(`Recommendation API error: ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('Failed to fetch recommendations:', err)
    return []
  }
}
