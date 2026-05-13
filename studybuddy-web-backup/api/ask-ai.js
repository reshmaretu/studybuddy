// api/ask-ai.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 1. Receive the provider flag and chat data from home.js
        const { provider, model, systemPrompt, userMessages } = req.body;

        let aiResponse, data, extractedText;

        // ---------------------------------------------------------
        // TIER 1: GEMINI
        // ---------------------------------------------------------
        if (provider === 'gemini') {
            const apiKey = process.env.GEMINI_AI_API_KEY;

            const contents = userMessages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

            const body = { contents, generationConfig: { maxOutputTokens: 400, temperature: 0.8 } };
            if (systemPrompt) body.system_instruction = { parts: [{ text: systemPrompt }] };

            aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            data = await aiResponse.json();
            extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            // ---------------------------------------------------------
            // TIER 1.2 & 1.5: GROQ / OPENROUTER (OpenAI Format)
            // ---------------------------------------------------------
        } else if (provider === 'groq' || provider === 'openrouter') {
            const isGroq = provider === 'groq';
            const apiKey = isGroq ? process.env.GROQ_AI_API_KEY : process.env.OPENROUTER_AI_API_KEY;
            const endpoint = isGroq
                ? 'https://api.groq.com/openai/v1/chat/completions'
                : 'https://openrouter.ai/api/v1/chat/completions';

            const messages = [];
            if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
            messages.push(...userMessages);

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };

            // OpenRouter requires these extra headers for free tier usage
            if (!isGroq) {
                headers['HTTP-Referer'] = 'https://studybuddy.vercel.app';
                headers['X-Title'] = 'StudyBuddy';
            }

            aiResponse = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({ model, messages, max_tokens: 400, temperature: 0.8 })
            });

            data = await aiResponse.json();
            extractedText = data.choices?.[0]?.message?.content;

        } else {
            return res.status(400).json({ error: 'Invalid AI provider specified' });
        }

        // ---------------------------------------------------------
        // ERROR HANDLING & RESPONSE
        // ---------------------------------------------------------
        if (!aiResponse.ok) {
            // Pass the provider's specific error code (like 429 Rate Limit) back to the frontend
            return res.status(aiResponse.status).json({ error: data?.error?.message || 'API Error' });
        }

        if (extractedText) {
            // Send a unified format back to your frontend
            return res.status(200).json({ text: extractedText.trim() });
        } else {
            return res.status(500).json({ error: 'Invalid response format from AI provider' });
        }

    } catch (error) {
        console.error("Backend Error:", error);
        return res.status(500).json({ error: 'Failed to communicate with secure backend' });
    }
}