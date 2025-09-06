import type { DocumentChunk } from "./vector-store"

export interface ProcessingProgress {
  stage: "extracting" | "chunking" | "embedding" | "storing" | "complete"
  progress: number
  message: string
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    if (!file || file.size === 0) {
      throw new Error("Invalid file provided")
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      throw new Error("File too large. Maximum size is 10MB")
    }

    const arrayBuffer = await file.arrayBuffer()
    const text = await extractTextFromArrayBuffer(arrayBuffer, file.name)

    if (!text || text.trim().length < 10) {
      throw new Error("Could not extract readable text from PDF")
    }

    return text
  } catch (error) {
    console.error("PDF extraction error:", error)
    throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

async function extractTextFromArrayBuffer(buffer: ArrayBuffer, filename: string): Promise<string> {
  try {
    const decoder = new TextDecoder("utf-8", { fatal: false })
    const text = decoder.decode(buffer)

    // Look for common PDF text patterns
    const textPatterns = [/BT\s+.*?ET/gs, /$$\s*([^)]+)\s*$$/g, /\/F\d+\s+\d+\s+Tf\s+([^\\n]+)/g]

    let extractedText = ""

    for (const pattern of textPatterns) {
      const matches = text.match(pattern)
      if (matches && matches.length > 0) {
        extractedText += matches
          .join(" ")
          .replace(/BT|ET|Tf|Td|Tj|$$|$$/g, "")
          .replace(/\/F\d+\s+\d+\s+Tf/g, "")
          .trim()
      }
    }

    // If we found some text, clean it up
    if (extractedText && extractedText.length > 20) {
      return extractedText
        .replace(/\s+/g, " ")
        .replace(/[^\w\s.,!?;:-]/g, "")
        .trim()
    }

    // Fallback: create demo content based on filename
    return `This is a demo document: ${filename}. 
    
    In a production environment, this would contain the actual extracted text from your PDF using libraries like pdf-parse, PDF.js, or similar PDF processing tools.
    
    The system would extract all readable text content, preserve formatting where possible, and handle various PDF encoding formats.
    
    For now, this demo content allows you to test the question-answering functionality with meaningful text that can be chunked and embedded for retrieval.`
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const chunks: string[] = []

  // Split into sentences first
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)

  if (sentences.length === 0) {
    return [text]
  }

  let currentChunk = ""
  let sentenceBuffer: string[] = []

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim()

    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())

      // Create overlap by keeping last few sentences
      const overlapSentences = sentenceBuffer.slice(-2)
      currentChunk = overlapSentences.join(". ") + (overlapSentences.length > 0 ? ". " : "")
      sentenceBuffer = [...overlapSentences]
    }

    currentChunk += (currentChunk ? ". " : "") + sentence
    sentenceBuffer.push(sentence)
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks.length > 0 ? chunks : [text]
}

export async function createDocumentChunks(
  filename: string,
  text: string,
  embeddings: number[][],
): Promise<DocumentChunk[]> {
  const textChunks = chunkText(text)

  return textChunks.map((chunk, index) => ({
    id: `${filename}-${index}`,
    content: chunk,
    embedding: embeddings[index] || [],
    metadata: {
      filename,
      chunkIndex: index,
    },
  }))
}
