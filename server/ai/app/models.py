from pydantic import BaseModel, ConfigDict, Field, field_validator


class SourceCitation(BaseModel):
    repository: str
    commit_sha: str = Field(pattern=r"^[0-9a-fA-F]{40}$")
    file_path: str = Field(min_length=1)
    start_line: int = Field(ge=1)
    end_line: int = Field(ge=1)


class Evidence(BaseModel):
    chunk_id: str
    repository: str
    commit_sha: str
    file_path: str
    start_line: int
    end_line: int
    content: str
    score: float
    symbol_name: str | None = None


class AskRequest(BaseModel):
    repository_id: str
    revision_id: str | None = None
    question: str = Field(min_length=3, max_length=4000)
    top_k: int = Field(default=8, ge=1, le=20)


class Answer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answer: str
    citations: list[SourceCitation]
    grounded: bool
    insufficient_evidence: bool = False
    evidence_note: str | None = None

    @field_validator("citations")
    @classmethod
    def citations_required_when_grounded(cls, value: list[SourceCitation], info):
        if info.data.get("grounded") and not value:
            raise ValueError("grounded answers require citations")
        return value


class IndexFile(BaseModel):
    path: str = Field(min_length=1)
    content: str
    language: str | None = None


class IndexRequest(BaseModel):
    repository_id: str
    revision_id: str
    repository: str
    commit_sha: str = Field(pattern=r"^[0-9a-fA-F]{40}$")
    files: list[IndexFile] = Field(min_length=1, max_length=10000)
