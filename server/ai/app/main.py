from fastapi import FastAPI, HTTPException

from .config import settings
from .models import AskRequest, Answer, IndexRequest
from .providers import OpenAICompatibleEmbeddings, OpenAICompatibleLLM
from .retrieval import HybridRetriever
from .rag import GroundedRAG
from .chunking import chunk_code
from .store import PgVectorStore

app = FastAPI(title="RepoMind AI Service", version="0.2.0")


def make_rag() -> GroundedRAG:
    import psycopg

    connection = psycopg.connect(settings.database_url)
    store = PgVectorStore(connection)
    embeddings = OpenAICompatibleEmbeddings(settings.embedding_base_url, settings.embedding_api_key, settings.embedding_model)
    return GroundedRAG(HybridRetriever(store, embeddings, settings.min_retrieval_score), OpenAICompatibleLLM(settings.llm_base_url, settings.llm_api_key, settings.llm_model))


@app.get("/health")
def health() -> dict[str, str]:
    return {"service": "ai", "status": "ok"}


@app.post("/v1/ask", response_model=Answer)
async def ask(request: AskRequest) -> Answer:
    try:
        return await make_rag().answer(request.question, request.revision_id, request.top_k)
    except Exception as error:
        raise HTTPException(status_code=502, detail="AI retrieval or generation failed") from error


@app.post("/v1/index")
async def index(request: IndexRequest) -> dict[str, int]:
    import psycopg

    connection = psycopg.connect(settings.database_url)
    store = PgVectorStore(connection)
    embeddings = OpenAICompatibleEmbeddings(settings.embedding_base_url, settings.embedding_api_key, settings.embedding_model)
    count = 0
    try:
        for file in request.files:
            chunks = chunk_code(file.path, file.content, file.language)
            if not chunks:
                continue
            vectors = await embeddings.embed([f"{file.path}\n{chunk.content}" for chunk in chunks])
            store.insert_file_chunks(request.repository_id, request.revision_id, request.repository, request.commit_sha, file, chunks, vectors, settings.embedding_model)
            count += len(chunks)
        return {"chunks_indexed": count}
    finally:
        connection.close()
