import { NextResponse } from 'next/server';

export const maxDuration = 120; // 2 minute timeout for file processing

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { file, content, title } = body;

        // Get API keys from environment variables (server-side)
        const geminiKey = process.env.NEXT_PUBLIC_GEMINI_AI_API_KEY || process.env.GEMINI_AI_API_KEY;
        const llamaKey = process.env.NEXT_PUBLIC_LLAMA_CLOUD_API_KEY || process.env.LLAMA_CLOUD_API_KEY;

        if (!geminiKey) {
            throw new Error("Gemini API Key not configured on server. Contact administrator.");
        }

        if (!llamaKey && file) {
            throw new Error("LlamaCloud API Key not configured on server. File parsing unavailable.");
        }

        let finalContent = content || "";

        // 1. LlamaParse file if provided
        if (file && llamaKey) {
            try {
                // file should be a data URL or base64 string
                const parseResult = await parseDocumentWithLlama(file, title || "document", llamaKey);
                finalContent = (finalContent ? finalContent + "\n\n" : "") + parseResult;
            } catch (e: any) {
                console.error("LlamaParse error:", e.message);
                throw new Error(`File parsing failed: ${e.message}`);
            }
        }

        // 2. Generate embedding with Gemini
        try {
            const embedding = await getGeminiEmbedding(finalContent, geminiKey);
            
            return NextResponse.json({ 
                content: finalContent,
                embedding: embedding,
                success: true 
            });
        } catch (e: any) {
            throw new Error(`Embedding generation failed: ${e.message}`);
        }

    } catch (error: unknown) {
        const err = error as Error;
        console.error("Parse File API Error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

async function parseDocumentWithLlama(fileData: string, fileName: string, llamaKey: string): Promise<string> {
    try {
        // Convert data URL to blob if needed
        let blobData = fileData;
        if (fileData.startsWith('data:')) {
            const base64 = fileData.split(',')[1];
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes]);
            blobData = blob.toString();
        }

        // Call LlamaCloud API
        const formData = new FormData();
        // Note: LlamaCloud API expects form data with file upload
        // This is a simplified version - you may need to adjust based on LlamaCloud's actual API

        const response = await fetch('https://api.cloud.llamaindex.ai/v1/documents/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${llamaKey}`,
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`LlamaCloud API error: ${response.statusText}`);
        }

        const result = await response.json();
        return result.text || result.content || "";
    } catch (e: any) {
        throw new Error(`LlamaParse failed: ${e.message}`);
    }
}

async function getGeminiEmbedding(text: string, geminiKey: string): Promise<number[]> {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'models/text-embedding-004',
                    content: {
                        parts: [{ text: text }]
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Gemini embedding error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.embedding?.values || [];
    } catch (e: any) {
        throw new Error(`Failed to generate embedding: ${e.message}`);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
