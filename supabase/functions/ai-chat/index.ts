import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://fotrwcwjvchqjfvnzven.supabase.co'
const SUPABASE_SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? ''
const OPENCLAW_GATEWAY_URL = Deno.env.get('OPENCLAW_GATEWAY_URL') ?? 'https://minotaur-romeo.tail4c70a1.ts.net/hooks/agent'
const OPENCLAW_TOKEN = Deno.env.get('OPENCLAW_HOOKS_TOKEN') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { message, history, org_id } = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const historyText = history?.slice(-6).map((m: any) =>
      `${m.role === 'user' ? 'Användare' : 'Roberta'}: ${m.content}`
    ).join('\n') ?? ''

    const fullPrompt = historyText ? `${historyText}\nAnvändare: ${message}` : message
    const taskId = crypto.randomUUID()
    const sessionKey = `hook:nexavo:${org_id ?? 'default'}:${taskId}`

    const { error: insertError } = await supabase.from('ai_tasks').insert({
      id: taskId,
      org_id: org_id ?? '55f51016-6fa9-4f55-8b69-2dc3ab5fcc3b',
      task_type: 'chat',
      payload: { message: fullPrompt, type: 'chat' },
      status: 'pending',
      session_key: sessionKey
    })

    if (insertError) throw new Error(`Insert failed: ${insertError.message}`)

    const hookRes = await fetch(OPENCLAW_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agentId: 'nexavo-assistant', sessionKey, prompt: fullPrompt, task_id: taskId })
    })

    if (!hookRes.ok) throw new Error(`OpenClaw error ${hookRes.status}: ${await hookRes.text()}`)

    // Polla i max 45s
    for (let i = 0; i < 22; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const { data } = await supabase.from('ai_tasks').select('status, result').eq('id', taskId).single()
      if (data?.status === 'completed' && data?.result) {
        const reply = data.result?.reply ?? data.result?.text ?? data.result?.posts?.[0]?.caption ?? JSON.stringify(data.result)
        return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      if (data?.status === 'failed') throw new Error('Agent failed')
    }

    throw new Error('Timeout')
  } catch (err) {
    console.error('ai-chat error:', err)
    return new Response(JSON.stringify({ error: String(err), reply: 'Något gick fel. Försök igen.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
