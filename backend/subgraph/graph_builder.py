### Build Index

from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever
from dotenv import load_dotenv
from subgraph.graph_states import ResearcherState, QueryState
from utils.utils import config
from utils.prompt import GENERATE_QUERIES_SYSTEM_PROMPT
from langchain_core.documents import Document
from typing import Any, Literal, TypedDict, cast

from langchain_core.messages import BaseMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from langchain_openai import ChatOpenAI
from langgraph.types import Send
import os

from langchain.retrievers.contextual_compression import ContextualCompressionRetriever
from langchain_cohere import CohereRerank
from langchain_community.llms import Cohere
import logging


load_dotenv()

logger = logging.getLogger(__name__)

# Vector store configuration
VECTORSTORE_COLLECTION = config["retriever"]["collection_name"]
VECTORSTORE_DIRECTORY = config["retriever"]["directory"]
TOP_K = config["retriever"]["top_k"]
TOP_K_COMPRESSION = config["retriever"]["top_k_compression"]
ENSEMBLE_WEIGHTS = config["retriever"]["ensemble_weights"]
COHERE_RERANK_MODEL = config["retriever"]["cohere_rerank_model"]

def _setup_vectorstore(subfolder: str = None) -> Chroma:
    """
    Set up and return the Chroma vector store instance.
    This method now takes a subfolder to allow for different vector stores for different document sets.
    """
    embeddings = OpenAIEmbeddings()

    # Nếu có subfolder, tạo đường dẫn vectorstore riêng cho thư mục con đó
    subfolder_path = os.path.join(VECTORSTORE_DIRECTORY, subfolder) if subfolder else VECTORSTORE_DIRECTORY

    # Kiểm tra nếu thư mục đã tồn tại
    if os.path.exists(subfolder_path):
        logger.info(f"Loading existing vectorstore from {subfolder_path}.")
    else:
        logger.info(f"Creating new vectorstore at {subfolder_path}.")
        os.makedirs(subfolder_path, exist_ok=True)

    return Chroma(
        collection_name=VECTORSTORE_COLLECTION,
        embedding_function=embeddings,
        persist_directory=subfolder_path
    )


# def _load_documents(subfolder: str) -> list[Document]:
#     """
#     Load documents and metadata from a specific vectorstore directory (subfolder) and return them as Langchain Document objects.
#     """
#     # Kiểm tra xem subfolder có phải là chuỗi không (đảm bảo rằng subfolder là tên thư mục chứ không phải đối tượng Chroma)
#     if not isinstance(subfolder, str):
#         raise TypeError(f"Expected 'subfolder' to be a string, but got {type(subfolder)}")

#     # Tạo đường dẫn vectorstore cho thư mục con
#     subfolder_path = os.path.join(VECTORSTORE_DIRECTORY, subfolder)
#     vectorstore = Chroma(
#         collection_name=VECTORSTORE_COLLECTION,
#         embedding_function=OpenAIEmbeddings(),
#         persist_directory=subfolder_path
#     )

#     # Lấy dữ liệu tài liệu và metadata từ vectorstore
#     all_data = vectorstore.get(include=["documents", "metadatas"])
#     documents: list[Document] = []

#     for content, meta in zip(all_data["documents"], all_data["metadatas"]):
#         if meta is None:
#             meta = {}
#         elif not isinstance(meta, dict):
#             raise ValueError(f"Expected metadata to be a dict, but got {type(meta)}")

#         documents.append(Document(page_content=content, metadata={"source": meta.get("source", subfolder)}))

#         # documents.append(Document(page_content=content, metadata=meta))

#     return documents
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain.vectorstores import Chroma
import os

def _load_documents(subfolder: str) -> list[Document]:
    """
    Load documents and metadata from a specific vectorstore directory (subfolder)
    and return them as Langchain Document objects.
    """

    # ✅ Kiểm tra kiểu dữ liệu đầu vào
    if not isinstance(subfolder, str):
        raise TypeError(f"Expected 'subfolder' to be a string, but got {type(subfolder)}")

    # ✅ Khởi tạo đường dẫn và vectorstore
    subfolder_path = os.path.join(VECTORSTORE_DIRECTORY, subfolder)
    vectorstore = Chroma(
        collection_name=VECTORSTORE_COLLECTION,
        embedding_function=OpenAIEmbeddings(),
        persist_directory=subfolder_path
    )

    # ✅ Lấy tài liệu và metadata
    all_data = vectorstore.get(include=["documents", "metadatas"])
    documents: list[Document] = []

    for idx, (content, meta) in enumerate(zip(all_data["documents"], all_data["metadatas"])):
        # ⚠️ Bỏ qua nếu page_content bị thiếu
        if not content or not isinstance(content, str):
            print(f"[⚠️ WARN] Bỏ qua tài liệu {idx} vì thiếu page_content hoặc content không phải chuỗi. Metadata: {meta}")
            continue

        # ✅ Xử lý metadata
        if meta is None:
            meta = {}
        elif not isinstance(meta, dict):
            raise ValueError(f"[❌ ERROR] Metadata phải là dict nhưng nhận được: {type(meta)}")

        # ✅ Gán metadata mặc định nếu thiếu "source"
        source = meta.get("source", subfolder)

        # ✅ Debug log
        print(f"[📄 LOADING DOC] {idx} | source: {source} | page_content preview: {content[:50]}...")

        documents.append(Document(page_content=content, metadata={"source": source, **meta}))

    print(f"[✅ DONE] Tổng số tài liệu hợp lệ nạp được: {len(documents)} từ thư mục '{subfolder}'")
    return documents




def _build_retrievers(documents: list[Document], subfolder: str) -> ContextualCompressionRetriever:
    if not documents:
        raise ValueError(f"No documents found in subfolder '{subfolder}' to build retriever.")

    vectorstore = _setup_vectorstore(subfolder)
    
    retriever_bm25 = BM25Retriever.from_documents(documents, search_kwargs={"k": TOP_K})
    retriever_vanilla = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": TOP_K})
    retriever_mmr = vectorstore.as_retriever(search_type="mmr", search_kwargs={"k": TOP_K})
    
    ensemble_retriever = EnsembleRetriever(
        retrievers=[retriever_vanilla, retriever_mmr, retriever_bm25],
        weights=ENSEMBLE_WEIGHTS,
    )
    
    compressor = CohereRerank(top_n=TOP_K_COMPRESSION, model=COHERE_RERANK_MODEL)
    # compressor = FlagLLMReranker('BAAI/bge-reranker-v2-gemma', use_fp16=True) # Setting use_fp16 to True speeds up computation with a slight performance degradation
    
    return ContextualCompressionRetriever(
        base_compressor=compressor,
        base_retriever=ensemble_retriever,
    )
# def _build_retrievers(documents: list[Document], subfolder: str):
#     if not documents:
#         raise ValueError(f"No documents found in subfolder '{subfolder}' to build retriever.")

#     vectorstore = _setup_vectorstore(subfolder)

#     retriever_bm25 = BM25Retriever.from_documents(documents, search_kwargs={"k": TOP_K})
#     retriever_vanilla = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": TOP_K})
#     retriever_mmr = vectorstore.as_retriever(search_type="mmr", search_kwargs={"k": TOP_K})

#     ensemble_retriever = EnsembleRetriever(
#         retrievers=[retriever_vanilla, retriever_mmr, retriever_bm25],
#         weights=ENSEMBLE_WEIGHTS,
#     )

#     return ensemble_retriever

def build_researcher_graph(subfolder: str):
    documents = _load_documents(subfolder)
    retriever = _build_retrievers(documents, subfolder)

    def _generate_queries_fn():
        async def generate_queries(state: ResearcherState, *, config: RunnableConfig) -> dict[str, list[str]]:
            class Response(TypedDict):
                queries: list[str]
            logger.info(f"---GENERATE QUERIES ({subfolder})---")
            model = ChatOpenAI(model="gpt-4o-mini-2024-07-18", temperature=0)
            messages = [
                {"role": "system", "content": GENERATE_QUERIES_SYSTEM_PROMPT},
                {"role": "human", "content": state.question},
            ]
            response = cast(Response, await model.with_structured_output(Response).ainvoke(messages))
            queries = response["queries"]
            queries.append(state.question)
            return {"queries": queries}
        return generate_queries

    # def _retrieve_docs_fn():
    #     async def retrieve_and_rerank_documents(state: QueryState, *, config: RunnableConfig) -> dict[str, list[Document]]:
    #         logger.info(f"---RETRIEVING DOCUMENTS ({subfolder})---")
    #         logger.info(f"Query: {state.query}")
    #         return {"documents": retriever.invoke(state.query)}
    #     return retrieve_and_rerank_documents
    def _retrieve_docs_fn():
        async def retrieve_and_rerank_documents(state: QueryState, *, config: RunnableConfig) -> dict[str, list[Document]]:
            logger.info(f"---RETRIEVING DOCUMENTS ({subfolder})---")
            logger.info(f"Query: {state.query}")

            raw_docs = retriever.invoke(state.query)
            filtered_docs = []

            for i, doc in enumerate(raw_docs):
                if not hasattr(doc, "page_content") or not doc.page_content:
                    logger.warning(f"[⚠️ SKIP] Document {i} missing 'page_content': {doc}")
                    continue
                filtered_docs.append(doc)

            return {"documents": filtered_docs[:5]}  # ✅ Giới hạn số lượng nếu cần
        return retrieve_and_rerank_documents


    def retrieve_in_parallel(state: ResearcherState) -> list[Send]:
        return [Send("retrieve_and_rerank_documents", QueryState(query=q)) for q in state.queries]

    builder = StateGraph(ResearcherState)
    builder.add_node("generate_queries", _generate_queries_fn())
    builder.add_node("retrieve_and_rerank_documents", _retrieve_docs_fn())
    builder.add_edge(START, "generate_queries")
    builder.add_conditional_edges("generate_queries", retrieve_in_parallel, path_map=["retrieve_and_rerank_documents"])
    builder.add_edge("retrieve_and_rerank_documents", END)

    return builder.compile()

researcher_graph_admission = build_researcher_graph("dao_tao")
researcher_graph_student = build_researcher_graph("student")
# researcher_graph_combined = build_researcher_graph("combined")
