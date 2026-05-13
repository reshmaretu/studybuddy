
export async function getGeminiEmbedding(text: string, apiKey: string): Promise<number[]> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "models/embedding-001",
            content: { parts: [{ text }] }
        })
    });
    if (!response.ok) throw new Error(`Gemini Embedding Failed: ${response.statusText}`);
    const data = await response.json();
    return data.embedding.values;
}

export async function parseDocument(file: { name: string, type: string, content?: string }, llamaKey: string): Promise<string> {
    if (!file.content) throw new Error("File content is missing.");
    const base64Data = file.content.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: file.type });

    const formData = new FormData();
    formData.append('file', blob, file.name);

    const uploadRes = await fetch("https://api.cloud.llamaindex.ai/api/parsing/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${llamaKey}` },
        body: formData
    });

    if (!uploadRes.ok) throw new Error(`LlamaParse Upload Failed: ${await uploadRes.text()}`);
    const { id: jobId } = await uploadRes.json();

    // Poll for result (Max 30 seconds)
    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const res = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
            headers: { "Authorization": `Bearer ${llamaKey}` }
        });
        if (res.ok) {
            const data = await res.json();
            return data.markdown;
        }
    }
    throw new Error("LlamaParse timeout");
}
