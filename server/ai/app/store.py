from __future__ import annotations

from hashlib import sha256
import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from psycopg import Connection

from .chunking import CodeChunk
from .models import Evidence, IndexFile


def vector_literal(values: list[float]) -> str:
    return "[" + ",".join(str(float(value)) for value in values) + "]"


class PgVectorStore:
    def __init__(self, connection: Connection):
        self.connection = connection

    def insert_file_chunks(self, repository_id: str, revision_id: str, repository: str, commit_sha: str, file: IndexFile, chunks: list[CodeChunk], embeddings: list[list[float]], embedding_model: str) -> None:
        with self.connection.cursor() as cursor:
            cursor.execute("INSERT INTO repository_files (revision_id, path, language, content_hash, size_bytes) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (revision_id, path) DO UPDATE SET content_hash = EXCLUDED.content_hash, language = EXCLUDED.language RETURNING id", (revision_id, file.path, file.language, sha256(file.content.encode()).hexdigest(), len(file.content.encode())))
            file_id = cursor.fetchone()[0]
            cursor.execute("DELETE FROM document_chunks WHERE file_id = %s", (file_id,))
            for chunk, embedding in zip(chunks, embeddings):
                metadata = {**chunk.metadata, "repository": repository, "commit_sha": commit_sha, "repository_id": repository_id, "revision_id": revision_id}
                cursor.execute("INSERT INTO document_chunks (file_id, revision_id, chunk_index, symbol_name, start_line, end_line, content, content_hash, embedding, embedding_model, metadata) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::vector, %s, %s::jsonb)", (file_id, revision_id, chunk.index, chunk.symbol_name, chunk.start_line, chunk.end_line, chunk.content, sha256(chunk.content.encode()).hexdigest(), vector_literal(embedding), embedding_model, json.dumps(metadata)))
        self.connection.commit()

    def search_vector(self, revision_id: str | None, embedding: list[float], limit: int) -> list[Evidence]:
        where = "d.revision_id = %s AND d.embedding IS NOT NULL" if revision_id else "d.embedding IS NOT NULL"
        with self.connection.cursor() as cursor:
            cursor.execute(f"SELECT d.id, d.content, d.start_line, d.end_line, d.symbol_name, COALESCE(d.metadata->>'repository', ''), COALESCE(d.metadata->>'commit_sha', ''), f.path, 1 - (d.embedding <=> %s::vector) AS score FROM document_chunks d JOIN repository_files f ON f.id = d.file_id WHERE {where} ORDER BY d.embedding <=> %s::vector LIMIT %s", [vector_literal(embedding), *([revision_id] if revision_id else []), vector_literal(embedding), limit])
            return [Evidence(chunk_id=str(row[0]), content=row[1], start_line=row[2], end_line=row[3], symbol_name=row[4], repository=row[5], commit_sha=row[6], file_path=row[7], score=float(row[8])) for row in cursor.fetchall()]

    def search_keyword(self, revision_id: str | None, query: str, limit: int) -> list[Evidence]:
        where = "d.revision_id = %s" if revision_id else "TRUE"
        with self.connection.cursor() as cursor:
            cursor.execute(f"SELECT d.id, d.content, d.start_line, d.end_line, d.symbol_name, COALESCE(d.metadata->>'repository', ''), COALESCE(d.metadata->>'commit_sha', ''), f.path, ts_rank_cd(d.search_vector, plainto_tsquery('simple', %s)) AS score FROM document_chunks d JOIN repository_files f ON f.id = d.file_id WHERE {where} AND d.search_vector @@ plainto_tsquery('simple', %s) ORDER BY score DESC LIMIT %s", [query, *([revision_id] if revision_id else []), query, limit])
            return [Evidence(chunk_id=str(row[0]), content=row[1], start_line=row[2], end_line=row[3], symbol_name=row[4], repository=row[5], commit_sha=row[6], file_path=row[7], score=float(row[8])) for row in cursor.fetchall()]
