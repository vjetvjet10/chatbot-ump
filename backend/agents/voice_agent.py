# from dotenv import load_dotenv
# import google.generativeai as genai
# import os
# load_dotenv()

# GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
# GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")

# genai.configure(api_key=GOOGLE_API_KEY)

# async def recognize_audio(audio_bytes: bytes) -> str:
#     model = genai.GenerativeModel('gemini-1.5-flash')  # hoặc gemini-2.0-flash

#     response = await model.generate_content_async([
#         {
#             "mime_type": "audio/webm",  # hoặc audio/mpeg tuỳ định dạng ghi âm
#             "data": audio_bytes
#         },
#         {
#             "text": "Trả lời nội dung người dùng vừa nói một cách ngắn gọn và chính xác bằng tiếng Việt."
#         }
#     ])

#     return response.text.strip()
from dotenv import load_dotenv
import google.generativeai as genai
import os

load_dotenv()

# Lấy API Key từ biến môi trường hoặc file .env
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
# GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID") # Biến này có vẻ không dùng ở đây

# Kiểm tra xem API Key có được load không
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables or .env file.")

genai.configure(api_key=GOOGLE_API_KEY)

async def recognize_audio(audio_bytes: bytes) -> str:
    """
    Sử dụng Gemini để chuyển đổi audio bytes thành văn bản tiếng Việt.
    """
    # Sử dụng model có khả năng xử lý audio
    model = genai.GenerativeModel('gemini-2.0-flash') # Đảm bảo model này hỗ trợ input audio

    try:
        # --- SỬA LỖI: Thay đổi prompt ---
        # Yêu cầu model thực hiện transcription thay vì trả lời
        # prompt_text = "Transcribe the following audio to Vietnamese text:"
        prompt_text = "Chuyển đổi âm thanh này thành văn bản tiếng Việt:"

        response = await model.generate_content_async(
            [
                # Gửi prompt yêu cầu transcription
                prompt_text,
                # Gửi dữ liệu audio
                {
                    "mime_type": "audio/webm",  # Đảm bảo đúng định dạng file ghi âm (ví dụ: audio/wav, audio/mp3, audio/ogg nếu khác)
                    "data": audio_bytes
                }
                # Không gửi prompt yêu cầu "Trả lời..." nữa
            ],
            # Cân nhắc thêm cấu hình an toàn nếu cần
            # safety_settings={'HARASSMENT':'block_none', 'HATE_SPEECH': 'block_none', 'SEXUAL': 'block_none', 'DANGEROUS': 'block_none'}
        )
        # --- KẾT THÚC SỬA LỖI ---

        # Trích xuất và trả về văn bản đã nhận dạng
        # Kiểm tra cấu trúc response để lấy text an toàn hơn
        if hasattr(response, 'text'):
            return response.text.strip()
        elif hasattr(response, 'parts') and response.parts:
             # Đôi khi text nằm trong response.parts
             transcribed_text = "".join(part.text for part in response.parts if hasattr(part, 'text'))
             return transcribed_text.strip()
        else:
             print(f"⚠️ recognize_audio: Không tìm thấy text trong response từ Gemini: {response}")
             return "" # Trả về chuỗi rỗng nếu không có text

    except Exception as e:
        # Ghi log lỗi chi tiết hơn
        print(f"❌ Lỗi trong quá trình nhận dạng giọng nói với Gemini: {e}")
        # Có thể raise lỗi hoặc trả về chuỗi rỗng tùy theo cách bạn muốn xử lý lỗi
        return "" # Trả về chuỗi rỗng khi có lỗi

# Ví dụ kiểm tra hàm (chạy file này trực tiếp)
# async def main_test():
#     try:
#         # Đọc file audio mẫu để test (thay đường dẫn file của bạn)
#         with open("path/to/your/test_audio.webm", "rb") as f:
#             audio_data = f.read()
#         text = await recognize_audio(audio_data)
#         print("="*20)
#         print("Recognized Text:")
#         print(text)
#         print("="*20)
#     except FileNotFoundError:
#         print("Lỗi: Không tìm thấy file audio mẫu để test.")
#     except Exception as e:
#         print(f"Lỗi khi chạy test: {e}")

# if __name__ == "__main__":
#     import asyncio
#     asyncio.run(main_test())