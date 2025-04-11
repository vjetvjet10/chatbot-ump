from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from langchain.chains import RetrievalQA
from langchain_openai import OpenAIEmbeddings
from docling.document_converter import DocumentConverter
from openai import AsyncOpenAI
import os
from typing import List, Any
import glob
import logging
from dotenv import load_dotenv
from langchain_text_splitters import MarkdownHeaderTextSplitter
from langchain.vectorstores.chroma import Chroma
from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document
import json

from utils.utils import config

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
GPT_4o_MINI = config["llm"]["gpt_4o_mini"]
GPT_4o = config["llm"]["gpt_4o"]
TEMPERATURE = config["llm"]["temperature"]
# Cấu hình OpenAI API key
openai_api_key = os.environ.get("OPENAI_API_KEY")
# if not OPENAI_API_KEY:
#     raise ValueError("OPENAI_API_KEY environment variable not set")

# Cấu hình
VECTORSTORE_DIRECTORY = "vector_db"
COLLECTION_NAME = config["retriever"]["collection_name"]
DATA_FOLDERS = ["retriever/data/dao_tao", "retriever/data/student"]
HEADERS_TO_SPLIT_ON = config["retriever"]["headers_to_split_on"]
LOAD_DOCUMENTS = config["retriever"]["load_documents"]

# Khởi tạo FastAPI app
app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Biến toàn cục để lưu trữ retriever kết hợp
combined_retriever = None

class DocumentProcessor:
    def __init__(self, headers_to_split_on: List[str]):
        self.headers_to_split_on = headers_to_split_on

    def clean_text(self, text: str) -> str:
        import re
        text = re.sub(r"(?<=[\wÀ-Ỵà-ỹ]) (?=[\wÀ-Ỵà-ỹ])", "", text)
        text = re.sub(r"\n(?=\S)", " ", text)
        text = re.sub(r"\s{2,}", " ", text)
        return text.strip()

    def process(self, source: Any) -> List[Document]:
        try:
            logger.info("Starting document processing.")
            converter = DocumentConverter()
            markdown_document = converter.convert(source).document.export_to_markdown()
            splitter = MarkdownHeaderTextSplitter(self.headers_to_split_on)
            raw_docs = splitter.split_text(markdown_document)

            cleaned_docs = [
                Document(
                    page_content=self.clean_text(doc.page_content),
                    metadata={**doc.metadata, "source": os.path.basename(source)},
                )
                for doc in raw_docs
            ]

            logger.info("Document processed successfully.")
            return cleaned_docs
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            raise RuntimeError(f"Error processing document: {e}")

class IndexBuilder:
    def __init__(self, docs_list: List[Document], collection_name: str, persist_directory: str):
        self.docs_list = docs_list
        self.collection_name = collection_name
        self.persist_directory = persist_directory
        self.vectorstore = None
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    def build_vectorstore(self, subfolder: str = None):
        subfolder_path = os.path.join(self.persist_directory, subfolder)
        os.makedirs(subfolder_path, exist_ok=True)
        logger.info(f"Building vectorstore for {subfolder} at {subfolder_path}.")
        self.vectorstore = Chroma.from_documents(
            documents=self.docs_list,
            collection_name=self.collection_name,
            persist_directory=subfolder_path,
            embedding=self.embeddings,
        )
        logger.info(f"Vectorstore for {subfolder} built successfully.")
        return True

    def get_retriever(self):
        if self.vectorstore:
            retriever_vanilla = self.vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 4})
            retriever_mmr = self.vectorstore.as_retriever(search_type="mmr", search_kwargs={"k": 4})
            bm25_retriever = BM25Retriever.from_documents(self.docs_list, search_kwargs={"k": 4})
            return [retriever_vanilla, retriever_mmr, bm25_retriever]
        return []

def process_folder(folder: str, persist_directory: str, headers_to_split_on: List[str], collection_name: str):
    files = glob.glob(os.path.join(folder, "*.pdf")) + glob.glob(os.path.join(folder, "*.docx"))
    if not files:
        logger.warning(f"No documents found in {folder}. Skipping.")
        return None, None

    logger.info(f"Processing documents from folder: {folder}")
    processor = DocumentProcessor(headers_to_split_on)
    docs_list = []
    for file in files:
        try:
            docs_list.extend(processor.process(file))
        except RuntimeError as e:
            logger.error(f"Failed to process document {file}: {e}")
            continue

    index_builder = IndexBuilder(docs_list, collection_name, persist_directory)
    subfolder_name = os.path.basename(folder)
    index_builder.build_vectorstore(subfolder=subfolder_name)
    retrievers = index_builder.get_retriever()
    logger.info(f"Index and retrievers built for {folder} successfully.")
    return retrievers, subfolder_name

# Hàm kiểm tra xem vectorstore đã tồn tại cho một thư mục con hay chưa
def vectorstore_exists(subfolder: str) -> bool:
    vectorstore_path = os.path.join(VECTORSTORE_DIRECTORY, subfolder)
    metadata_file = os.path.join(vectorstore_path, "chroma.sqlite3")
    index_folder_exists = False
    try:
        sub_items = [item for item in os.listdir(vectorstore_path) if item != "chroma.sqlite3" and not item.startswith('.')]
        if sub_items:
            index_folder_exists = True
    except FileNotFoundError:
        pass
    return os.path.exists(metadata_file) and index_folder_exists

# Hàm khởi tạo hoặc tải retriever
async def initialize_retriever():
    global combined_retriever
    all_retrievers = []
    num_folders_processed = 0
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    for folder in DATA_FOLDERS:
        subfolder_name = os.path.basename(folder)
        vectorstore_path = os.path.join(VECTORSTORE_DIRECTORY, subfolder_name)

        if not vectorstore_exists(subfolder_name):
            print(f"Vectorstore not found for {subfolder_name}. Building it...")
            retrievers, _ = process_folder(folder, VECTORSTORE_DIRECTORY, HEADERS_TO_SPLIT_ON, COLLECTION_NAME)
            if retrievers:
                all_retrievers.extend(retrievers)
                num_folders_processed += 1
        else:
            print(f"Loading existing vectorstore from {vectorstore_path}")
            try:
                vectorstore = Chroma(persist_directory=vectorstore_path, embedding_function=embeddings, collection_name=COLLECTION_NAME)
                print(f"Successfully loaded vectorstore from {vectorstore_path}")

                # Lấy documents từ vectorstore (cách mới)
                docs = vectorstore.get(include=["documents", "metadatas"])
                documents = [Document(page_content=content, metadata=metadata if metadata else {})
                             for content, metadata in zip(docs['documents'], docs['metadatas'])]

                retriever_vanilla = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 6})
                retriever_mmr = vectorstore.as_retriever(search_type="mmr", search_kwargs={"k": 6})
                bm25_retriever = BM25Retriever.from_documents(documents, search_kwargs={"k": 6})
                all_retrievers.extend([retriever_vanilla, retriever_mmr, bm25_retriever])
                num_folders_processed += 1
            except Exception as e:
                print(f"Error loading vectorstore from {vectorstore_path}: {e}")

    if all_retrievers and num_folders_processed > 0:
        weights_per_folder = [0.2, 0.3, 0.5]
        combined_retriever = EnsembleRetriever(
            retrievers=all_retrievers,
            weights=weights_per_folder * num_folders_processed
        )
    else:
        print("Error: No valid retrievers loaded.")
# Sự kiện khởi động ứng dụng
@app.on_event("startup")
async def startup_event():
    await initialize_retriever()

# Endpoint WebSocket cho chat
@app.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    global combined_retriever
    if not combined_retriever:
        await websocket.send_text(json.dumps({"stream": "Error: Retriever not initialized."}))
        await websocket.close()
        return

    try:
        while True:
            logger.info("⚡ Waiting for message...")
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                question = payload.get("message")
                if question:
                    print(f"Received query: {question}")
                    # Lấy ngữ cảnh từ retriever
                    relevant_docs = combined_retriever.invoke(question)
                    # context = "\n\n".join(doc.page_content for doc in relevant_docs)

                    # Tạo context gắn source vào mỗi đoạn
                    context = "\n\n".join(
                        f"{doc.page_content.strip()}\n\n【source: {doc.metadata.get('source', 'unknown')}】"
                        for doc in relevant_docs
)

                    sources = [{"filename": doc.metadata.get("source")} for doc in relevant_docs] # Lấy danh sách nguồn

                    # Tạo prompt cho LLM để stream
                    messages = [
                        {"role": "system", 
                         "content": """Bạn là chuyên gia tư vấn của Đại học Y Dược TP.HCM. 
                         Nhiệm vụ của bạn là truy xuất thông tin để trả lời câu hỏi về Đại học Y Dược TPHCM của người dùng.
                        Dựa trên câu hỏi của người dùng, hãy truy cập vectorstore để tìm kiếm và trích xuất thông tin liên quan đến câu hỏi, 
                        suy xét cẩn thận và tạo câu trả lời chính xác vì thông tin về Đại học Y Dược TPHCM rất quan trọng và có ảnh hưởng rất nghiêm trọng nếu trả lời sai.
                        Ngoài các tài liệu dưới dạng text phải đặc biệt chú ý thông tin được lưu dưới dạng bảng vì đây là nơi thường chứa dữ liệu chi tiết và quan trọng nhưng dễ bị trả lời sai hoặc bị bỏ sót thông tin.
                        Câu trả lời phải rõ ràng, thân thiện và vui vẻ vì người dùng là học sinh. Nếu trích xuất mà không có thông tin thì phản hồi người dùng là hiện tại không
                        có thông tin để trả lời, hướng người dùng truy cập trang web ump.edu.vn hoặc liên hệ bộ phận tư vấn trực tiếp để được hỗ trợ"""},
                        {"role": "user", 
                         "content": f"Dựa trên thông tin sau đây: {context}\n\nHãy trả lời câu hỏi sau một cách chi tiết:\n\n{question}"},
                    ]
                    openai_client = AsyncOpenAI()
                    response_stream = await openai_client.chat.completions.create(
                        model=GPT_4o_MINI,
                        messages = messages,
                        temperature=0.2,
                        stream=True,
                        max_completion_tokens=5000

                    )
                    # Stream từng token
                    async for chunk in response_stream:
                        content = chunk.choices[0].delta.content
                        if content:
                            print(">> Token:", content)
                            await websocket.send_text(json.dumps({"stream": content}))

                    # ✅ Gửi thông tin về tài liệu sau khi kết thúc stream
                    # if relevant_docs:
                    #     doc_info = [{"source": doc.metadata.get("source"), "snippet": doc.page_content[:300]} for doc in relevant_docs]
                    #     await websocket.send_text(json.dumps({"docs": doc_info}))
                    #     print("✅ Sent docs:", doc_info)
                    if relevant_docs:
                        doc_info = [
                            {
                                "source": doc.metadata.get("source", "unknown"),
                                "snippet": doc.page_content[:300].strip()  # hoặc đoạn ngắn highlight
                            }
                            for doc in relevant_docs
                        ]
                        await websocket.send_text(json.dumps({"docs": doc_info}))
                        print("✅ Sent docs:", doc_info)

                    # ✅ Gửi gợi ý sau khi gửi tài liệu
                    suggestions = ["Học bổng của trường?", "Đời sống sinh viên?", "Cơ sở vật chất của trường?"]
                    await websocket.send_text(json.dumps({"suggestions": suggestions}))
                    print("✅ Sent suggestions")

                    # ✅ Gửi dấu hiệu kết thúc cuối cùng
                    await websocket.send_text("[END]")
                    print("✅ Finished sending stream.")
                else:
                    await websocket.send_text(json.dumps({"stream": "Error: Missing 'message' in request."}))
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"stream": "Error: Invalid JSON format."}))
            except Exception as e:
                await websocket.send_text(json.dumps({"stream": f"Error processing query: {e}"}))

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)