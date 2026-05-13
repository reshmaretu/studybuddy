import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // Essential for LlamaParse wait times

export async function POST(req: Request) {
    try {
        const { title, content, files, user_id, geminiKey: bodyGeminiKey, llamaKey: bodyLlamaKey } = await req.json();
        
        // Priority: Request Body (User Key) > Environment Variable (System Key)
        const llamaKey = bodyLlamaKey || process.env.LLAMA_CLOUD_API_KEY;
        const geminiKey = bodyGeminiKey || process.env.GEMINI_AI_API_KEY;

        if (!geminiKey) {
            return NextResponse.json({ error: "Gemini API Key missing. Please add it in your account settings." }, { status: 400 });
        }

        if (files?.length > 0 && !llamaKey) {
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
        if (files && files.length > 0 && files[0].content) {
            const base64Data = files[0].content.split(',')[1];
            const blob = new Blob([Buffer.from(base64Data, 'base64')], { type: files[0].type });

            const formData = new FormData();
            formData.append('file', blob, files[0].name);

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

            // Poll for result (Max 30 seconds)
            let markdownText = "";
            for (let i = 0; i < 15; i++) {
                await new Promise(r => setTimeout(r, 2000));
                const res = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
                    headers: { "Authorization": `Bearer ${llamaKey}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    markdownText = data.markdown;
                    break;
                }
            }

            if (markdownText) {
                const separator = finalContent ? "\n\n--- DOCUMENT CONTENT ---\n\n" : "";
                finalContent = finalContent + separator + markdownText;
                if (!title) finalTitle = files[0].name;
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
        const { data: shard, error: shardError } = await supabase
            .from('shards')
            .insert([{ user_id, title: finalTitle, content: finalContent }])
            .select().single();

        if (shardError) throw shardError;

        await supabase.from('shard_embeddings').insert([{ shard_id: shard.id, embedding }]);

        return NextResponse.json({ success: true, shard });

    } catch (error: any) {
        console.error("Forge Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}