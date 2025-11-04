import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { text } = await req.json()
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'No Gemini API key configured' }, { status: 500 })
  }
  // Prompt Gemini to extract train info as JSON
  const prompt = [
    'Extract a list of all trains and their details from the following text.',
    'Return STRICT JSON array of objects with keys: id (string), name (string), type (string), status (string), currentLocation (string), nextAction (string), priority (string), delay (number), route (string).',
    'No prose. JSON only.',
    text
  ].join('\n')

  const endpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent'
  const res = await fetch(`${endpoint}?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: prompt }] }
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 800 }
      })
    })
  if (!res.ok) {
    return NextResponse.json({ error: `Gemini error: ${res.status}` }, { status: 500 })
  }
  const json = await res.json()
  const raw = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join('') || ''
  let trains = []
  try {
    trains = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Failed to parse Gemini output', raw }, { status: 500 })
  }
  return NextResponse.json({ trains })
}
