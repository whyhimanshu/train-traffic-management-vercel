import { generateText } from "ai"

export async function POST(req: Request) {
  const { mode, context } = await req.json().catch(() => ({ mode: "recommendations", context: {} }))

  // Craft prompt based on mode
  const prompt =
    mode === "scenario"
      ? [
          "You are an expert railway traffic optimization assistant.",
          "Propose a single new optimization scenario for the next 30 minutes.",
          "Return STRICT JSON with keys: name (string), description (string).",
          "No prose. JSON only.",
          context?.hint ? `Context: ${context.hint}` : "",
        ].join("\n")
      : [
          "You are an expert railway traffic optimization assistant.",
          "Given current recommendations and statuses, produce a concise optimization plan:",
          "- Mention precedence changes, platform reallocations, and any holds/crossings.",
          "- Keep it brief with actionable steps (3-7 bullet points).",
          context?.recommendations ? `Context JSON: ${JSON.stringify(context.recommendations).slice(0, 4000)}` : "",
        ].join("\n")

  // Always use Gemini if GEMINI_API_KEY is present, else fallback
  let text = ""
  let usedGemini = false
  let errorMsg = null
  try {
    if (process.env.GEMINI_API_KEY) {
      // Use latest Gemini model and endpoint
  const endpoint = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent"
      const res = await fetch(`${endpoint}?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: mode === "scenario" ? 0.2 : 0.5,
            maxOutputTokens: 600,
          },
        }),
      })

      if (!res.ok) {
        let msg = `Gemini error: ${res.status}`
        if (res.status === 404) msg += ' (model not found or not enabled for your API key)'
        errorMsg = msg
        throw new Error(errorMsg)
      }
      const json = await res.json()
      text =
        json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join("") ||
        json?.candidates?.[0]?.content?.parts?.[0]?.text ||
        ""
      usedGemini = true
    } else {
      // Use fallback (Vercel AI SDK or local)
      const { text: sdkText } = await generateText({
        model: "openai/gpt-5-mini",
        prompt,
        maxOutputTokens: 600,
        temperature: mode === "scenario" ? 0.2 : 0.5,
      })
      text = sdkText
    }
  } catch (e) {
    if (process.env.GEMINI_API_KEY) {
      // If Gemini key is present but call failed, return error to client
      return Response.json({ text: "", scenario: null, error: errorMsg || (e as Error).message, usedGemini: true }, { status: 500 })
    }
    // Fallback only if no Gemini key
    if (mode === "scenario") {
      text = JSON.stringify(
        {
          name: "Stagger local departures at Jaipur Junction",
          description:
            "Hold selected local departures by 2–3 minutes to deconflict crossings with express movements and reduce cascading delays on Platforms 1–4.",
        },
        null,
        2,
      )
    } else {
      text = [
        "• Reassign Platform 3 to Express 12951; clear arriving local to Platform 5.",
        "• Hold two low-priority locals by 2–3 minutes to smooth peak flow.",
        "• Route freight via outer loop to free the main line near Jaipur Junction.",
        "• Synchronize crossings at Phulera to avoid back-to-back signal holds.",
      ].join("\n")
    }
  }

  let scenario: { name: string; description?: string } | null = null
  if (mode === "scenario" && text) {
    try {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) scenario = JSON.parse(match[0])
    } catch {
      scenario = null
    }
  }

  return Response.json({ text, scenario, usedGemini, error: errorMsg })
}
