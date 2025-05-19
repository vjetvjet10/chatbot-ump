# # from config import get_vectorstore

# # def retrieve_documents(query: str, query_type: str):
# #     vectorstore = get_vectorstore(query_type)
# #     retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
# #     return retriever.get_relevant_documents(query)
# from config import get_vectorstore
# def retrieve_documents(query: str, domain: str):
#     vs = get_vectorstore(domain)
#     # tăng k lên 12–15 để cover đủ chunks liên quan
#     retriever = vs.as_retriever(search_kwargs={"k": 12})
#     docs = retriever.get_relevant_documents(query)
#     # lọc duplicate page_content
#     seen = set(); unique = []
#     for d in docs:
#         if d.page_content.strip() not in seen:
#             seen.add(d.page_content.strip())
#             unique.append(d)
#     return unique
from typing import List
from langchain_core.documents import Document
from langchain.retrievers import BM25Retriever
from langchain.retrievers.multi_query import MultiQueryRetriever
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from config import get_vectorstore
import logging

# --- Logging ---
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# --- Embedding & LLM ---
embedding = OpenAIEmbeddings()
llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0.2)

def retrieve_documents(query: str, domain: str) -> List[Document]:
    logger.info(f"🧠 DOMAIN: {domain} | QUERY: {query}")
    vectorstore = get_vectorstore(domain)

    # --- Phase 1: Similarity search ---
    retriever = vectorstore.as_retriever(search_kwargs={"k": 200})
    try:
        docs = retriever.get_relevant_documents(query)
        logger.info(f"✅ Similarity search: {len(docs)} documents.")
    except Exception as e:
        logger.error(f"❌ Error in similarity search: {e}")
        docs = []

    # --- Phase 2: MultiQuery nếu kết quả ít ---
    # if len(docs) < 3:
    #     try:
    #         logger.info("🔁 Switching to MultiQueryRetriever...")
    #         # mqr = MultiQueryRetriever.from_llm(retriever=retriever, llm=llm)
    #         mqr = MultiQueryRetriever.from_llm(retriever=vectorstore.as_retriever(), llm=llm)
    #         # docs = mqr.retriever(query)
    #         docs = mqr.invoke(query)
    #         logger.info(f"✅ MultiQuery retrieved: {len(docs)} documents.")
    #     except Exception as e:
    #         logger.error(f"❌ Error in MultiQueryRetriever: {e}")

    # --- Phase 3: Fallback sang BM25 nếu vẫn trống ---
    if len(docs) == 0:
        try:
            logger.info("🔁 Falling back to BM25...")
            texts = vectorstore.similarity_search(query, k=20)
            bm25 = BM25Retriever.from_documents(texts)
            docs = bm25.get_relevant_documents(query)
            logger.info(f"✅ BM25 fallback retrieved: {len(docs)} documents.")
        except Exception as e:
            logger.error(f"❌ Error in BM25 fallback: {e}")

    # --- Lọc duplicate ---
    seen = set()
    unique = []
    for d in docs:
        content = d.page_content.strip()
        if content and content not in seen:
            seen.add(content)
            unique.append(d)

    logger.info(f"📦 Final deduplicated documents: {len(unique)}")
    return unique
