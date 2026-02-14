# FlashcardsAPI

Un backend robusto a microservizi per la generazione automatizzata di flashcard da documenti. Il sistema orchestra una pipeline di elaborazione che include conversione, segmentazione semantica (chunking) e generazione AI tramite provider compatibili con il protocollo OpenAI.

## ARCHITETTURA A MICROSERVIZI

Il sistema è composto da 4 servizi dockerizzati:

1.  **Backend Service (FastAPI)**: Orchestratore principale. Gestisce l'upload, la persistenza su DB e il coordinamento tra i servizi.
2.  **Unstructured API**: Motore di ETL per l'elaborazione di documenti non strutturati.
3.  **MarkItDown**: Servizio di conversione dedicato per trasformare input vari in Markdown pulito.
4.  **Flashcard Generator**: Microservizio "AI-Agnostic". Funziona come un client **OpenAI-compatible**, permettendo l'interfacciamento con qualsiasi provider SaaS (Groq, OpenAI, DeepInfra) o modelli locali (vLLM, LocalAI) semplicemente cambiando la `BASE_URL`.

## STRATEGIA DI CHUNKING (Unstructured)

Il sistema applica una strategia di segmentazione rigorosa per ottimizzare il contesto passato al LLM. La configurazione attuale nel backend definisce:

* **Strategia**: `by_title` (Il testo viene diviso rispettando la gerarchia delle sezioni/titoli).
* **Max Characters**: `1000` (Dimensione massima del chunk per garantire granularità).
* **Overlap**: `150` (Sovrapposizione di caratteri per mantenere la continuità semantica tra i segmenti).

## CONFIGURAZIONE

### Variabili d'Ambiente (.env)

Creare un file `.env` nella root del progetto. Grazie all'architettura flessibile, è possibile configurare qualsiasi modello compatibile con le API di OpenAI.

```bash
# Configurazione modello e provider LLM
AI_API_KEY = "your-api-key"
AI_MODEL = "openai/gpt-oss-20b"
AI_BASE_URL = "https://api.groq.com/openai/v1"

# Configurazione Database
DATABASE_URL="postgresql+asyncpg://postgres:postgres@db/files_db"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"
POSTGRES_DB="files_db"
