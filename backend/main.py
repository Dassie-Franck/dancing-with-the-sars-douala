"""API de metadonnees optionnelle.
Lancer :  uvicorn main:app --reload --port 8000   (depuis le dossier backend/)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Dancing with the SARs - Douala")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "zone": "Douala / estuaire du Wouri"}