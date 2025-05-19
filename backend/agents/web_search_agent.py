import requests, os
from bs4 import BeautifulSoup
from dotenv import load_dotenv
load_dotenv()
# GOOGLE_API_KEY = "YOUR_API_KEY"
# GOOGLE_CSE_ID = "YOUR_CSE_ID"
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")
def search_google_ump(query: str, num_results=3) -> list[str]:
    """Tìm kiếm trên Google nhưng giới hạn trong trang ump.edu.vn"""
    params = {
        'q': f"site:ump.edu.vn {query}",
        'cx': GOOGLE_CSE_ID,
        'key': GOOGLE_API_KEY,
        'num': num_results,
    }
    response = requests.get("https://www.googleapis.com/customsearch/v1", params=params)
    items = response.json().get("items", [])
    return [item['link'] for item in items]


def extract_text_from_url(url: str) -> str:
    """Cào nội dung chính từ trang web"""
    try:
        html = requests.get(url, timeout=5).text
        soup = BeautifulSoup(html, 'html.parser')
        # Loại bỏ script/style
        for tag in soup(['script', 'style']):
            tag.decompose()
        text = soup.get_text(separator='\n')
        return text.strip()
    except Exception as e:
        print(f"❌ Lỗi khi đọc {url}: {e}")
        return ""
