import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Generates embeddings for a given piece of text using Gemini.
 * Centralized to ensure consistent model usage and error handling.
 */
export async function getGeminiEmbedding(text: string, apiKey: string) {
    if (!text || text.trim() === "") {
        throw new Error("Cannot generate embedding for empty content.");
    }

    if (!apiKey) {
        throw new Error("Gemini API key is required for embeddings.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

    const result = await model.embedContent(text);
    return result.embedding.values;
}
