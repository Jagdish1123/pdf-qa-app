// Simple embedding service using mock embeddings
// In production, you'd use Google's Gemini API or OpenAI
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  // Mock embeddings for demo - in production use actual API
  return texts.map((text) => createMockEmbedding(text))
}

function createMockEmbedding(text: string): number[] {
  const embedding = new Array(384).fill(0)
  const words = text.toLowerCase().split(/\s+/)

  // Create embedding based on word patterns and character distribution
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i)
    embedding[i % 384] += charCode
  }

  // Add word-based features
  words.forEach((word, wordIndex) => {
    const wordHash = word.split("").reduce((hash, char) => {
      return ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff
    }, 0)
    embedding[Math.abs(wordHash) % 384] += word.length
  })

  // Add text length and complexity features
  embedding[0] += text.length / 100
  embedding[1] += words.length / 10
  embedding[2] += (text.match(/[.!?]/g) || []).length

  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  return magnitude > 0 ? embedding.map((val) => val / magnitude) : embedding
}

export async function createQueryEmbedding(query: string): Promise<number[]> {
  const embeddings = await createEmbeddings([query])
  return embeddings[0]
}
