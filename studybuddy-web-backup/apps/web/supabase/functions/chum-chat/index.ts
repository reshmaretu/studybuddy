import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get the user from the JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized: Invalid Neural Link")

    const { messages, selected_model } = await req.json()

    // 🗝️ Secure Retrieval from Database (Avoids leaks in request body)
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('openrouter_key, gemini_key, groq_key')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) throw new Error("Could not retrieve AI keys from your profile.")

    const orKey = profile.openrouter_key?.trim() || Deno.env.get('OPENROUTER_AI_API_KEY')
    const selectedModel = selected_model || "meta-llama/llama-3.1-8b-instruct:free"

    if (!orKey) throw new Error("OpenRouter key missing. Please update your Neural Link settings.")

    // We use fetch directly to preserve streaming in Deno
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${orKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://studybuddy.ai', // Optional
        'X-Title': 'StudyBuddy Chum', // Optional
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.error?.message || "OpenRouter Request Failed")
    }

    // Proxy the stream
    const { readable, writable } = new TransformStream()
    
    // We need to parse the OpenRouter SSE format and extract the content
    // to make it a clean text stream for the frontend
    const reader = response.body?.getReader()
    const writer = writable.getWriter()
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    (async () => {
      let buffer = ""
      try {
        while (true) {
          const { done, value } = await reader!.read()
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ""

          for (const line of lines) {
            const cleaned = line.replace(/^data: /, '').trim()
            if (cleaned === '[DONE]') continue
            if (!cleaned) continue

            try {
              const json = JSON.parse(cleaned)
              const content = json.choices[0]?.delta?.content || ""
              if (content) {
                await writer.write(encoder.encode(content))
              }
            } catch (e) {
              console.warn("Skipping malformed SSE line:", cleaned)
            }
          }
        }
      } catch (err) {
        console.error("Stream proxy error:", err)
      } finally {
        writer.close()
      }
    })()

    return new Response(readable, {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'X-Node-Used': `Edge Node: ${selectedModel}`
      },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
