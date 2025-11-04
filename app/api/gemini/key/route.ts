import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const KEY_FILE = path.resolve(process.cwd(), '.gemini_key')

export async function GET() {
  try {
    // If GEMINI_API_KEY is set in env, prefer that and report as configured
    if (process.env.GEMINI_API_KEY) {
      return NextResponse.json({ hasKey: true, source: 'env' })
    }

    if (!fs.existsSync(KEY_FILE)) {
      return NextResponse.json({ hasKey: false })
    }
    const key = fs.readFileSync(KEY_FILE, 'utf8').trim()
    return NextResponse.json({ hasKey: !!key, source: 'file' })
  } catch (err) {
    console.error('GET key error', err)
    return NextResponse.json({ hasKey: false }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // If key is present in the environment, don't overwrite it with file storage.
    if (process.env.GEMINI_API_KEY) {
      return NextResponse.json({ ok: false, message: 'Key provided via environment; cannot overwrite.' }, { status: 400 })
    }

    const body = await request.json()
    const key = body?.key
    if (!key || typeof key !== 'string') {
      return NextResponse.json({ ok: false, message: 'Key missing' }, { status: 400 })
    }

    // Write key to a server-only file with restricted perms
    fs.writeFileSync(KEY_FILE, key, { mode: 0o600 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST key error', err)
    return NextResponse.json({ ok: false, message: String(err) }, { status: 500 })
  }
}
