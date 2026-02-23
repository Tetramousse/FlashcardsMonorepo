# FlashcardsAPI

Backend a microservizi per la generazione automatizzata di flashcard da documenti. Orchestra una pipeline di conversione (MarkItDown), segmentazione semantica (Unstructured) e generazione AI.

## ARCHITETTURA

- **Backend Service ([FastAPI](https://fastapi.tiangolo.com/))**: API gateway e orchestratore
- **[MarkItDown](https://github.com/microsoft/markitdown)**: Conversione documenti → Markdown
- **[Unstructured](https://docs.unstructured.io/open-source/introduction/overview)**: Chunking semantico (`by_title`, 1000 char, 150 overlap)
- **Flashcard Generator**: Microservizio [OpenAI-compatible](https://platform.openai.com/docs/api-reference/introduction) per generazione Q&A
- **[PostgreSQL](https://www.postgresql.org/)**: Persistenza metadati e chunk

## ENDPOINTS

Tutti gli endpoint richiedono autenticazione Firebase JWT nell'header `Authorization: Bearer <token>`.

> Il rate limit è applicato da Nginx a livello globale per IP (`location /`), quindi i valori sono uguali per ogni endpoint.

| Metodo | Endpoint | Descrizione | Rate limit per IP |
|--------|----------|-------------|-------------------|
| `GET` | `/api/v1/files` | Lista i file dell'utente autenticato con preview del primo chunk. Ritorna `200` con array di `{"id": <uuid>, "name": "...", "preview": "..."}`. | `10 req/s`, burst `20`, max `10` connessioni concorrenti |
| `POST` | `/api/v1/files` | Upload documento (`multipart/form-data` con `name` e `file`). Esegue pipeline completa (conversione → chunking → persistenza). Ritorna `201` con `{"id": <file_id>}` e header `Location`. | `10 req/s`, burst `20`, max `10` connessioni concorrenti |
| `DELETE` | `/api/v1/files/{file_id}` | Elimina file e relativi chunk. Ritorna `204` o `404` se non trovato/non autorizzato. | `10 req/s`, burst `20`, max `10` connessioni concorrenti |
| `POST` | `/api/v1/files/{file_id}/flashcards` | Genera flashcard AI da chunk random del file. Body JSON: `{"limit": <int>}` (default `10`). Ritorna lista di `{"question": "...", "answer": "..."}`. | `10 req/s`, burst `20`, max `10` connessioni concorrenti |

**Ownership**: ogni file è associato allo `user_id` Firebase; gli utenti possono operare solo sui propri file.

**Errori servizi esterni**:
- `502` — servizio esterno ha risposto con errore (MarkItDown, Unstructured, Flashcard Generator)
- `503` — servizio esterno non raggiungibile

## RATE LIMIT, RETE E COMPORTAMENTO GATEWAY

Il traffico verso gli endpoint API passa da Nginx (reverse proxy) con le seguenti policy:

- **Rate limit per IP**: `10 richieste/secondo`
- **Burst**: fino a `20` richieste extra (`nodelay`)
- **Connessioni concorrenti per IP**: massimo `10`

Quando i limiti vengono superati, [Nginx](https://nginx.org/en/docs/) può rispondere con `503 Service Temporarily Unavailable` (configurazione di default per `limit_req` / `limit_conn` se non viene impostato uno status dedicato).

### Timeout gateway

- `client_header_timeout`: `12s`
- `client_body_timeout`: `12s`
- `keepalive_timeout`: `15s`
- `send_timeout`: `10s`
- `proxy_connect_timeout`: `30s`
- `proxy_send_timeout`: `120s`
- `proxy_read_timeout`: `120s`

### Compressione e forwarding

- **Gzip attivo** per `application/json`, `text/plain`, `application/javascript`, `text/css`
- `gzip_min_length`: `1000`
- Header inoltrati al backend: `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`

### Note operative

- Il reverse proxy usa upstream `backend-service:8000`.
- L'access log include `request_time` (`rt`) per aiutare analisi performance e troubleshooting.
- In caso di timeout/latenza sui microservizi a valle, è possibile ricevere errori gateway lato API.

## CONFIGURAZIONE

### `.env`

```bash
# Endpoint microservizi
MARKITDOWN_URL="http://markitdown:8490/process_file"
UNSTRUCTURED_URL="http://unstructured:8000/general/v0/general"
FLASHCARD_GEN_URL="http://flashcard-gen:8000/generate"

# Provider LLM (OpenAI-compatible)
AI_API_KEY="gsk_..."
AI_MODEL="llama-3.1-70b-versatile"
AI_BASE_URL="https://api.groq.com/openai/v1"

# Database
DATABASE_URL="postgresql+asyncpg://postgres:postgres@db/files_db"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"
POSTGRES_DB="files_db"
```

### Autenticazione Firebase

Scaricare `serviceAccountKey.json` da Firebase Console → Impostazioni progetto → Account di servizio → Genera nuova chiave privata. Posizionare il file nella root del progetto (accanto a `main.py`).

> ⚠️ Aggiungere `serviceAccountKey.json` a `.gitignore` e `.dockerignore`.

## AVVIO

```bash
docker compose up --build
```

L'API è disponibile su [localhost:9090](http://localhost:9090).


## SERVIZI E SOFTWARE UTILIZZATI

### Orchestrazione e runtime

- **[Docker](https://www.docker.com/)** + **[Docker Compose](https://docs.docker.com/compose/)**
- **[Python 3.10](https://www.python.org/downloads/release/python-3100/)**
- **[Uvicorn](https://www.uvicorn.org/)** (ASGI server)
- **[Nginx](https://nginx.org/)** (reverse proxy, rate limiting, connessioni concorrenti)

### Servizi containerizzati (compose)

- **[backend-service](https://fastapi.tiangolo.com/)** (FastAPI)
- **[db](https://hub.docker.com/_/postgres)**: PostgreSQL 15 (`postgres:15-alpine`)
- **[unstructured](https://hub.docker.com/r/robwilkes/unstructured-api)**: API Unstructured (`robwilkes/unstructured-api:latest`)
- **[markitdown](https://github.com/microsoft/markitdown)**: servizio di conversione documenti → Markdown
- **[flashcard-gen](https://platform.openai.com/docs/api-reference/introduction)**: microservizio generazione flashcard (OpenAI-compatible)
- **[nginx](https://hub.docker.com/_/nginx)**: gateway esterno

### Librerie backend (Python)

- **[fastapi](https://pypi.org/project/fastapi/)**
- **[uvicorn](https://pypi.org/project/uvicorn/)** (`uvicorn[standard]`)
- **[pydantic](https://pypi.org/project/pydantic/)**
- **[SQLAlchemy](https://pypi.org/project/SQLAlchemy/)**
- **[asyncpg](https://pypi.org/project/asyncpg/)**
- **[httpx](https://pypi.org/project/httpx/)**
- **[python-multipart](https://pypi.org/project/python-multipart/)**
- **[firebase-admin](https://pypi.org/project/firebase-admin/)**

### Servizi esterni / integrazioni

- **[Firebase Authentication](https://firebase.google.com/docs/auth)** (verifica JWT)
- **Provider LLM [OpenAI-compatible](https://platform.openai.com/docs/api-reference/introduction)** configurato via `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` (es. [Groq](https://console.groq.com/docs/openai))

## INTEGRAZIONE CONSIGLIATA

Questo backend è progettato per funzionare in integrazione con:

- **[FlashcardsFrontend](https://github.com/Heron4gf/FlashcardsFrontend.git)**: interfaccia utente web per upload file, gestione documenti e visualizzazione flashcard.
- **[AIflashcardsGenerator](https://github.com/Heron4gf/AIflashcardsGenerator.git)**: servizio di generazione Q&A consumato dall'endpoint `POST /api/v1/files/{file_id}/flashcards`.




