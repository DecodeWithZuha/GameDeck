const API_KEY = import.meta.env.VITE_RAWG_API_KEY

export const fetchGames = async (genre = '', search = '') => {
  const genreFilter = genre ? `&genres=${genre}` : ''
  const searchFilter = search ? `&search=${encodeURIComponent(search)}` : ''
  const res = await fetch(
    `https://api.rawg.io/api/games?key=${API_KEY}&page_size=20&ordering=-rating${genreFilter}${searchFilter}`
  )
  const data = await res.json()
  return data.results
}

export const GENRES = [
  { name: 'Action', slug: 'action' },
  { name: 'RPG', slug: 'role-playing-games-rpg' },
  { name: 'Strategy', slug: 'strategy' },
  { name: 'Shooter', slug: 'shooter' },
  { name: 'Puzzle', slug: 'puzzle' },
  { name: 'Racing', slug: 'racing' },
  { name: 'Sports', slug: 'sports' },
  { name: 'Adventure', slug: 'adventure' },
]