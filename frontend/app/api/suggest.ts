// /pages/api/suggest.ts
import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(req: NextRequest) {
  const { history, user_input } = await req.json()

  const prompt = `
Bạn là trợ lý tư vấn tuyển sinh. Dựa vào câu hỏi sau:
"${user_input}"

Và lịch sử hội thoại (nếu có), hãy gợi ý 3 câu hỏi liên quan mà người dùng có thể quan tâm.
Trả kết quả dạng JSON: ["...", "...", "..."]
  `

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7
  })

  const raw = completion.choices[0].message.content || "[]"
  const suggestions = JSON.parse(raw)

  return NextResponse.json({ suggestions })
}
