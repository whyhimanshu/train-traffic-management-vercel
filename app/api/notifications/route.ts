import type { NextRequest } from "next/server"

type Notification = {
  id: string
  title: string
  body: string
  time: string
  unread: boolean
}

// Module-level in-memory store (sufficient for preview)
let notifications: Notification[] = [
  { id: "1", title: "Delay Alert", body: "Train 12988 running 12 min late", time: "2 min ago", unread: true },
  { id: "2", title: "Platform Conflict", body: "Track 3 occupancy extended by 4 min", time: "8 min ago", unread: true },
  { id: "3", title: "Maintenance Note", body: "Signal 14 serviced successfully", time: "22 min ago", unread: false },
]

export async function GET() {
  return Response.json(notifications)
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json()
    if (action === "markAllRead") {
      notifications = notifications.map((n) => ({ ...n, unread: false }))
      return Response.json({ ok: true })
    }
    if (action === "clear") {
      notifications = []
      return Response.json({ ok: true })
    }
    if (action === "seed") {
      notifications = [
        { id: "1", title: "Delay Alert", body: "Train 12988 running 12 min late", time: "2 min ago", unread: true },
        {
          id: "2",
          title: "Platform Conflict",
          body: "Track 3 occupancy extended by 4 min",
          time: "8 min ago",
          unread: true,
        },
        {
          id: "3",
          title: "Maintenance Note",
          body: "Signal 14 serviced successfully",
          time: "22 min ago",
          unread: false,
        },
      ]
      return Response.json({ ok: true })
    }
    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 })
  } catch (e) {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 })
  }
}
