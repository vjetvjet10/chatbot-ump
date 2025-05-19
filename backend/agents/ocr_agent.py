from PIL import Image
import pytesseract
from langchain_core.documents import Document
import io

def extract_images_and_ocr(doc, filename):
    ocr_results = []
    for idx, shape in enumerate(doc.inline_shapes):
        if shape.type == 3:  # Picture
            image_bytes = shape._inline.graphic.graphicData.pic.blipFill.blip._blob
            img = Image.open(io.BytesIO(image_bytes))
            text = pytesseract.image_to_string(img, lang="vie+eng")
            if text.strip():
                ocr_results.append(Document(
                    page_content=text.strip(),
                    metadata={"source": filename, "type": "image_ocr", "index": idx}
                ))
    return ocr_results