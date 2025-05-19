# from agents.router_agent import route_query
# from agents.faq_agent import search_faq
# from agents.retriever_agent import retrieve_documents
# from agents.responder_agent import generate_response
# from agents.followup_agent import suggest_followups
# # from agents.document_agent import process_all_documents
# import json
# import asyncio
# async def query_pipeline(user_query: str, websocket) -> dict:
#     # Ưu tiên tìm trong FAQ
#     answer = search_faq(user_query)
#     if answer:
#         for token in answer:
#             await websocket.send_text(json.dumps({"stream":token}, ensure_ascii=False))
#             await asyncio.sleep(0.01) #giả lập delay nhỏ
#             await websocket.send_text("[END]")
#         # return {
#         #     "answer": answer,
#         #     "sources": [{"source": "faq.xlsx", "highlight": answer}],
#         #     "suggestions": []
#         # }
#         return {
#     "sources": [{"source": "faq.xlsx", "highlight": answer}],
#     "suggestions": []
# }

#     # Tuỳ chọn: nạp lại tài liệu nếu cần
#     # process_all_documents()
#     # run_document_processing
#     # 2) Xác định domain: dao_tao hoặc ctsv
#     domain = route_query(user_query)
#     print(f"🧠 DOMAIN: {domain}")

#     # 3) Lấy tài liệu liên quan
#     docs = retrieve_documents(user_query, domain)
#     print(f"📄 DOCS RETRIEVED: {len(docs)}")

#     # 4) Gọi generate_response với đủ 4 arg
#     answer = await generate_response(user_query, docs, websocket, domain)
#     print(f"📬 ANSWER: {answer}")

#     # 5) Gợi ý follow‑up
#     suggestions = suggest_followups(user_query, answer, domain)

#     # return {
#     #     # "answer": answer,
#     #     "sources": [doc.metadata for doc in docs],
#     #     "suggestions": suggestions
#     # }
#         # ✅ Sau khi stream xong, chỉ gửi lại sources/suggestions (không gửi lại answer)
#     await websocket.send_text(json.dumps({
#         "type": "metadata",
#         "sources": [doc.metadata for doc in docs],
#         "suggestions": suggestions
#     }, ensure_ascii=False))

#     return {}
from langchain_core.documents import Document
from agents.router_agent import route_query
from agents.faq_agent import search_faq
from agents.retriever_agent import retrieve_documents
from agents.responder_agent import generate_response
from agents.followup_agent import suggest_followups
import json
import asyncio
from agents.web_search_agent import search_google_ump, extract_text_from_url
def truncate_docs(docs, max_tokens=4000):
    result = []
    total_tokens = 0
    for d in docs:
        tokens = len(d.page_content) // 4  # xấp xỉ
        if total_tokens + tokens > max_tokens:
            break
        result.append(d)
        total_tokens += tokens
    return result
def needs_fallback(answer: str) -> bool:
    """Phát hiện câu trả lời quá chung chung / không có dữ liệu"""
    signals = [
        "không có số liệu", "chưa có số liệu", "không tìm thấy", "vui lòng tra cứu", "không rõ", 
        "chưa có thông tin", "không có thông tin","dữ liệu","trong các đoạn trích","không có trong các tài liệu được cung cấp"
    ]
    return any(kw in answer.lower() for kw in signals)


async def fallback_web_search(query: str) -> list[str]:
    urls = search_google_ump(query)
    docs = [extract_text_from_url(url) for url in urls]
    return docs
async def query_pipeline(user_query: str, websocket, history: list = None) -> dict:
    answer = search_faq(user_query)
    if answer:
        for token in answer:
            await websocket.send_text(json.dumps({"stream":token}, ensure_ascii=False))
            await asyncio.sleep(0.01)
        await websocket.send_text("[END]")
        return {
            "sources": [{"source": "faq.xlsx", "highlight": answer}],
            "suggestions": []
        }

    domain = route_query(user_query)
    print(f"🧠 DOMAIN: {domain}")

    docs = retrieve_documents(user_query, domain)
    print(f"📄 DOCS RETRIEVED: {len(docs)}")

    answer, highlights = await generate_response(user_query, docs, websocket, domain, history)
    # answer, = await generate_response(user_query, docs, websocket, domain)
    print(f"📬 ANSWER (Internal): {answer}")
    # 5️⃣ Nếu câu trả lời không chứa thông tin → fallback web
    if needs_fallback(answer):
        print("⚠️ Trả lời không đủ thông tin → fallback web")
            # ✅ Gửi tín hiệu clear cho frontend trước khi bắt đầu search
        await websocket.send_text(json.dumps({"type": "replace_ai_message","new_answer": ""}, ensure_ascii=False))
        urls = search_google_ump(user_query)
        web_docs = []
        for url in urls:
            text = extract_text_from_url(url)
            if text:
                web_docs.append(Document(page_content=text, metadata={"source": url}))
        if web_docs:
            web_docs = truncate_docs(web_docs, max_tokens=3000)
        answer, highlights = await generate_response(user_query, web_docs, websocket, domain, history)
    # answer, = await generate_response(user_query, docs, websocket, domain)
        print(f"📬 ANSWER: {answer}")
                    # 👉 Gửi lại câu trả lời đã cập nhật từ web
        await websocket.send_text(json.dumps({
            "type": "replace_ai_message",
            "new_answer": answer
        }, ensure_ascii=False))

        # ✅ Step 3: Sau tất cả, gửi [END]
    await websocket.send_text("[END]")
    suggestions = suggest_followups(user_query, answer, domain)

    await websocket.send_text(json.dumps({
        "type": "metadata",
        "sources": highlights,
        "suggestions": suggestions
    }, ensure_ascii=False))

    return {}



