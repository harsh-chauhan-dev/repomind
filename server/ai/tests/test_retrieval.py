import pytest

from app.models import Evidence
from app.retrieval import HybridRetriever


def evidence(chunk_id: str, score: float) -> Evidence:
    return Evidence(chunk_id=chunk_id, repository="repo", commit_sha="b" * 40, file_path=f"{chunk_id}.py", start_line=1, end_line=3, content=chunk_id, score=score)


class Store:
    def search_vector(self, revision_id, embedding, limit):
        return [evidence("semantic", 0.8)]

    def search_keyword(self, revision_id, query, limit):
        return [evidence("exact-symbol", 0.02), evidence("semantic", 0.8)]


class Embeddings:
    async def embed(self, texts):
        return [[1.0, 0.0]]


@pytest.mark.anyio
async def test_hybrid_retrieval_keeps_exact_keyword_match() -> None:
    result = await HybridRetriever(Store(), Embeddings(), min_score=0.18).retrieve("exactSymbol", None, 2)
    assert {item.chunk_id for item in result} == {"semantic", "exact-symbol"}
