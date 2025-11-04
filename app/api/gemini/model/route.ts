import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const MODEL_FILE = path.resolve(process.cwd(), '.gemini_model')

export async function GET() {
  try {
    if (process.env.GEMINI_MODEL) return NextResponse.json({ model: process.env.GEMINI_MODEL, source: 'env' })
    if (!fs.existsSync(MODEL_FILE)) return NextResponse.json({ model: null })
    const model = fs.readFileSync(MODEL_FILE, 'utf8').trim()
    return NextResponse.json({ model: model || null, source: 'file' })
  } catch (err) {
    console.error('GET model error', err)
    return NextResponse.json({ model: null }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (process.env.GEMINI_MODEL) {
      return NextResponse.json({ ok: false, message: 'Model configured via environment; cannot overwrite.' }, { status: 400 })
    }
    const body = await request.json()
    const model = body?.model
    if (!model || typeof model !== 'string') return NextResponse.json({ ok: false, message: 'model missing' }, { status: 400 })
    fs.writeFileSync(MODEL_FILE, model, { mode: 0o600 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST model error', err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 500 })
  }
}
