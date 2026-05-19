# Flashcards Monorepo

Applicazione full-stack per il caricamento di documenti PDF, la generazione automatizzata di flashcard tramite AI e la pratica in modalità quiz. 

Questo progetto unisce un'interfaccia utente moderna e reattiva con un'architettura backend robusta a microservizi, che orchestra la conversione dei documenti, la segmentazione semantica e l'elaborazione tramite LLM.

## 🏗️ Struttura del Progetto

Il progetto è diviso in due macro-aree principali:

- `/frontend` → Applicazione client basata su **Angular 21** (Standalone).
- `/backend` → API a microservizi basata su **Python / FastAPI** e orchestrata tramite **Docker**.

## 💻 Tech Stack

**Frontend:**
- Angular 21 (Standalone Components + SSR)
- Firebase Authentication (Email/Password & Google)
- Bootstrap + Bootstrap Icons
- Vitest

**Backend:**
- Python 3.10 + FastAPI + Uvicorn
- PostgreSQL (asyncpg) + SQLAlchemy
- Nginx (Reverse proxy e Rate Limiting)
- Integrazioni AI: MarkItDown (Microsoft), API Unstructured, LLM Provider (OpenAI-compatible)

---

## 🚀 Guida all'Avvio (Local Development)

Per far funzionare l'intero applicativo in locale, è necessario configurare ed avviare separatamente sia il backend che il frontend, partendo dai prerequisiti condivisi.

### 1. Prerequisiti Globali (Firebase)
Entrambe le applicazioni richiedono un progetto Firebase configurato per l'autenticazione:
- **Per il Backend:** Scarica il file `serviceAccountKey.json` dalla console di Firebase e inseriscilo nella root del backend (assicurati che sia nel `.gitignore`).
- **Per il Frontend:** Ottieni le credenziali client (API Key, Auth Domain, ecc.) per configurare l'ambiente Angular.

### 2. Avvio del Backend (API)
Il backend è interamente containerizzato. Le API saranno esposte su `http://localhost:9090`.

1. Naviga nella cartella del backend: `cd backend`
2. Crea un file `.env` basato sulle necessità del progetto (Endpoint microservizi, Chiavi API AI, Credenziali DB). 
3. Avvia i container:
   ```bash
   docker compose up --build
