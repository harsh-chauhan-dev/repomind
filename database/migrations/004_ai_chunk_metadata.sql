BEGIN;

ALTER TABLE document_chunks
    ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS document_chunks_metadata_gin_idx
    ON document_chunks USING gin (metadata);

COMMIT;
