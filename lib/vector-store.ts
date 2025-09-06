// In-memory vector storage for PDF chunks and embeddings
export interface DocumentChunk {
  id: string
  content: string
  embedding: number[]
  metadata: {
    filename: string
    page?: number
    chunkIndex: number
  }
}

class InMemoryVectorStore {
  private chunks: DocumentChunk[] = []

  async addChunk(chunk: DocumentChunk): Promise<void> {
    this.chunks.push(chunk)
  }

  async addChunks(chunks: DocumentChunk[]): Promise<void> {
    this.chunks.push(...chunks)
  }

  async search(queryEmbedding: number[], limit = 5): Promise<DocumentChunk[]> {
    // Calculate cosine similarity for each chunk
    const similarities = this.chunks.map((chunk) => ({
      chunk,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding),
    }))

    // Sort by similarity and return top results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map((item) => item.chunk)
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dotProduct / (magnitudeA * magnitudeB)
  }

  async clear(): Promise<void> {
    this.chunks = []
  }

  getChunkCount(): number {
    return this.chunks.length
  }
}

// Singleton instance
export const vectorStore = new InMemoryVectorStore()
