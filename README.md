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
| `GET` | `/api/v1/files` | Lista tutti i file dell'utente autenticato. Ritorna `200` con array di `{"id": <uuid>, "name": "...", "preview": "..."}`. |
| `POST` | `/api/v1/files` | Upload documento. Esegue pipeline completa (conversione → chunking → persistenza). Body: `multipart/form-data` con `name` (string) e `file` (binary). Ritorna `201` con `{"id": <uuid>}` e header `Location: /api/v1/files/<uuid>`. |
| `DELETE` | `/api/v1/files/{file_id}` | Elimina file e relativi chunk. `file_id` è un UUID nel path. Ritorna `204` o `404` se non trovato/non autorizzato. |
| `POST` | `/api/v1/files/{file_id}/flashcards` | Genera flashcard AI da chunk random del file. `file_id` è un UUID nel path. Body: `{"limit": <int>}` (default: `10`). Ritorna `200` con lista di `{"question": "...", "answer": "..."}`. |

**Ownership**: ogni file è associato allo `user_id` Firebase; gli utenti possono operare solo sui propri file.

**Errori servizi esterni**:
- `502` — servizio esterno ha risposto con errore (MarkItDown, Unstructured, Flashcard Generator)
- `503` — servizio esterno non raggiungibile

## CONFIGURAZIONE

### `.env`

```bash
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

L'API è disponibile su `http://localhost:8080`.