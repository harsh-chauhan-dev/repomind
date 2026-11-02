from .models import Evidence
from .store import PgVectorStore
from .providers import EmbeddingProvider


class HybridRetriever:
    def __init__(self, store: PgVectorStore, embeddings: EmbeddingProvider, min_score: float = 0.18):
        self.store, self.embeddings, self.min_score = store, embeddings, min_score

    async def retrieve(self, question: str, revision_id: str | None, top_k: int) -> list[Evidence]:
        [query_embedding] = await self.embeddings.embed([question])
        semantic = self.store.search_vector(revision_id, query_embedding, top_k * 2)
        keyword = self.store.search_keyword(revision_id, question, top_k * 2)
        scores: dict[str, float] = {}
        semantic_ids = {item.chunk_id for item in semantic}
        evidence: dict[str, Evidence] = {}
        for rank, item in enumerate(semantic + keyword, 1):
            scores[item.chunk_id] = scores.get(item.chunk_id, 0) + 1 / (60 + rank)
            evidence[item.chunk_id] = item
        ranked = sorted(evidence.values(), key=lambda item: scores[item.chunk_id], reverse=True)
        return [item for item in ranked if item.chunk_id in semantic_ids and item.score >= self.min_score or item.chunk_id not in semantic_ids][:top_k]
