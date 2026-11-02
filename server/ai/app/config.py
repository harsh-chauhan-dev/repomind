from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "postgresql://repomind:repomind@localhost:5432/repomind")
    llm_base_url: str = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    embedding_base_url: str = os.getenv("EMBEDDING_BASE_URL", os.getenv("LLM_BASE_URL", "https://api.openai.com/v1"))
    embedding_api_key: str = os.getenv("EMBEDDING_API_KEY", os.getenv("LLM_API_KEY", ""))
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    embedding_dimensions: int = int(os.getenv("EMBEDDING_DIMENSIONS", "1536"))
    retrieval_k: int = int(os.getenv("RETRIEVAL_K", "8"))
    min_retrieval_score: float = float(os.getenv("MIN_RETRIEVAL_SCORE", "0.18"))


settings = Settings()
