import { type NextRequest, NextResponse } from "next/server"
import { extractTextFromPDF, chunkText, createDocumentChunks } from "@/lib/pdf-processor"
import { vectorStore } from "@/lib/vector-store"
import { generateEmbeddingsWithGemini } from "@/lib/gemini"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (file.type !== "application/pdf")
      return NextResponse.json({ error: "Invalid file type. Please upload a PDF." }, { status: 400 })

    console.log(`[v0] Processing PDF: ${file.name}, size: ${file.size} bytes`)

    // Extract text
    const text = await extractTextFromPDF(file)
    console.log(`[v0] Extracted ${text.length} characters`)

    // Chunk text
    const textChunks = chunkText(text, 800, 100)
    console.log(`[v0] Created ${textChunks.length} chunks`)
    if (textChunks.length === 0)
      return NextResponse.json({ error: "No readable content found in PDF" }, { status: 400 })

    // Generate embeddings via Gemini
    const embeddings = await generateEmbeddingsWithGemini(textChunks)
    console.log(`[v0] Generated embeddings for ${embeddings.length} chunks`)

    // Create document chunks and store
    const chunks = await createDocumentChunks(file.name, text, embeddings)
    await vectorStore.addChunks(chunks)

    const totalChunks = vectorStore.getChunkCount()
    console.log(`[v0] Stored chunks. Total in DB: ${totalChunks}`)

    return NextResponse.json({
      success: true,
      message: `Processed "${file.name}" successfully`,
      details: { filename: file.name, textLength: text.length, chunksCreated: chunks.length, totalChunksInDatabase: totalChunks },
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Failed to process PDF", details: errorMessage }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    await vectorStore.clear()
    return NextResponse.json({ success: true, message: "All documents cleared" })
  } catch {
    return NextResponse.json({ error: "Failed to clear database" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const chunkCount = vectorStore.getChunkCount()
    return NextResponse.json({ chunkCount, status: chunkCount > 0 ? "ready" : "empty" })
  } catch {
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 })
  }
}
