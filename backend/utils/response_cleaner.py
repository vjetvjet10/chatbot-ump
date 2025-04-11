import re
def clean_text(text: str) -> str:
    import re
    # Loại bỏ khoảng trắng dư giữa từng chữ cái
    text = re.sub(r"(?<=[a-zA-ZÀ-ỹ]) (?=[a-zA-ZÀ-ỹ])", "", text)
    # Loại bỏ dấu xuống dòng trong giữa dòng
    text = re.sub(r"\n(?=[^\n])", " ", text)
    return text

def postprocess_response(content: str) -> str:
    """
    Làm sạch và định dạng lại nội dung trả về cho đẹp hơn.
    """

    def fix_spacing(text: str) -> str:
        # Xóa khoảng trắng không cần thiết giữa các chữ
        text = re.sub(r'(?<=\w)\s(?=\w)', '', text)
        # Xóa khoảng trắng thừa trước dấu chấm và phẩy
        text = re.sub(r'\s+([.,;:])', r'\1', text)
        # Thêm khoảng trắng sau dấu kết câu nếu thiếu
        text = re.sub(r'([.!?])(?=\w)', r'\1 ', text)
        return text

    def normalize_bullet_list(text: str) -> str:
        lines = text.splitlines()
        new_lines = []
        for line in lines:
            if re.match(r"^[-•\*]?\s*", line):
                line = line.strip("-•* ").strip()
                if line:
                    new_lines.append(f"- {line}")
            else:
                new_lines.append(line.strip())
        return "\n".join(new_lines)

    def remove_duplicate_paragraphs(text: str) -> str:
        # Cắt ra từng đoạn
        parts = list(dict.fromkeys(text.strip().split("\n\n")))  # unique giữ thứ tự
        return "\n\n".join(parts)

    # Apply các bước
    content = fix_spacing(content)
    content = normalize_bullet_list(content)
    content = remove_duplicate_paragraphs(content)

    return content.strip()
