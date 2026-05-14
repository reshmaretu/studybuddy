import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

export async function POST(req: Request) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    try {
        const body = await req.json();
        const { messages, user_id, openrouter_key, groq_key, gemini_key, selected_model, stream } = body;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Use environment variables as fallback if no user keys provided
        const effectiveOpenRouterKey = openrouter_key || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
        const effectiveGroqKey = groq_key || process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;
        const effectiveGeminiKey = gemini_key || process.env.NEXT_PUBLIC_GEMINI_AI_API_KEY || process.env.GEMINI_AI_API_KEY;

        // 1. Premium & Profile Check
        const { data: profile } = await supabase.from('profiles').select('is_premium').eq('id', user_id).single();
        const isPremium = profile?.is_premium === true;
        const isTutorRequest = messages.some((m: { content: string }) => m.content.includes("You are Chum, a cozy lo-fi tutor AI"));

        if (isTutorRequest && !isPremium) {
            return NextResponse.json(
                { error: "Premium subscription required to access the Pro Tutor." }, 
                { status: 403, headers: corsHeaders }
            );
        }

        // ==========================================
        // STEP 1: CLOUD RAG SEARCH (768-dim)
        // ==========================================
        let contextSnippet = "";

        if (user_id && effectiveGeminiKey) {
            try {
                const latestUserMessage = messages[messages.length - 1].content;
                // Placeholder for RAG functionality if needed
                // const { getGeminiEmbedding } = await import("@/lib/ai/embeddings");
                // const query_embedding = await getGeminiEmbedding(latestUserMessage, effectiveGeminiKey);
                // ... rest of RAG logic
            } catch (e: any) {
                console.warn("RAG failed, proceeding without context.", e.message);
            }
        }

        const formattedMessages = messages.map((m: { role: string, content: string }) => {
            if (m.role === 'system' && contextSnippet) return { ...m, content: m.content + contextSnippet };
            return m;
        });

        // ==========================================
        // STEP 2: DYNAMIC WATERFALL ENGINE
        // ==========================================
        let result = null;
        let usedNode = "";
        const shouldStream = stream !== false;
        const primaryNode = body.primary_node || 'openrouter';

        // Define the attempts in order: Primary first, then others.
        const order = [primaryNode];
        if (!order.includes('openrouter')) order.push('openrouter');
        if (!order.includes('groq')) order.push('groq');
        if (!order.includes('gemini')) order.push('gemini');

        for (const node of order) {
            if (result) break;

            try {
                if (node === 'openrouter' && effectiveOpenRouterKey) {
                    const modelToUse = (selected_model?.includes('/') ? selected_model : "google/gemini-2.0-flash-lite:preview-02-05");
                    
                    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${effectiveOpenRouterKey}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': 'https://studybuddy.ai',
                            'X-Title': 'StudyBuddy',
                        },
                        body: JSON.stringify({
                            model: modelToUse,
                            messages: formattedMessages,
                            max_tokens: 1000,
                            temperature: 0.6,
                        })
                    });

                    const contentType = response.headers.get('content-type');
                    if (!response.ok || !contentType?.includes('application/json')) {
                        let errorMessage = `HTTP ${response.status} ${response.statusText}`;
                        try {
                            const text = await response.text();
                            if (text.includes('<title>')) {
                                const titleMatch = text.match(/<title>(.*?)<\/title>/);
                                if (titleMatch) errorMessage = `Node Error: ${titleMatch[1]}`;
                            } else {
                                const errorData = JSON.parse(text);
                                errorMessage = errorData.error?.message || errorMessage;
                            }
                        } catch (e) {
                            // If we can't parse it, stick with the status text
                        }
                        throw new Error(`OpenRouter (${modelToUse}) failed: ${errorMessage}`);
                    }

                    const data = await response.json();
                    if (data.choices?.[0]?.message?.content) {
                        result = data.choices[0].message.content;
                        usedNode = `OpenRouter: ${modelToUse}`;
                    }
                } 
                else if (node === 'groq' && effectiveGroqKey) {
                    const modelToUse = "llama-3.3-70b-versatile";
                    
                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${effectiveGroqKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: modelToUse,
                            messages: formattedMessages,
                            max_tokens: 1000,
                            temperature: 0.6,
                        })
                    });

                    const contentType = response.headers.get('content-type');
                    if (!response.ok || !contentType?.includes('application/json')) {
                        let errorMessage = `HTTP ${response.status} ${response.statusText}`;
                        try {
                            const text = await response.text();
                            const errorData = JSON.parse(text);
                            errorMessage = errorData.error?.message || errorMessage;
                        } catch (e) {}
                        throw new Error(`Groq failed: ${errorMessage}`);
                    }

                    const data = await response.json();
                    if (data.choices?.[0]?.message?.content) {
                        result = data.choices[0].message.content;
                        usedNode = `Groq: ${modelToUse}`;
                    }
                }
                else if (node === 'gemini' && effectiveGeminiKey) {
                    const modelToUse = "gemini-1.5-flash";
                    
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${effectiveGeminiKey}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            contents: formattedMessages.map((m: { role: string; content: string }) => ({
                                role: m.role === 'assistant' ? 'model' : 'user',
                                parts: [{ text: m.content }]
                            })),
                            generationConfig: {
                                maxOutputTokens: 1000,
                                temperature: 0.6,
                            }
                        })
                    });

                    const contentType = response.headers.get('content-type');
                    if (!response.ok || !contentType?.includes('application/json')) {
                        let errorMessage = `HTTP ${response.status} ${response.statusText}`;
                        try {
                            const text = await response.text();
                            const errorData = JSON.parse(text);
                            errorMessage = errorData.error?.message || errorMessage;
                        } catch (e) {}
                        throw new Error(`Gemini failed: ${errorMessage}`);
                    }

                    const data = await response.json();
                    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                        result = data.candidates[0].content.parts[0].text;
                        usedNode = `Gemini: ${modelToUse}`;
                    }
                }
            } catch (e: any) {
                console.warn(`[WATERFALL] Node ${node} failed: ${e.message}`);
            }
        }


        if (!result) {
            return NextResponse.json({ 
                error: "Neural connection failed. All AI nodes (OpenRouter, Groq, Gemini) are either unavailable or keys are missing. Please check your Neural Link settings." 
            }, { status: 503, headers: corsHeaders });
        }

        // Final safety check against HTML leakage
        if (typeof result === 'string' && (result.trim().startsWith('<!DOCTYPE') || result.trim().startsWith('<html'))) {
            console.error("[CRITICAL] HTML Leaked into AI response:", result.substring(0, 100));
            return NextResponse.json({ 
                error: "The AI node returned an incompatible response format (HTML). This usually happens when an API endpoint is behind a login page or experiencing a server-level crash." 
            }, { status: 502, headers: corsHeaders });
        }

        return NextResponse.json({ response: result }, { status: 200, headers: { ...corsHeaders, 'X-Node-Used': usedNode } });

    } catch (error: unknown) {
        const err = error as Error;
        console.error("Chat API Fatal Error:", err.message);
        return NextResponse.json(
            { error: "System encountered a neural desync error. Please try again." }, 
            { status: 500, headers: corsHeaders }
        );
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
