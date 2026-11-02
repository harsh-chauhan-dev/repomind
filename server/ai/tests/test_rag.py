import pytest

from app.models import Evidence
from app.rag import GroundedRAG


SHA = "a" * 40
EVIDENCE = Evidence(chunk_id="1", repository="acme/repo", commit_sha=SHA, file_path="src/app.py", start_line=10, end_line=20, content="def answer(): return 42", score=0.9)


class Retriever:
    async def retrieve(self, question: str, revision_id: str | None, top_k: int):
        return [EVIDENCE]


class LLM:
    async def complete_json(self, system: str, user: str):
        return {"answer": "It returns 42.", "citations": [{"repository": "acme/repo", "commit_sha": SHA, "file_path": "src/app.py", "start_line": 12, "end_line": 14}], "grounded": True, "insufficient_evidence": False, "evidence_note": None}


@pytest.mark.anyio
async def test_answer_accepts_citation_inside_retrieved_range() -> None:
    result = await GroundedRAG(Retriever(), LLM()).answer("What does answer do?", None, 4)
    assert result.grounded is True
    assert result.citations[0].file_path == "src/app.py"


class HallucinatingLLM(LLM):
    async def complete_json(self, system: str, user: str):
        result = await super().complete_json(system, user)
        result["citations"][0]["file_path"] = "missing.py"
        return result


@pytest.mark.anyio
async def test_unverifiable_citation_is_refused() -> None:
    result = await GroundedRAG(Retriever(), HallucinatingLLM()).answer("What?", None, 4)
    assert result.insufficient_evidence is True
    assert result.grounded is False
