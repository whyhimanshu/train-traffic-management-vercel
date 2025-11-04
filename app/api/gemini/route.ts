import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { GoogleGenAI } from '@google/genai'

const KEY_FILE = path.resolve(process.cwd(), '.gemini_key')

async function getKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY
  if (!fs.existsSync(KEY_FILE)) return null
  const key = fs.readFileSync(KEY_FILE, 'utf8').trim()
  return key || null
}

export async function POST(request: Request) {
  // Proxy a simple text generation request to Gemini (example). Expect JSON body with { prompt }
  try {
    const key = await getKey();
    const body = await request.json();
    const prompt = body?.prompt;
    if (!prompt) return NextResponse.json({ ok: false, message: 'prompt required' }, { status: 400 });

    if (!key) {
      return NextResponse.json({ ok: false, message: 'No Gemini key configured on server' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: key });

    // Preferred models to try, in order
    const preferred = [process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'].filter(Boolean) as string[]

    async function tryGenerate(model: string) {
      return ai.models.generateContent({ model, contents: prompt })
    }

    let lastErr: any = null
    for (const m of preferred) {
      try {
        const resp = await tryGenerate(m)
        return NextResponse.json({ ok: true, model: m, result: resp.text })
      } catch (e: any) {
        lastErr = e
        // If model not found, continue to next
        const msg = String(e?.message || e)
        if (!/not found|NOT_FOUND|model .* not found/i.test(msg)) {
          // other error: surface it
          console.error('Gemini error', e)
          return NextResponse.json({ ok: false, message: String(e) }, { status: 500 })
        }
      }
    }

    // If all preferred models failed with not-found, ask the service which models are available
    try {
      const list = await ai.models.listModels?.()
      // listModels may return an array or an object; attempt to find a model containing 'flash'
      const candidates: string[] = []
      if (Array.isArray(list)) {
        for (const it of list) {
          const id = (it as any).name || (it as any).id || String(it)
          if (/flash/i.test(id)) candidates.push(id)
        }
      } else if (list && Array.isArray((list as any).models)) {
        for (const it of (list as any).models) {
          const id = it.name || it.id
          if (/flash/i.test(id)) candidates.push(id)
        }
      }

      for (const m of candidates) {
        try {
          const resp = await tryGenerate(m)
          return NextResponse.json({ ok: true, model: m, result: resp.text })
        } catch (e: any) {
          lastErr = e
        }
      }
    } catch (e) {
      console.error('List models failed', e)
    }

    // give up
    console.error('Gemini proxy last error', lastErr)
    return NextResponse.json({ ok: false, message: String(lastErr) }, { status: 500 })
  } catch (err) {
    console.error('Gemini proxy error', err);
    return NextResponse.json({ ok: false, message: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
