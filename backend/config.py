from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from dotenv import load_dotenv
load_dotenv()
embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")

VECTOR_DIRS = {
    "dao_tao": "data/vector_dao_tao",
    "ctsv": "data/vector_ctsv"
}
DOC_DIRS = {
    "dao_tao": "data/dao_tao",
    "ctsv": "data/ctsv"
}

def get_vectorstore(domain: str) -> Chroma:
    return Chroma(
        collection_name=domain,  # ✅ PHẢI CÓ
        persist_directory=f"data/vector_{domain}",
        embedding_function=embedding_model
    )