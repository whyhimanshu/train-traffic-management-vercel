"use client"

import useSWR from "swr"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"

type Settings = {
  headwayTargetMin: number
  maxSpeedKmph: number
  optimizationMode: "balanced" | "throughput" | "punctuality"
}

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export default function SettingsForm() {
  const { data, isLoading, mutate } = useSWR<{ settings: Settings }>("/api/settings", fetcher)
  const s = data?.settings
  const [form, setForm] = useState<Settings>({
    headwayTargetMin: s?.headwayTargetMin ?? 7,
    maxSpeedKmph: s?.maxSpeedKmph ?? 110,
    optimizationMode: s?.optimizationMode ?? "balanced",
  })

  const [hasGeminiKey, setHasGeminiKey] = useState<boolean | null>(null)
  const [geminiKeyInput, setGeminiKeyInput] = useState('')
  const [geminiResponse, setGeminiResponse] = useState<string | null>(null)
  const [geminiModel, setGeminiModel] = useState<string | null>(null)
  const [modelInput, setModelInput] = useState('gemini-1.5-flash')

  useEffect(() => {
    // fetch whether server has a key configured
    fetch('/api/gemini/key').then((r) => r.json()).then((j) => setHasGeminiKey(!!j?.hasKey)).catch(() => setHasGeminiKey(false))
  // fetch current model (if configured)
  fetch('/api/gemini/model').then((r) => r.json()).then((j) => setGeminiModel(j?.model ?? null)).catch(() => setGeminiModel(null))
  }, [])

  // Keep form in sync once data arrives
  if (
    s &&
    (form.headwayTargetMin !== s.headwayTargetMin ||
      form.maxSpeedKmph !== s.maxSpeedKmph ||
      form.optimizationMode !== s.optimizationMode)
  ) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    setForm(s)
  }

  async function save() {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      await mutate()
    }
  }

  async function saveGeminiKey() {
    const res = await fetch('/api/gemini/key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: geminiKeyInput }),
    })
    if (res.ok) {
      setHasGeminiKey(true)
      setGeminiKeyInput('')
    }
  }

  async function testGemini() {
    setGeminiResponse(null)
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Say hello from Gemini' }),
    })
    const text = await res.text()
    setGeminiResponse(text)
  }

  if (isLoading) return <div>Loading settings…</div>

  return (
    <div className="rounded border p-4 grid gap-4 max-w-xl">
      <label className="grid gap-1">
        <span className="text-sm text-muted-foreground">Headway target (min)</span>
        <input
          type="number"
          className="border rounded px-3 py-2 bg-background"
          value={form.headwayTargetMin}
          onChange={(e) => setForm((f) => ({ ...f, headwayTargetMin: Number(e.target.value) }))}
          min={2}
          max={30}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-sm text-muted-foreground">Max speed (km/h)</span>
        <input
          type="number"
          className="border rounded px-3 py-2 bg-background"
          value={form.maxSpeedKmph}
          onChange={(e) => setForm((f) => ({ ...f, maxSpeedKmph: Number(e.target.value) }))}
          min={40}
          max={200}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-sm text-muted-foreground">Optimization mode</span>
        <select
          className="border rounded px-3 py-2 bg-background"
          value={form.optimizationMode}
          onChange={(e) => setForm((f) => ({ ...f, optimizationMode: e.target.value as Settings["optimizationMode"] }))}
        >
          <option value="balanced">Balanced</option>
          <option value="throughput">Throughput</option>
          <option value="punctuality">Punctuality</option>
        </select>
      </label>
      <div className="flex justify-end">
        <Button onClick={save}>Save Settings</Button>
      </div>

      <div className="pt-4 border-t mt-4">
        <h3 className="text-sm font-medium">Gemini API</h3>
        <p className="text-xs text-muted-foreground mb-2">Configure an API key for Google Gemini (server-side). The key is stored on the server only.</p>
        <div className="grid gap-2">
          <div className="flex gap-2">
            <input
              type="password"
              placeholder={hasGeminiKey ? 'Key configured' : 'Enter Gemini API key'}
              value={geminiKeyInput}
              onChange={(e) => setGeminiKeyInput(e.target.value)}
              className="border rounded px-3 py-2 bg-background flex-1"
            />
            <Button onClick={saveGeminiKey} disabled={!geminiKeyInput}>Save Key</Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={testGemini} disabled={!hasGeminiKey}>Test Gemini</Button>
            {hasGeminiKey === null ? <span>Checking key…</span> : hasGeminiKey ? <span className="text-green-600">Key configured</span> : <span className="text-red-600">No key</span>}
          </div>
          <div className="mt-2">
            <label className="text-xs">Gemini model</label>
            <div className="flex gap-2 mt-1">
              <input value={modelInput} onChange={(e) => setModelInput(e.target.value)} className="border rounded px-3 py-2 bg-background flex-1" />
              <Button onClick={async () => {
                const res = await fetch('/api/gemini/model', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: modelInput }) })
                if (res.ok) setGeminiModel(modelInput)
              }} disabled={!modelInput}>Save Model</Button>
            </div>
            <div className="text-xs mt-1">Current model: {geminiModel ?? 'not configured'}</div>
          </div>
          {geminiResponse ? (
            <pre className="mt-2 p-2 bg-muted text-xs whitespace-pre-wrap">{geminiResponse}</pre>
          ) : null}
        </div>
      </div>
    </div>
  )
}
