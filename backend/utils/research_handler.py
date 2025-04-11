# utils/research_handler.py

import logging
from main_graph.graph_states import AgentState
from typing import Callable, List, Literal
from langchain_core.documents import Document
from langchain_core.runnables import RunnableConfig
from langchain_core.runnables import Runnable
from langchain_community.retrievers import TavilySearchAPIRetriever
from typing import Any, Literal, TypedDict, cast, List, Optional
# 

from utils.utils import config  # Cập nhật tùy theo cách bạn load config

logger = logging.getLogger(__name__)

from subgraph.graph_builder import researcher_graph_admission, researcher_graph_student

RESEARCHER_MAP = {
    "admission": researcher_graph_admission,
    "student": researcher_graph_student,
    # mở rộng thêm nếu cần
}
async def default_needs_fallback(question: str, docs: List[Document]) -> bool:
    return not docs or all(len(doc.page_content) < 50 for doc in docs)

# async def default_tavily_search(question: str, router_type: str = "") -> List[Document]:
#     retriever = TavilySearchAPIRetriever(k=5, search_kwargs={"site": "ump.edu.vn"})
#     try:
#         docs = await retriever.aget_relevant_documents(question)
#         for doc in docs:
#             doc.metadata.update({
#                 "source": doc.metadata.get("source", "tavily"),
#                 "router_type": router_type
#             })
#         return docs
#     except Exception as e:
#         logger.error(f"[TAVILY ERROR] {str(e)}")
#         return []

# async def generic_conduct_research(
#     step: str,
#     graph: Runnable,
#     router_type: str,
#     *,
#     fallback_fn: Callable[[str, str], List[Document]] = default_tavily_search,
#     fallback_check_fn: Callable[[str, List[Document]], bool] = default_needs_fallback,
# ) -> dict[str, any]:
#     """
#     Generic handler for research steps per agent.

#     Args:
#         step (str): The query or subquestion to search.
#         graph (Runnable): LangGraph agent/research graph for internal docs.
#         router_type (str): Type of agent (admission, student,...).
#         fallback_fn: Function to fetch docs from Tavily.
#         fallback_check_fn: Function to decide whether fallback is needed.

#     Returns:
#         dict[str, Any]: documents, research_method.
#     """
#     try:
#         logger.info(f"[RESEARCH] Invoking agent graph for type: {router_type}")
#         result = await graph.ainvoke({"question": step})
#         internal_docs = result.get("documents", [])
#     except Exception as e:
#         logger.error(f"[ERROR] Failed internal graph research: {e}")
#         internal_docs = []

#     should_fallback = await fallback_check_fn(step, internal_docs)
#     docs = internal_docs
#     tavily_used = False

#     if should_fallback:
#         logger.warning(f"[FALLBACK] Triggering Tavily fallback for type: {router_type}")
#         fallback_docs = await fallback_fn(step, router_type)
#         docs = fallback_docs + internal_docs
#         docs.sort(key=lambda x: len(x.page_content), reverse=True)
#         tavily_used = bool(fallback_docs)

#     return {
#         "documents": docs[:5],
#         "research_method": "tavily" if tavily_used else "internal"
#     }
async def generic_conduct_research(state: AgentState, *, config: RunnableConfig) -> dict[str, Any]:
    """
    Conduct research using internal agent graph, without external fallback.
    """
    router_type = state.router.type
    graph = RESEARCHER_MAP.get(router_type)
    step = state.steps[0] if state.steps else state.messages[-1].content

    try:
        logger.info(f"[RESEARCH] Invoking agent graph for type: {router_type}")
        result = await graph.ainvoke({"question": step})
        raw_docs = result.get("documents", [])
        internal_docs = []
        for i, doc in enumerate(raw_docs):
            if isinstance(doc, Document):
                internal_docs.append(doc)
            elif isinstance(doc, dict) and "page_content" in doc:
                internal_docs.append(Document(page_content=doc["page_content"], metadata=doc.get("metadata", {})))
            else:
                logger.warning(f"[SKIP] Tài liệu {i} thiếu 'page_content': {doc}")

    except Exception as e:
        logger.error(f"[ERROR] Failed internal graph research: {e}")
        internal_docs = []

    return {
        "documents": internal_docs[:5],
        "research_method": "internal"
    }
