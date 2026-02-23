# FlashcardsAPI

Backend a microservizi per la generazione automatizzata di flashcard da documenti. Orchestra una pipeline di conversione (MarkItDown), segmentazione semantica (Unstructured) e generazione AI.


## ARCHITETTURA

- **Backend Service** (FastAPI): API gateway e orchestratore
- **MarkItDown**: Conversione documenti → Markdown
- **Unstructured**: Chunking semantico (`by_title`, 1000 char, 150 overlap)
- **Flashcard Generator**: Microservizio OpenAI-compatible per generazione Q&A
- **PostgreSQL**: Persistenza metadati e chunk


## ENDPOINTS

Tutti gli endpoint richiedono autenticazione Firebase JWT nell'header `Authorization: Bearer <token>`.

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/v1/get-files` | Restituisce la lista dei file dell'utente autenticato con preview del primo chunk (`id`, `name`, `preview`). |
| `POST` | `/api/v1/upload-file` | Upload documento. Esegue pipeline completa (conversione → chunking → persistenza). Ritorna `201` con `{"id": <file_id>}` e header `Location`. |
| `DELETE` | `/api/v1/delete-file` | Elimina file e relativi chunk. Ritorna `204` o `404` se non trovato/non autorizzato. Body: `{"id": <uuid>}`. |
| `POST` | `/api/v1/get-flashcards` | Genera flashcard AI da chunk random del file. Body: `{"id": <uuid>, "limit": <int>}`. Ritorna lista di `{"question": "...", "answer": "..."}`. |

Ownership: ogni file è associato allo `user_id` Firebase; gli utenti possono operare solo sui propri file.


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

L'API è disponibile su `http://localhost:9090`.