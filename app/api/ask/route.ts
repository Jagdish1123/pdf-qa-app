// /app/api/ask/route.ts

import { type NextRequest, NextResponse } from "next/server"
import { vectorStore } from "@/lib/vector-store"
import { generateAnswerWithGemini, createQueryEmbedding } from "@/lib/gemini"

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json()
    
    if (!question || typeof question !== "string" || question.trim().length === 0) {
      console.error("[v0] Invalid question received:", question);
      return NextResponse.json({ error: "Please provide a valid question" }, { status: 400 })
    }
    
    if (question.length > 500) {
      console.error("[v0] Question too long:", question.length);
      return NextResponse.json({ error: "Question too long. Max 500 characters." }, { status: 400 })
    }

    // Check DB
    const chunkCount = vectorStore.getChunkCount()
    if (chunkCount === 0) {
      console.warn("[v0] No documents uploaded when a question was asked.");
      return NextResponse.json({ error: "No documents uploaded. Please upload a PDF first." }, { status: 400 })
    }

    console.log(`[v0] Processing question: "${question}"`)

    // Create query embedding
    const queryEmbedding = await createQueryEmbedding(question.trim())

    // Retrieve relevant chunks
    const relevantChunks = await vectorStore.search(queryEmbedding, 5)
    console.log(`[v0] Found ${relevantChunks.length} relevant chunks`)
    if (relevantChunks.length === 0) {
      console.warn("[v0] No relevant chunks found for the question.");
      return NextResponse.json({
        answer: "No relevant information found in uploaded documents.",
        sources: [],
        confidence: 0,
      })
    }

    // Generate answer via Gemini
    const result = await generateAnswerWithGemini(question, relevantChunks)
    console.log(`[v0] Generated answer with confidence: ${result.confidence}`)

    return NextResponse.json({
      question,
      answer: result.answer,
      sources: result.sources,
      confidence: result.confidence,
      metadata: { chunksRetrieved: relevantChunks.length, totalChunksInDatabase: chunkCount },
    })
  } catch (error) {
    console.error("[v0] Question error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Failed to process question", details: errorMessage }, { status: 500 })
  }
}

export async function GET() {
  try {
    const chunkCount = vectorStore.getChunkCount()
    return NextResponse.json({
      status: "ready",
      documentsLoaded: chunkCount > 0,
      chunkCount,
      message: chunkCount > 0 ? "Ready to answer questions" : "Upload a PDF to start",
    })
  } catch {
    return NextResponse.json({ error: "Failed to get API status" }, { status: 500 })
  }
}