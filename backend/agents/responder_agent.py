
# import json
# from openai import AsyncOpenAI
# from langchain_openai import OpenAIEmbeddings
# # Thêm dòng này vào đầu file agents/responder_agent.py
# from langchain_core.documents import Document

# # Các import khác của bạn (ví dụ: json, AsyncOpenAI, etc.)
# import json
# from openai import AsyncOpenAI
# from langchain_openai import OpenAIEmbeddings
# from sklearn.metrics.pairwise import cosine_similarity # Đảm bảo đã import
# import numpy as np # Đảm bảo đã import

# openai_client = AsyncOpenAI()
# embedding_model = OpenAIEmbeddings()  # Có thể bỏ nếu không dùng cosine

# # def build_prompt(query: str, docs: list, domain: str) -> str:
# #     intros = {
# #         "dao_tao": "Bạn là Chuyên gia Tuyển sinh của ĐH Y Dược TP.HCM.",
# #         "ctsv": "Bạn là Cố vấn Công tác Sinh viên của ĐH Y Dược TP.HCM."
# #     }
# #     intro = intros.get(domain, "Bạn là trợ lý AI chuyên tư vấn.")
# #     chunks = []
# #     for i, d in enumerate(docs, start=1):
# #         desc = d.metadata.get("description", d.metadata.get("type", ""))
# #         chunks.append(f"[Đoạn {i} | {desc}] {d.page_content}")
# #     context = "\n\n".join(chunks)
# #     return f"""{intro}

# # Các đoạn trích (văn bản, bảng, OCR) được cung cấp:
# # {context}

# # Câu hỏi: "{query}"

# # ❗ Hãy trích số liệu hoặc thông tin từ các đoạn trên và trả lời một cách khoa học, chính xác.
# # ❗ Hãy trả lời các ý chính cho người dùng mà không cần đưa ra các trích dẫn, các trích dẫn chỉ dùng cho mục đích highlight tài liệu tham khảo.
# # ❗ Không bôi đậm ký tự hay sử dụng markdown thô trong câu trả lời.
# # ❗ Nếu không có thông tin, hãy nói rõ và gợi ý người dùng tra cứu tiếp."""

# # async def generate_response(query: str, documents: list, websocket, domain: str, history: list = None) -> str:
# #     # ✅ Lọc các đoạn trích duy nhất
# #     seen = set()
# #     unique_docs = []
# #     for d in documents:
# #         c = d.page_content.strip()
# #         if c and c not in seen:
# #             seen.add(c)
# #             unique_docs.append(d)

# #     # ✅ Tạo prompt
# #     prompt = build_prompt(query, unique_docs, domain)
# #     await websocket.send_text(json.dumps({"stream": ""}))
# #     messages=[
# #     {"role": "system", "content": ""}]
# #     # {"role": "user", "content": prompt}
# #     # Nếu có history, nối vào
# #     if history:
# #         messages.extend(history)
# #     messages.append({"role": "user", "content": prompt})

# #     # ✅ Stream phản hồi từ GPT
    

# #     stream = await openai_client.chat.completions.create(
# #         model="gpt-4.1-mini",
# #         temperature=0,
# #         stream=True,
# #         max_tokens=700,
# #         messages=messages
# #     )

# #     full_answer = ""
# #     async for chunk in stream:
# #         tok = chunk.choices[0].delta.content
# #         if tok:
# #             full_answer += tok
# #             await websocket.send_text(json.dumps({"stream": tok}, ensure_ascii=False))

# #     # ✅ Kết thúc stream
# #     # await websocket.send_text(json.dumps({"stream": "[END]"}))
# #     # await websocket.send_text("[END]")

# #     # ✅ Trả về trực tiếp 3 đoạn đầu làm highlight
# #     highlights = [
# #         {
# #             # "source": d.metadata.get("source", "unknown"),
# #             "source": d.metadata.get("source", "").replace(".docx", ".pdf"),
# #             "highlight": d.page_content.strip()
# #         }
# #         for d in unique_docs[:100]
# #     ]

# #     # ✅ Gửi metadata (sau [END])
# #     # await websocket.send_text(json.dumps({
# #     #     "type": "metadata",
# #     #     "sources": highlights,
# #     #     "suggestions": []
# #     # }, ensure_ascii=False))

# #     return full_answer, highlights
# # Thay đổi hàm build_prompt (hoặc bỏ nếu không cần) và cách tạo messages

# async def generate_response(query: str, documents: list, websocket, domain: str, history: list = None) -> str:
#     # ✅ Lọc các đoạn trích duy nhất (giữ nguyên)
#     seen = set()
#     unique_docs = []
#     for d in documents:
#         c = d.page_content.strip()
#         if c and c not in seen:
#             seen.add(c)
#             unique_docs.append(d)

#     # ✅ Tạo Context String từ unique_docs (giữ nguyên)
#     chunks = []
#     for i, d in enumerate(unique_docs, start=1):
#         # Lấy metadata nguồn/loại tài liệu để dễ tham chiếu
#         source_ref = d.metadata.get("source", f"unknown_{i}").split('/')[-1] # Lấy tên file hoặc phần cuối URL
#         doc_type = d.metadata.get("type", "text") # Ví dụ: text, table, ocr
#         chunks.append(f"[Nguồn {i}: {source_ref} ({doc_type})]\n{d.page_content}")
#     context_string = "\n\n".join(chunks)

#     # ✅ --- TỐI ƯU PROMPT ---
#     # 1. System Message: Đặt hướng dẫn vai trò và quy tắc chung
#     system_prompt = f"""Bạn là trợ lý AI tư vấn của Đại học Y Dược TP.HCM. Nhiệm vụ của bạn là trả lời câu hỏi của người dùng dựa **chỉ** vào các đoạn trích thông tin được cung cấp trong mục CONTEXT.
# Hãy tuân thủ các quy tắc sau:
# - Trả lời bằng tiếng Việt, giọng văn trang trọng, lịch sự, chính xác.
# - Trích xuất thông tin, số liệu trực tiếp từ CONTEXT để trả lời.
# - KHÔNG thêm thông tin không có trong CONTEXT.
# - KHÔNG sử dụng markdown (in đậm, nghiêng, danh sách).
# - KHÔNG tự giới thiệu lại vai trò của mình.
# - Nếu CONTEXT không chứa thông tin để trả lời câu hỏi, hãy trả lời rõ ràng là "Thông tin này không có trong các tài liệu được cung cấp." và có thể gợi ý người dùng liên hệ bộ phận liên quan hoặc cung cấp thêm chi tiết.
# - KHÔNG tự ý đưa ra lời khuyên hoặc bình luận cá nhân."""

#     # 2. User Message Cuối Cùng: Đặt context và câu hỏi cụ thể
#     final_user_prompt = f"""CONTEXT:
# ---
# {context_string}
# ---

# Hãy trả lời câu hỏi sau đây dựa **chỉ** vào CONTEXT ở trên:
# Câu hỏi: "{query}"
# """

#     # 3. Xây dựng danh sách messages hoàn chỉnh
#     messages = [{"role": "system", "content": system_prompt}]
#     # Nối history (nếu có) vào sau system prompt và trước user prompt cuối cùng
#     if history:
#         # Đảm bảo history chỉ chứa các lượt user/assistant hợp lệ
#         valid_history = [m for m in history if m.get("role") in ["user", "assistant"] and m.get("content")]
#         messages.extend(valid_history)
#     # Thêm user prompt cuối cùng
#     messages.append({"role": "user", "content": final_user_prompt})
#     # --- KẾT THÚC TỐI ƯU PROMPT ---

#     # ✅ Stream phản hồi từ GPT (giữ nguyên phần gọi API)
#     await websocket.send_text(json.dumps({"stream": ""})) # Có thể bỏ dòng này nếu không cần thiết

#     stream = await openai_client.chat.completions.create(
#         model="gpt-4o-mini", # Cập nhật model nếu cần (ví dụ: gpt-4o-mini mới hơn)
#         temperature=0,
#         stream=True,
#         max_tokens=700, # Có thể điều chỉnh
#         messages=messages # Truyền messages đã xây dựng hoàn chỉnh
#     )

#     full_answer = ""
#     async for chunk in stream:
#         tok = chunk.choices[0].delta.content
#         if tok:
#             full_answer += tok
#             await websocket.send_text(json.dumps({"stream": tok}, ensure_ascii=False))

#     # ✅ Tạo highlights (Xem phần tối ưu highlights bên dưới)
#     highlights = create_highlights(unique_docs, full_answer) # Gọi hàm tạo highlights mới

#     return full_answer, highlights

# # --- Hàm tạo highlights (Cần thêm vào file) ---
# from sklearn.metrics.pairwise import cosine_similarity
# import numpy as np

# # Khởi tạo embedding model ở ngoài để tái sử dụng
# # embedding_model = OpenAIEmbeddings() # Bạn đã có dòng này rồi

# def embed_texts(texts: list[str]) -> np.ndarray:
#     """Hàm helper để lấy embeddings cho danh sách các đoạn text"""
#     embeddings = embedding_model.embed_documents(texts)
#     return np.array(embeddings)

# def create_highlights(docs: list[Document], answer: str, top_n: int = 3) -> list[dict]:
#     """
#     Tạo highlights dựa trên độ tương đồng cosine giữa câu trả lời và các tài liệu gốc.
#     """
#     if not docs or not answer:
#         return []

#     doc_contents = [d.page_content.strip() for d in docs]

#     try:
#         # Lấy embedding cho câu trả lời và các tài liệu
#         answer_embedding = np.array(embedding_model.embed_query(answer)).reshape(1, -1)
#         doc_embeddings = embed_texts(doc_contents)

#         # Tính cosine similarity
#         similarities = cosine_similarity(answer_embedding, doc_embeddings)[0]

#         # Lấy chỉ số của top_n tài liệu tương đồng nhất
#         # Argsort trả về chỉ số từ thấp đến cao -> lấy từ cuối với [::-1]
#         sorted_indices = np.argsort(similarities)[::-1]
#         top_indices = sorted_indices[:top_n]

#         # Tạo danh sách highlights từ các tài liệu tương đồng nhất
#         highlights = [
#             {
#                 "source": docs[i].metadata.get("source", "unknown").replace(".docx", ".pdf"),
#                 "highlight": docs[i].page_content.strip()
#             }
#             for i in top_indices
#             # Chỉ lấy nếu similarity đủ lớn (tùy chọn, ví dụ > 0.7)
#             # if similarities[i] > 0.7
#         ]
#         return highlights

#     except Exception as e:
#         print(f"❌ Lỗi khi tạo highlights bằng embedding: {e}")
#         # Fallback: Lấy N tài liệu đầu tiên nếu có lỗi
#         return [
#             {
#                 "source": d.metadata.get("source", "unknown").replace(".docx", ".pdf"),
#                 "highlight": d.page_content.strip()
#             }
#             for d in docs[:top_n]
#         ]

import json
from openai import AsyncOpenAI
# Vẫn giữ OpenAIEmbeddings nếu bạn dùng nó ở bước truy xuất tài liệu (retrieval)
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
# import numpy as np # Không cần cho Cách 1 highlight
# from sklearn.metrics.pairwise import cosine_similarity # Không cần cho Cách 1 highlight

openai_client = AsyncOpenAI()
# Vẫn khởi tạo embedding_model nếu cần cho retrieval, nếu không thì có thể bỏ
# embedding_model = OpenAIEmbeddings()

# Định nghĩa hàm generate_response
async def generate_response(query: str, documents: list[Document], websocket, domain: str, history: list = None) -> tuple[str, list[dict]]: # Thêm type hint cho giá trị trả về
    # ✅ Lọc các đoạn trích duy nhất (giữ nguyên)
    seen = set()
    unique_docs = []
    for d in documents:
        c = d.page_content.strip()
        if c and c not in seen:
            seen.add(c)
            unique_docs.append(d)

    # ✅ Tạo Context String từ unique_docs (giữ nguyên)
    chunks = []
    for i, d in enumerate(unique_docs, start=1):
        source_ref = d.metadata.get("source", f"unknown_{i}").split('/')[-1]
        doc_type = d.metadata.get("type", "text")
        chunks.append(f"[Nguồn {i}: {source_ref} ({doc_type})]\n{d.page_content}")
    context_string = "\n\n".join(chunks)
# - KHÔNG sử dụng markdown (in đậm, nghiêng, danh sách).
    # ✅ --- PROMPT (Giữ nguyên cấu trúc đã tối ưu) ---
    system_prompt = f"""Bạn là trợ lý AI tư vấn của Đại học Y Dược TP.HCM. Nhiệm vụ của bạn là trả lời câu hỏi của người dùng dựa **chỉ** vào các đoạn trích thông tin được cung cấp trong mục CONTEXT.
Hãy tuân thủ các quy tắc sau:
- Trả lời bằng tiếng Việt, giọng văn trang trọng, lịch sự, chính xác.
- Trích xuất thông tin, số liệu trực tiếp từ CONTEXT để trả lời.
- KHÔNG thêm thông tin không có trong CONTEXT.

- KHÔNG tự giới thiệu lại vai trò của mình.
- Nếu CONTEXT không chứa thông tin để trả lời câu hỏi, hãy trả lời rõ ràng là "Thông tin này không có trong các tài liệu được cung cấp." và có thể gợi ý người dùng liên hệ bộ phận liên quan hoặc cung cấp thêm chi tiết.
- KHÔNG tự ý đưa ra lời khuyên hoặc bình luận cá nhân."""

    final_user_prompt = f"""CONTEXT:
---
{context_string}
---

Hãy trả lời câu hỏi sau đây dựa **chỉ** vào CONTEXT ở trên:
Câu hỏi: "{query}"
Cuối mỗi câu trả lời hãy xuống dòng và thêm nội dung sau: "Lưu ý: Chatbot có thể sai sót. Thông tin quan trọng vui lòng đối chiếu tài liệu gốc, trang web www.ump.edu.vn hoặc liên hệ trực tiếp Đại học Y Dược TPHCM!".
"""

    messages = [{"role": "system", "content": system_prompt}]
    if history:
        valid_history = [m for m in history if m.get("role") in ["user", "assistant"] and m.get("content")]
        messages.extend(valid_history)
    messages.append({"role": "user", "content": final_user_prompt})
    # --- KẾT THÚC PROMPT ---

    # ✅ Stream phản hồi từ GPT (giữ nguyên)
    # await websocket.send_text(json.dumps({"stream": ""})) # Dòng này có thể không cần thiết

    stream = await openai_client.chat.completions.create(
        model="gpt-4o-mini", # Hoặc model bạn chọn
        temperature=0,
        stream=True,
        max_tokens=700,
        messages=messages
    )

    full_answer = ""
    async for chunk in stream:
        tok = chunk.choices[0].delta.content
        if tok:
            full_answer += tok
            await websocket.send_text(json.dumps({"stream": tok}, ensure_ascii=False))

    # ✅ --- TẠO HIGHLIGHTS THEO CÁCH 1 ---
    # Lấy N tài liệu đầu tiên trong danh sách unique_docs làm highlights
    HIGHLIGHT_COUNT = 30 # Đặt số lượng highlight mong muốn (ví dụ: 3)

    highlights = [
        {
            "source": d.metadata.get("source", "unknown").replace(".docx", ".pdf"),
            "highlight": d.page_content.strip()
        }
        # Sử dụng slicing để lấy N phần tử đầu tiên
        for d in unique_docs[:HIGHLIGHT_COUNT]
    ]
    # --- KẾT THÚC TẠO HIGHLIGHTS ---

    # Trả về câu trả lời đầy đủ và danh sách highlights đã chọn
    return full_answer, highlights

# --- CÁC HÀM ĐÃ XÓA HOẶC KHÔNG DÙNG CHO CÁCH 1 ---
# def embed_texts(texts: list[str]) -> np.ndarray:
#     ... (Đã xóa)

# def create_highlights(docs: list[Document], answer: str, top_n: int = 3) -> list[dict]:
#     ... (Đã xóa)
# --- KẾT THÚC PHẦN XÓA ---