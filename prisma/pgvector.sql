CREATE EXTENSION IF NOT EXISTS vector;

-- Prisma manages the table, but the HNSW index must be added after migration.
CREATE INDEX IF NOT EXISTS "NoteChunk_embedding_hnsw_idx"
ON "NoteChunk"
USING hnsw ("embedding" vector_cosine_ops);
