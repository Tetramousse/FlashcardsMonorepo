# Flashcards Monorepo

Applicazione full-stack per il caricamento di documenti PDF, la generazione automatizzata di flashcard tramite AI e la pratica in modalità quiz.

Questo progetto unisce un'interfaccia utente moderna e reattiva con un'architettura backend robusta a microservizi. [cite_start]Il backend orchestra una pipeline di conversione documenti tramite MarkItDown, segmentazione semantica tramite API Unstructured ed elaborazione per la generazione tramite LLM.

## Struttura del Progetto

Il progetto è diviso in due macro-aree principali:

- `/frontend` → Applicazione client basata su **Angular 21** (Standalone).
- [cite_start]`/backend` → API a microservizi basata su **Python / FastAPI** e orchestrata tramite **Docker**.

## Tech Stack

**Frontend:**
- Angular 21 (Standalone Components + SSR)
- Firebase Authentication (Email/Password & Google)
- Bootstrap + Bootstrap Icons
- Vitest

**Backend:**
- [cite_start]Python 3.10 + FastAPI + Uvicorn (ASGI server) 
- [cite_start]PostgreSQL 15 (asyncpg) + SQLAlchemy 
- [cite_start]Nginx (Reverse proxy, Rate Limiting, connessioni concorrenti) 
- [cite_start]Librerie core: pydantic, httpx, python-multipart, firebase-admin 
- [cite_start]Integrazioni: MarkItDown (Microsoft), Unstructured API, LLM Provider (OpenAI-compatible, es. Groq) 

---

## 🔌 API Endpoints (Backend)

[cite_start]Tutti gli endpoint richiedono autenticazione Firebase JWT nell'header `Authorization: Bearer <token>`. [cite_start]Ogni file è associato allo `user_id` Firebase e gli utenti possono operare solo sui propri file.

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/v1/files` | [cite_start]Lista i file dell'utente autenticato con preview del primo chunk (ritorna array di oggetti con id, name e preview). |
| `POST` | `/api/v1/files` | [cite_start]Upload documento ed esecuzione pipeline completa (conversione, chunking, persistenza). |
| `DELETE` | `/api/v1/files/{file_id}` | [cite_start]Elimina file e relativi chunk. |
| `POST` | `/api/v1/files/{file_id}/flashcards` | [cite_start]Genera flashcard AI (limite default 10) da chunk random del file specificato. |

---

## Rete, Rate Limit e Gateway (Nginx)

[cite_start]Il traffico API passa da Nginx, che applica le seguenti policy globali per IP (`location /`):

- [cite_start]**Rate limit**: 10 richieste/secondo (con burst fino a 20 richieste extra senza ritardo).
- [cite_start]**Connessioni concorrenti**: Massimo 10 connessioni per IP.
- [cite_start]**Comportamento Limiti**: Al superamento, Nginx risponde con `503 Service Temporarily Unavailable`.
- [cite_start]**Compressione**: Gzip attivo per JSON, testo puro, JS e CSS (lunghezza minima 1000).
- **Timeout**: `client_header_timeout` e `client_body_timeout` a 12s; `keepalive_timeout` a 15s; [cite_start]`send_timeout` a 10s; proxy connect a 30s; proxy send/read a 120s.

---

## 🚀 Guida all'Avvio (Local Development)

### 1. Autenticazione Firebase (Globale)
Entrambe le applicazioni richiedono un progetto Firebase configurato:
- [cite_start]**Backend**: Scarica `serviceAccountKey.json` dalla Console Firebase (Impostazioni progetto → Account di servizio → Genera nuova chiave privata) e posizionalo nella root del backend (accanto a `main.py`).
- **Frontend**: Ottieni le credenziali client per configurare l'ambiente Angular.

### 2. Configurazione e Avvio Backend (API)
[cite_start]L'API è esposta su `http://localhost:9090`.

1. Naviga nella cartella: `cd backend`
2. [cite_start]Crea il file `.env` compilando i seguenti parametri:
   ```env
   # Endpoint microservizi
   MARKITDOWN_URL="http://markitdown:8490/process_file"
   UNSTRUCTURED_URL="http://unstructured:8000/general/v0/general"
   FLASHCARD_GEN_URL="http://flashcard-gen:8000/generate"

   # Provider LLM (OpenAI-compatible)
   AI_API_KEY="gsk_..."
   AI_MODEL="llama-3.1-70b-versatile"
   AI_BASE_URL="[https://api.groq.com/openai/v1](https://api.groq.com/openai/v1)"

   # Database
   DATABASE_URL="postgresql+asyncpg://postgres:postgres@db/files_db"
   POSTGRES_USER="postgres"
   POSTGRES_PASSWORD="postgres"
   POSTGRES_DB="files_db"
