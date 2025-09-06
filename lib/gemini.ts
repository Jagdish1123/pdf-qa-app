// lib/gemini.ts

// The correct base URL for the Google Gemini API
const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Your API Key from a .env file
const API_KEY = process.env.GEMINI_API_KEY;

// Utility function to handle API calls and errors
async function geminiFetch(endpoint: string, method: string, body: any) {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in environment variables.");
  }

  const url = `${API_BASE_URL}${endpoint}?key=${API_KEY}`;
  
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown API error" }));
    console.error("Gemini API Error:", errorData);
    throw new Error(`Gemini API call failed with status ${res.status}: ${errorData?.error?.message || res.statusText}`);
  }

  return res.json();
}

/**
 * Generates embeddings for a list of texts using the text-embedding-004 model.
 * @param texts An array of strings to generate embeddings for.
 * @returns A promise that resolves to a 2D array of numbers (embeddings).
 */
export async function generateEmbeddingsWithGemini(texts: string[]): Promise<number[][]> {
  const payload = {
    requests: texts.map(text => ({
      model: "models/text-embedding-004",
      content: { parts: [{ text }] },
    })),
  };

  try {
    // Correct endpoint for batch embedding
    const data = await geminiFetch("/models/text-embedding-004:batchEmbedContents", "POST", payload);
    return data.embeddings.map((e: { values: number[] }) => e.values);
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw error;
  }
}

/**
 * Generates an embedding for a single query.
 * @param query The query string.
 * @returns A promise that resolves to an array of numbers (embedding).
 */
export async function createQueryEmbedding(query: string): Promise<number[]> {
  const embeddings = await generateEmbeddingsWithGemini([query]);
  return embeddings[0];
}

/**
 * Generates an answer to a question based on provided context using the Gemini Pro model.
 *
 * @param question The user's question.
 * @param chunks An array of context chunks (e.g., from a PDF).
 * @returns A promise that resolves to an object containing the answer, sources, and confidence.
 */
// FINAL FIX: The function's return type is corrected to match the data we are returning
export async function generateAnswerWithGemini(
  question: string,
  chunks: any[],
): Promise<{ answer: string; sources: any[]; confidence: number }> {
  const contextText = chunks.map(c => c.text).join("\n\n");
  const prompt = `Based on the following context, answer the question. If the information isn't in the context, say "I don't have enough information to answer."
  
  Context:
  ${contextText}

  Question: ${question}`;

  const payload = {
    // FINAL FIX: Using a stable, documented model name
    model: "gemini-2.5-flash", 
    contents: [{ parts: [{ text: prompt }] }],
    safety_settings: [],
  };

  try {
    // FINAL FIX: Using the corresponding correct endpoint path
    const data = await geminiFetch("/models/gemini-2.5-flash:generateContent", "POST", payload);
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!answer) {
      console.warn("Gemini did not return an answer.");
      return {
        answer: "No answer found.",
        // The backend returns the full chunks to satisfy the frontend's expected format
        sources: chunks.map(c => ({
          filename: c.filename,
          chunkIndex: c.chunkIndex,
          content: c.text,
          relevance: c.relevance ?? 0.0 // Providing a default relevance score
        })),
        confidence: 0,
      };
    }

    // FINAL FIX: Returning the complete chunk objects for sources
    return {
      answer,
      sources: chunks.map(c => ({
        filename: c.filename,
        chunkIndex: c.chunkIndex,
        content: c.text,
        relevance: c.relevance ?? 0.0
      })),
      confidence: 0.9,
    };
  } catch (error) {
    console.error("Error generating answer:", error);
    throw error;
  }
}