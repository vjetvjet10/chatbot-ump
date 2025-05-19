import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from agents.faq_agent import search_faq

def test_faq():
    while True:
        user_query = input("👤 Câu hỏi: ")
        if user_query.strip().lower() in ['exit', 'quit']:
            break
        result = search_faq(user_query)
        if result:
            print(f"✅ Trả lời từ FAQ:\n{result}\n")
        else:
            print("❌ Không tìm thấy câu hỏi trong FAQ.\n")

if __name__ == "__main__":
    test_faq()
