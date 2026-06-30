"""
GameDeck Recommendation API
Uses K-Nearest Neighbors (scikit-learn) on genre vectors to recommend
games similar to a user's deck, with a match percentage score.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from sklearn.neighbors import NearestNeighbors

app = FastAPI(title="GameDeck Recommendation API")

# Allow requests from your frontend (Vercel) and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your Vercel domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Data models ----------

class GameIn(BaseModel):
    id: int
    name: str
    background_image: Optional[str] = None
    rating: Optional[float] = 0
    genres: List[str] = []  # list of genre names, e.g. ["Action", "RPG"]


class RecommendRequest(BaseModel):
    user_deck: List[GameIn]     # games the user already added
    candidate_pool: List[GameIn]  # games fetched from RAWG to pick recommendations from
    top_n: int = 6


class Recommendation(BaseModel):
    id: int
    name: str
    background_image: Optional[str]
    rating: Optional[float]
    match_percent: float


# ---------- Core ML logic ----------

def build_genre_vocab(all_games: List[GameIn]) -> List[str]:
    genres = set()
    for g in all_games:
        for genre in g.genres:
            genres.add(genre)
    return sorted(genres)


def vectorize(game: GameIn, vocab: List[str]) -> np.ndarray:
    vec = np.zeros(len(vocab))
    for genre in game.genres:
        if genre in vocab:
            vec[vocab.index(genre)] = 1.0
    return vec


@app.get("/")
def root():
    return {"status": "GameDeck Recommendation API is running"}


@app.post("/recommend", response_model=List[Recommendation])
def recommend(req: RecommendRequest):
    if not req.user_deck:
        raise HTTPException(status_code=400, detail="user_deck is empty")
    if not req.candidate_pool:
        raise HTTPException(status_code=400, detail="candidate_pool is empty")

    # Exclude games already in the deck from candidates
    deck_ids = {g.id for g in req.user_deck}
    candidates = [g for g in req.candidate_pool if g.id not in deck_ids]
    if not candidates:
        return []

    # Build a shared genre vocabulary across deck + candidates
    vocab = build_genre_vocab(req.user_deck + candidates)
    if not vocab:
        return []

    # User profile vector = average of all genre vectors in their deck
    deck_vectors = np.array([vectorize(g, vocab) for g in req.user_deck])
    user_profile = deck_vectors.mean(axis=0).reshape(1, -1)

    # Candidate vectors
    candidate_vectors = np.array([vectorize(g, vocab) for g in candidates])

    # K-Nearest Neighbors using cosine distance (good for genre similarity)
    k = min(req.top_n, len(candidates))
    knn = NearestNeighbors(n_neighbors=k, metric="cosine")
    knn.fit(candidate_vectors)
    distances, indices = knn.kneighbors(user_profile)

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        # cosine distance -> similarity -> percentage
        similarity = max(0.0, 1.0 - dist)
        match_percent = round(similarity * 100, 1)
        game = candidates[idx]
        results.append(
            Recommendation(
                id=game.id,
                name=game.name,
                background_image=game.background_image,
                rating=game.rating,
                match_percent=match_percent,
            )
        )

    # Sort by best match first
    results.sort(key=lambda r: r.match_percent, reverse=True)
    return results
