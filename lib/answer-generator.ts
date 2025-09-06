// Simple answer generation using retrieved context
// In production, you'd use Gemini or another LLM API
export interface AnswerResult {
  answer: string
  sources: Array<{
    filename: string
    chunkIndex: number
    content: string
    relevance: number
  }>
  confidence: number
}

export async function generateAnswer(
  question: string,
  context: Array<{ content: string; metadata: any; similarity?: number }>,
): Promise<AnswerResult> {
  try {
    // Mock answer generation - in production use Gemini API
    const answer = await generateMockAnswer(question, context)

    const sources = context.map((chunk, index) => ({
      filename: chunk.metadata.filename,
      chunkIndex: chunk.metadata.chunkIndex,
      content: chunk.content.substring(0, 200) + "...",
      relevance: chunk.similarity || 0.8 - index * 0.1,
    }))

    const confidence = calculateConfidence(context)

    return {
      answer,
      sources,
      confidence,
    }
  } catch (error) {
    console.error("Answer generation error:", error)
    throw new Error("Failed to generate answer")
  }
}

async function generateMockAnswer(
  question: string,
  context: Array<{ content: string; metadata: any }>,
): Promise<string> {
  // Simple rule-based answer generation for demo
  const combinedContext = context.map((c) => c.content).join(" ")

  // Look for key terms in the question
  const questionLower = question.toLowerCase()

  if (questionLower.includes("what") || questionLower.includes("define")) {
    return generateDefinitionAnswer(question, combinedContext)
  } else if (questionLower.includes("how") || questionLower.includes("process")) {
    return generateProcessAnswer(question, combinedContext)
  } else if (questionLower.includes("why") || questionLower.includes("reason")) {
    return generateReasonAnswer(question, combinedContext)
  } else if (questionLower.includes("when") || questionLower.includes("time")) {
    return generateTimeAnswer(question, combinedContext)
  } else {
    return generateGeneralAnswer(question, combinedContext)
  }
}

function generateDefinitionAnswer(question: string, context: string): string {
  const contextPreview = context.substring(0, 300)
  return `Based on the document content, here's what I found regarding your question "${question}":

${contextPreview}

This information comes directly from the uploaded PDF document. For a more detailed explanation, please refer to the source sections highlighted above.`
}

function generateProcessAnswer(question: string, context: string): string {
  const contextPreview = context.substring(0, 400)
  return `Regarding the process you asked about in "${question}", the document indicates:

${contextPreview}

The document provides step-by-step information that addresses your question. Please review the source sections for complete details.`
}

function generateReasonAnswer(question: string, context: string): string {
  const contextPreview = context.substring(0, 350)
  return `To answer your question "${question}", the document explains:

${contextPreview}

This explanation is drawn from the relevant sections of your uploaded PDF document.`
}

function generateTimeAnswer(question: string, context: string): string {
  const contextPreview = context.substring(0, 300)
  return `Regarding the timing aspect of your question "${question}":

${contextPreview}

The document contains temporal information relevant to your query. Check the source sections for specific details.`
}

function generateGeneralAnswer(question: string, context: string): string {
  const contextPreview = context.substring(0, 400)
  return `Based on your question "${question}", I found the following relevant information in the document:

${contextPreview}

This response is generated from the most relevant sections of your uploaded PDF. Please refer to the source citations for additional context.`
}

function calculateConfidence(context: Array<{ similarity?: number }>): number {
  if (context.length === 0) return 0

  const avgSimilarity = context.reduce((sum, chunk) => sum + (chunk.similarity || 0.5), 0) / context.length
  const contextLength = context.length

  // Higher confidence with more context and higher similarity
  const confidence = avgSimilarity * 0.7 + Math.min(contextLength / 5, 1) * 0.3

  return Math.round(confidence * 100) / 100
}
