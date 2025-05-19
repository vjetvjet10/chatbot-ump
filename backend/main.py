from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pipeline import query_pipeline # Giả sử pipeline.py chứa query_pipeline
import json
import uvicorn
import google.generativeai as genai
from agents.voice_agent import recognize_audio # Giả sử voice_agent.py chứa recognize_audio

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Trong production nên giới hạn lại ['http://your-frontend-domain.com']
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    while True:
        try:
            # 📥 Nhận dữ liệu
            message = await websocket.receive()

            # 📥 Nếu là text (query từ người dùng gõ hoặc từ frontend gửi lại sau khi nhận dạng giọng nói)
            if message["type"] == "websocket.receive" and "text" in message:
                try:
                    data = json.loads(message["text"])
                except json.JSONDecodeError:
                    print(f"⚠️ Received invalid JSON text: {message['text']}")
                    await websocket.send_text(json.dumps({"error": "Invalid JSON format received."}))
                    continue # Chờ message tiếp theo

                # Trường hợp text thông thường (có key "query")
                if isinstance(data, dict) and data.get("query"):
                    query = data["query"]
                    history = data.get("history", []) # Lấy history từ frontend gửi lên
                    print(f"📝 Text query received: '{query}' | History items: {len(history)}")

                    # Gọi query_pipeline để xử lý và stream câu trả lời
                    # query_pipeline sẽ tự xử lý việc gửi stream, metadata, [END] qua websocket
                    await query_pipeline(query, websocket, history=history)
                    print(f"✅ Pipeline finished for query: '{query}'")

                else:
                    # Có thể nhận các loại text message khác, cần xử lý nếu có
                    print(f"⚠️ Received text message without 'query' key or not a dict: {data}")
                    # Không nên báo lỗi nếu không chắc chắn, có thể là message hệ thống khác
                    # await websocket.send_text(json.dumps({"error": "Invalid text format, expected JSON with 'query' key."}))

            # 📥 Nếu là binary (audio file)
            elif message["type"] == "websocket.receive" and "bytes" in message:
                audio_bytes = message["bytes"]
                print(f"🎙️ Audio received ({len(audio_bytes)} bytes)")

                # 🧠 Chuyển audio thành text bằng Gemini Flash
                recognized_text = await recognize_audio(audio_bytes)
                print(f"🧠 Recognized text: '{recognized_text}'")

                # --- FIX ---
                # 1. GỬI NGAY KẾT QUẢ NHẬN DẠNG VỀ FRONTEND
                # Frontend sẽ dùng text này để cập nhật ô input VÀ tự động gửi lại như một query mới (theo Luồng A)
                await websocket.send_text(json.dumps({
                    "type": "recognized_text",
                    "text": recognized_text or "" # Gửi chuỗi rỗng nếu không nhận dạng được gì
                }, ensure_ascii=False))
                print(f"✅ Sent recognized text back to frontend.")

                # 2. KHÔNG GỌI query_pipeline Ở ĐÂY NỮA
                # Vì frontend (theo Luồng A) sẽ gửi lại query này qua kênh text message.
                # Tránh việc xử lý query 2 lần.
                # --- END FIX ---

            # Xử lý websocket đóng từ client
            elif message["type"] == "websocket.disconnect":
                print(f"🔌 WebSocket disconnected: {message.get('code')}")
                break # Thoát vòng lặp

            else:
                # Các loại message khác không xử lý
                print(f"⚠️ Unsupported message type received: {message['type']}")


        except WebSocketDisconnect: # Bắt lỗi client ngắt kết nối đột ngột
             print(f"🔌 WebSocket client disconnected abruptly.")
             break
        except Exception as e:
            error_message = f"An error occurred: {str(e)}"
            print(f"❌ {error_message}")
            try:
                # Cố gắng gửi lỗi về client trước khi đóng
                await websocket.send_text(json.dumps({"error": error_message}))
                # Đóng kết nối một cách chủ động từ server khi có lỗi nghiêm trọng
                await websocket.close(code=1011) # Internal Error
            except Exception as close_err:
                # Nếu gửi lỗi hoặc đóng cũng bị lỗi thì chỉ cần ghi log
                 print(f"❌ Error sending error/closing WebSocket: {close_err}")
            break # Thoát vòng lặp khi có lỗi

    print("WebSocket connection closed.")


# Thêm thư viện cần thiết nếu chưa có
from starlette.websockets import WebSocketDisconnect

# ✅ Hàm khởi chạy app FastAPI
if __name__ == "__main__":
    # Nhớ cài đặt: pip install uvicorn fastapi[all] google-generativeai python-dotenv
    # Cần tạo file .env hoặc đặt biến môi trường GOOGLE_API_KEY
    # Hoặc thay trực tiếp genai.configure(api_key="YOUR_API_KEY") ở trên
    print("Starting FastAPI server...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

