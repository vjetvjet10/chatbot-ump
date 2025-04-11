// app/api/chat/stream/route.ts
export const dynamic = 'force-dynamic' // 👈 Bắt buộc với stream

export async function POST(req: Request) {
  const body = await req.json()

  const response = await fetch("http://localhost:8000/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!response.body) {
    return new Response("No response body from backend", { status: 500 })
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
