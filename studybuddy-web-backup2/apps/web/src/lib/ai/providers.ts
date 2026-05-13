import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const getAIProviders = (keys: { openrouter?: string, groq?: string, gemini?: string }) => {
    const orKey = (keys.openrouter?.trim() || process.env.OPENROUTER_AI_API_KEY)?.trim();
    const groqKey = (keys.groq?.trim() || process.env.GROQ_AI_API_KEY)?.trim();
    const geminiKey = (keys.gemini?.trim() || process.env.GEMINI_AI_API_KEY)?.trim();

    return {
        openrouter: orKey ? createOpenRouter({ 
            apiKey: orKey,
            headers: { 
                "HTTP-Referer": "https://studybuddy-v2.vercel.app", 
                "X-Title": "StudyBuddy",
                "Content-Type": "application/json"
            },
            extraBody: {
                "transforms": ["middle-out"] // Helps with long context in Tutor mode
            }
        }) : null,
        groq: groqKey ? createGroq({ apiKey: groqKey }) : null,
        google: geminiKey ? createGoogleGenerativeAI({ apiKey: geminiKey }) : null,
        geminiKey // Return raw key for embedding SDK usage
    };
};
