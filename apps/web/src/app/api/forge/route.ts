import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // Essential for LlamaParse wait times

export async function POST(req: Request) {
    try {
        const { title, content, files, file, user_id, geminiKey: bodyGeminiKey, llamaKey: bodyLlamaKey } = await req.json();

        // Priority: Request Body (User Key) > Environment Variable (System Key)
        const llamaKey = bodyLlamaKey || process.env.LLAMA_CLOUD_API_KEY || process.env.LLAMA_API_KEY || process.env.LLAMAPARSE_API_KEY || process.env.NEXT_PUBLIC_LLAMA_CLOUD_API_KEY;
        const geminiKey = bodyGeminiKey || process.env.GEMINI_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_AI_API_KEY;

        if (!geminiKey) {
            return NextResponse.json({ error: "Gemini API Key missing. Please add it in your account settings." }, { status: 400 });
        }

        const effectiveFiles = files?.length ? files : (file ? [{ name: title || "document", type: "application/pdf", content: file }] : null);

        if (effectiveFiles?.length > 0 && !llamaKey) {
            return NextResponse.json({ error: "LlamaParse API Key missing. Required for PDF/Document processing." }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY! // 👈 Make sure this is in your .env.local
        );

        let finalContent = content || "";
        let finalTitle = title || "Untitled Shard";

        // ==========================================
        // 1. LLAMAPARSE: Document Extraction
        // ==========================================
        if (effectiveFiles && effectiveFiles.length > 0 && effectiveFiles[0].content) {
            const base64Data = effectiveFiles[0].content.split(',')[1];
            const blob = new Blob([Buffer.from(base64Data, 'base64')], { type: effectiveFiles[0].type });

            const formData = new FormData();
            formData.append('file', blob, effectiveFiles[0].name);

            // Upload
            const uploadRes = await fetch("https://api.cloud.llamaindex.ai/api/parsing/upload", {
                method: "POST",
                headers: { "Authorization": `Bearer ${llamaKey}` },
                body: formData
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.text();
                throw new Error(`LlamaParse Upload Failed: ${err}`);
            }

            const { id: jobId } = await uploadRes.json();

            // Poll for result (Max 60 seconds: 30 attempts * 2s)
            let isSuccess = false;
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 2000));
                const statusRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
                    headers: { "Authorization": `Bearer ${llamaKey}` }
                });

                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    if (statusData.status === 'SUCCESS') {
                        isSuccess = true;
                        break;
                    } else if (statusData.status === 'ERROR') {
                        throw new Error(`LlamaParse processing error: ${statusData.error || 'Unknown error'}`);
                    }
                }
            }

            if (!isSuccess) {
                throw new Error("LlamaParse is taking too long to process this document (60s timeout). Please try again or check LlamaCloud queue.");
            }

            // Fetch final markdown
            const mdRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
                headers: { "Authorization": `Bearer ${llamaKey}` }
            });

            if (!mdRes.ok) {
                throw new Error("Failed to retrieve parsed markdown from LlamaCloud.");
            }

            const mdData = await mdRes.json();
            const markdownText = mdData.markdown;

            if (markdownText) {
                const separator = finalContent ? "\n\n--- DOCUMENT CONTENT ---\n\n" : "";
                finalContent = finalContent + separator + markdownText;
                if (!title) finalTitle = effectiveFiles[0].name;
            }
        }

        // ==========================================
        // 2. GEMINI EMBEDDINGS (Centralized)
        // ==========================================
        const { getGeminiEmbedding } = await import("@/lib/ai/embeddings");
        const embedding = await getGeminiEmbedding(finalContent, geminiKey!);

        // ==========================================
        // 3. SUPABASE: Save
        // ==========================================
        let shard = null;
        if (user_id) {
            // Check freemium shard limit (10 shards max for free users)
            const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('is_premium')
                .eq('id', user_id)
                .single();

            const isPremium = userData?.is_premium || false;

            if (!isPremium) {
                const { count, error: countError } = await supabase
                    .from('shards')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user_id);

                if (!countError && count !== null && count >= 10) {
                    return NextResponse.json({ 
                        error: "Freemium users are limited to 10 forged shards. Upgrade to premium for unlimited shards.",
                        limitReached: true 
                    }, { status: 403 });
                }
            }

            const { data: sData, error: shardError } = await supabase
                .from('shards')
                .insert([{ user_id, title: finalTitle, content: finalContent, embeddings: embedding }])
                .select().single();

            if (!shardError && sData) {
                shard = sData;
                try {
                    await supabase.from('shard_embeddings').insert([{ shard_id: shard.id, embedding }]);
                } catch (embedError) {
                    // Silently fail if embedding insert fails
                    console.warn("Failed to insert shard embedding:", embedError);
                }
            } else if (shardError) {
                console.error("Shard Insert Error:", shardError);
            }
        }

        return NextResponse.json({ success: true, shard, content: finalContent, embedding });

    } catch (error: any) {
        console.error("Forge Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}