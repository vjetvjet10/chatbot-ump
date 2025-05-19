# import pandas as pd
# from langchain_core.documents import Document

# def extract_tables_from_docx(doc, filename):
#     results = []
#     for idx, table in enumerate(doc.tables):
#         data = []
#         for row in table.rows:
#             data.append([cell.text.strip() for cell in row.cells])
#         df = pd.DataFrame(data)
#         results.append(Document(
#             page_content=df.to_string(index=False),
#             metadata={"source": filename, "type": "table", "index": idx}
#         ))
#     return results

import pandas as pd
from langchain_core.documents import Document

def extract_tables_from_docx(docx, filename) -> list[Document]:
    """
    Trích mỗi bảng thành một Document, detect header để gán description.
    """
    results = []
    for idx, tbl in enumerate(docx.tables):
        # Build DataFrame
        data = [[cell.text.strip() for cell in row.cells] 
                for row in tbl.rows]
        df = pd.DataFrame(data)

        # Detect loại bảng
        headers = [str(x).lower() for x in df.iloc[0].tolist()]
        desc = "table"
        if any("chỉ tiêu" in h for h in headers):
            desc = "bảng chỉ tiêu tuyển sinh"
        elif any("học phí" in h for h in headers):
            desc = "bảng học phí"
        elif any("tổ hợp" in h for h in headers):
            desc = "bảng tổ hợp xét tuyển"

        results.append(Document(
            page_content=df.to_csv(index=False),  # CSV giữ cột dễ parse
            metadata={
                "source": filename,
                "type": "table",
                "description": desc,
                "index": idx
            }
        ))
    return results
