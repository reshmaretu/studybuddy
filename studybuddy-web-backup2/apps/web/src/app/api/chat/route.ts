import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, generateText } from 'ai';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages, user_id, openrouter_key, groq_key, gemini_key, selected_model, stream } = body;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 🗝️ Centralized Key & Provider Logic
        const { openrouter: orP, groq: groqP, google: geminiP, geminiKey } = (await import("@/lib/ai/providers")).getAIProviders({ 
            openrouter: openrouter_key, 
            groq: groq_key, 
            gemini: gemini_key 
        });

        // 1. Premium & Profile Check
        const { data: profile } = await supabase.from('profiles').select('is_premium').eq('id', user_id).single();
        const isPremium = profile?.is_premium === true;
        const isTutorRequest = messages.some((m: { content: string }) => m.content.includes("You are Chum, a cozy lo-fi tutor AI"));

        if (isTutorRequest && !isPremium) {
            return NextResponse.json({ error: "Premium subscription required to access the Pro Tutor." }, { status: 403 });
        }

        // ==========================================
        // STEP 1: CLOUD RAG SEARCH (768-dim)
        // ==========================================
        let contextSnippet = "";

        if (user_id && geminiKey) {
            try {
                const latestUserMessage = messages[messages.length - 1].content;
                const { getGeminiEmbedding } = await import("@/lib/ai/embeddings");
                
                const query_embedding = await getGeminiEmbedding(latestUserMessage, geminiKey);

                const { data: matchedShards, error } = await supabase.rpc('match_shards', {
                    query_embedding, match_threshold: 0.4, match_count: 3, p_user_id: user_id
                });

                if (!error && matchedShards && matchedShards.length > 0) {
                    contextSnippet = "\n\n--- RELEVANT NOTES FROM USER'S DATABASE ---\n";
                    contextSnippet += (matchedShards as { title: string, content: string }[]).map((s) => `Title: ${s.title}\nContent: ${s.content}`).join('\n\n');
                    contextSnippet += "\n-------------------------------------------\n";
                }
            } catch (e: any) {
                console.warn("RAG failed, proceeding without context.", e.message);
            }
        }

        const formattedMessages = messages.map((m: { role: string, content: string }) => {
            if (m.role === 'system' && contextSnippet) return { ...m, content: m.content + contextSnippet };
            return m;
        });

        // ==========================================
        // STEP 2: THE WATERFALL ENGINE (OR MANUAL)
        // ==========================================
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
                if (node === 'openrouter' && orP) {
                    const isORModel = selected_model?.includes('/');
                    const modelToUse = (isORModel) ? selected_model : "google/gemini-2.0-flash-lite:preview-02-05";
                    
                    const config = { 
                        model: orP(modelToUse), 
                        messages: formattedMessages, 
                        maxTokens: 1000, // Increased for Tutor mode
                        temperature: 0.6 // Slightly lower for more stability
                    };
                    
                    if (shouldStream) result = await streamText(config);
                    else { const res = await generateText(config); result = res.text; }
                    usedNode = `OpenRouter: ${modelToUse}`;
                } 
                else if (node === 'groq' && groqP) {
                    const modelToUse = (primaryNode === 'groq' && selected_model) ? selected_model : "llama-3.3-70b-versatile";
                    const config = { model: groqP(modelToUse), messages: formattedMessages };
                    
                    if (shouldStream) result = await streamText(config);
                    else { const res = await generateText(config); result = res.text; }
                    usedNode = `Groq: ${modelToUse}`;
                }
                else if (node === 'gemini' && geminiP) {
                    const modelToUse = (primaryNode === 'gemini' && selected_model) ? selected_model : "gemini-1.5-flash";
                    const config = { model: geminiP(modelToUse), messages: formattedMessages };
                    
                    if (shouldStream) result = await streamText(config);
                    else { const res = await generateText(config); result = res.text; }
                    usedNode = `Gemini: ${modelToUse}`;
                }
            } catch (e: any) {
                console.warn(`${node} failed in waterfall: ${e.message}`);
            }
        }

        if (!result) {
            throw new Error("All Cloud AI nodes failed or keys are missing. Check Settings.");
        }

        if (result && shouldStream) {
            return (result as any).toTextStreamResponse({
                headers: { 'X-Node-Used': usedNode }
            });
        } else if (result) {
            return NextResponse.json({ response: result }, { headers: { 'X-Node-Used': usedNode } });
        }

        return NextResponse.json({ response: result, node: usedNode });

    } catch (error: unknown) {
        const err = error as Error;
        console.error("Chat API Error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
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