from openai import OpenAI

client = OpenAI()

def suggest_followups(query: str, answer: str, domain: str = "") -> list[str]:
    system_prompt = (
        "Bạn là một trợ lý tuyển sinh thông minh. "
        "Nhiệm vụ của bạn là gợi ý 3 câu hỏi tiếp theo người dùng có thể hỏi, "
        "dựa trên nội dung câu hỏi và câu trả lời trước đó.\n\n"
        "Các gợi ý nên:\n"
        "_Liên quan đến Đại học y dược Thành phố Hồ Chí Minh"
        "- Liên quan đến nội dung câu hỏi hoặc phần trả lời\n"
        "- Dạng tự nhiên, dễ hiểu, phù hợp với học sinh\n"
        "- Viết ngắn gọn, không giải thích kèm theo\n\n"
        "Trả kết quả dạng JSON list (không thêm văn bản khác).\n"
        "Ví dụ:\n[\"Câu hỏi 1\", \"Câu hỏi 2\", \"Câu hỏi 3\"]"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Câu hỏi gốc: {query}\n\nCâu trả lời: {answer}"}
    ]

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-nano",
            messages=messages,
            temperature=0
        )
        content = response.choices[0].message.content.strip()
        suggestions = eval(content) if content.startswith("[") else []
        return suggestions
    except Exception as e:
        print(f"⚠️ Lỗi suggest_followups: {e}")
        return []

