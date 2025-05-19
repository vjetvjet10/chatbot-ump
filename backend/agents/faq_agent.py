import pandas as pd
import os

faq_path = "data/faq.xlsx"

# def load_faq():
#     if not os.path.exists(faq_path):
#         return {}
#     df = pd.read_excel(faq_path)
#     return {str(row["Câu hỏi"]).strip(): str(row["Trả lời"]).strip() for _, row in df.iterrows()}
def load_faq():
    if not os.path.exists(faq_path):
        print("⚠️ Không tìm thấy file FAQ.")
        return {}
    df = pd.read_excel(faq_path)
    return {str(row["Câu hỏi"]).strip(): str(row["Câu trả lời"]).strip() for _, row in df.iterrows()}

faq_dict = load_faq()

from difflib import get_close_matches

# def search_faq(user_query: str):
#     matches = get_close_matches(user_query, faq_dict.keys(), n=1, cutoff=0.85)
#     if matches:
#         return faq_dict[matches[0]]
#     return None
from rapidfuzz import fuzz, process
import unicodedata
import re

def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("utf-8")  # bỏ dấu
    text = re.sub(r"[^\w\s]", "", text)  # bỏ ký tự đặc biệt
    return text.lower().strip()

def search_faq(user_query: str):
    normalized_query = normalize(user_query)
    candidates = {normalize(q): q for q in faq_dict.keys()}
    best_match = process.extractOne(
        normalized_query,
        candidates.keys(),
        scorer=fuzz.token_set_ratio
    )

    if best_match and best_match[1] > 75:
        original_question = candidates[best_match[0]]
        return faq_dict[original_question]
    return None


