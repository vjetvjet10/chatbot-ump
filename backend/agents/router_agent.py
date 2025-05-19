def route_query(query: str) -> str:
    query = query.lower()

    # 🎯 Nhóm từ khóa liên quan đến công tác sinh viên (CTSV)
    ctsv_keywords = [
        "ký túc xá", "khen thưởng", "kỷ luật", "học bổng", "hỗ trợ",
        "công tác sinh viên", "miễn giảm học phí", "hộ nghèo", "khó khăn",
        "bảo hiểm", "y tế", "bhyt", "ctsv", "hoạt động sinh viên", "câu lạc bộ", "ai là", "là ai"
    ]

    # 🎯 Nhóm từ khóa liên quan đến đào tạo, tuyển sinh
    dao_tao_keywords = [
        "học phí", "chương trình", "ngành học", "đào tạo", "xét tuyển",
        "ielts", "sat", "toefl", "chỉ tiêu", "tuyển sinh", "ngành", "điểm chuẩn",
        "phương thức", "liên thông", "thi đầu vào", "trúng tuyển"
    ]

    if any(kw in query for kw in ctsv_keywords):
        return "ctsv"
    if any(kw in query for kw in dao_tao_keywords):
        return "dao_tao"

    # 🔁 Fallback mặc định → dao_tao ưu tiên hơn
    return "external"  # fallback khi không match

