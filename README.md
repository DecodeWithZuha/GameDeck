# GameDeck 🎮

A personal game curation and discovery platform where you can browse games, build your collection, rank your Top 10, get recommendations, and play mini-games using your own game covers.

Live demo: https://gamedeck-bice.vercel.app/


## Features

### Browse and Curate
Search and filter games by genre using the RAWG API. Add games to your personal deck with one click.

### Top 10 Picks
Drag and drop games from your deck into your ranked Top 10. Rearrange anytime. Share your list with a single link.

### Smart Recommendations
Genre-based cosine similarity runs entirely in the browser to suggest games based on your deck. No backend needed.

### Puzzle Game
Pick any game from your deck and solve a sliding tile puzzle made from its cover image. Four difficulty levels: Easy (3x3), Medium (5x5), Hard (7x7), Extreme (9x9).

### Memory Match
Flip cards to find matching game cover pairs from your collection. Three difficulty levels with a timer and move counter.

### Bubble Shooter
A full bubble shooter game themed around your game collection.

### Share Everything
Share your Top 10, puzzle results, and memory scores. Each share generates a unique link stored in Firestore.

### Google Auth and Cloud Saves
Sign in with Google. Your deck persists across sessions via Firestore.


## Tech Stack


React + Vite, 
Tailwind CSS, 
Firebase (Authentication + Firestore), 
RAWG.io API, 
@dnd-kit (drag and drop), 
Vercel (hosting).

## How Recommendations Work

The recommendation engine builds a genre vocabulary from the user's deck and candidate games. Each game is represented as a binary genre vector. The user profile is the average of all deck vectors. Cosine similarity is then computed between the user profile and each candidate to rank recommendations by match percentage. Same logic as KNN with cosine distance, implemented in plain JavaScript with no external dependencies.
