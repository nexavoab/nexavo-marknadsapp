import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  
  const { message, history, org_id } = await req.json()
  
  // Bygg messages array
  const messages = [
    ...history.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ]
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `Du är Roberta, en AI-assistent för Nexavo Marknadsapp. Du hjälper kedjeadministratörer med marknadsföring, kampanjplanering och strategiska beslut. Du är direkt, konkret och hjälpsam. Du svarar alltid på svenska.`,
      messages,
    })
  })
  
  const data = await response.json()
  const reply = data.content?.[0]?.text || 'Något gick fel. Försök igen.'
  
  return new Response(JSON.stringify({ reply }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
