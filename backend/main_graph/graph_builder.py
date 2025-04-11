"""Main entrypoint for the conversational retrieval graph.

This module defines the core structure and functionality of the conversational
retrieval graph. It includes the main graph definition, state management,
and key functions for processing & routing user queries, generating research plans to answer user questions,
conducting research, and formulating responses.
"""
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
logger.info("--- GRAPH BUILDER LOADED ---")
import asyncio
# from utils.google_cse_retriever import GoogleCustomSearchRetriever  # đổi tên nếu bạn lưu trong file khác
import json
import os
import asyncio
from dotenv import load_dotenv
from openai import OpenAI
# from retriever import GoogleCustomSearchRetriever  # nếu bạn đặt class ở file khác thì đổi tên lại
from openai import AsyncOpenAI
from typing import AsyncGenerator
load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
cse_id = os.getenv("GOOGLE_CSE_ID")
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
from typing import Any, Literal, TypedDict, cast, List, Optional, Dict
from utils.response_cleaner import postprocess_response  # nếu bạn lưu riêng
from langchain_core.documents import Document
from langchain_core.messages import AIMessage, HumanMessage, BaseMessage
from langchain_core.messages import BaseMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from langchain_openai import ChatOpenAI
from langgraph.types import interrupt, Command
from main_graph.graph_states import AgentState, Router, GradeHallucinations, InputState
from utils.prompt import ROUTER_SYSTEM_PROMPT, ADMISSION_PLAN_SYSTEM_PROMPT, STUDENT_PLAN_SYSTEM_PROMPT, MORE_INFO_SYSTEM_PROMPT, GENERAL_SYSTEM_PROMPT, CHECK_HALLUCINATIONS, RESPONSE_SYSTEM_PROMPT
# from subgraph.graph_builder import researcher_graph
from langchain_core.documents import Document
from typing import Any, Literal, Optional
from langgraph.checkpoint.memory import MemorySaver
from subgraph.graph_builder import researcher_graph_admission, researcher_graph_student
from langchain_core.documents import Document
from main_graph.graph_states import Router
# from langchain_community.retrievers import TavilySearchAPIRetriever # ✅
import logging
from langchain.retrievers.contextual_compression import ContextualCompressionRetriever
from utils.utils import config
from utils.logger import with_log
from langchain_cohere import CohereRerank
import os

import re
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

logging.getLogger("openai").setLevel(logging.WARNING)  
logging.getLogger("urllib3").setLevel(logging.WARNING) 

# logging.getLogger("openai").propagate = False
logging.getLogger("urllib3").propagate = False
logging.getLogger("httpx").propagate = False


GPT_4o_MINI = config["llm"]["gpt_4o_mini"]
GPT_4o = config["llm"]["gpt_4o"]
TEMPERATURE = config["llm"]["temperature"]
COHERE_RERANK_MODEL = config["retriever"]["cohere_rerank_model"]
VECTORSTORE_COLLECTION = config["retriever"]["collection_name"]
VECTORSTORE_DIRECTORY = config["retriever"]["directory"]
TOP_K = config["retriever"]["top_k"]
TOP_K_COMPRESSION = config["retriever"]["top_k_compression"]
ENSEMBLE_WEIGHTS = config["retriever"]["ensemble_weights"]

# async def analyze_and_route_query(state: AgentState, *, config: RunnableConfig) -> dict[str, Router]:
#     logger.info(f"📍 [ROUTER] State đầu vào: {state}")
#     try:
#         logger.info(f"🔎 [ROUTER - BEFORE MESSAGES] Type(state): {type(state)}, Keys: {state.__dict__.keys()}") # Sử dụng __dict__.keys()
#         messages = [{"role": "system", "content": ROUTER_SYSTEM_PROMPT}] + convert_messages(state.messages) # Truy cập state.messages

#         response = await openai_client.chat.completions.create(
#             model=GPT_4o_MINI,
#             messages=messages,
#             temperature=0,
#             response_format={"type": "json_object"},  # Ensure JSON output
#         )

#         content = response.choices[0].message.content
#         logging.debug(f"[ROUTER RAW RESPONSE] {content}")
        
#         try:
#             parsed = json.loads(content)
#             router = Router(type=parsed.get("type", "general"), 
#                           logic=parsed.get("logic", "default"))
#         except json.JSONDecodeError:
#             logging.error("Failed to parse router response, using defaults")
#             router = Router(type="general", logic="parse error occurred")

#         logging.info(f"[ROUTER] Routing to: {router.type}")
#         print(f"🔴 [DEBUG - ANALYZE OUTPUT]: {{'router': router}}") # Thêm dòng này
#         return {"router": router}
        
#     except Exception as e:
#         logging.error(f"[ROUTER ERROR] {e}")
#         return {"router": Router(type="general", logic="exception occurred")}
async def analyze_and_route_query(state: AgentState, *, config: RunnableConfig) -> Dict[str, Router]: # Kiểu trả về là Dict[str, Router]
    logger.info(f"📍 [ROUTER] State đầu vào: {state}")
    try:
        logger.info(f"🔎 [ROUTER - BEFORE MESSAGES] Type(state): {type(state)}, Keys: {state.__dict__.keys()}") # Sử dụng __dict__.keys()
        messages = [{"role": "system", "content": ROUTER_SYSTEM_PROMPT}] + convert_messages(state.messages) # Truy cập state.messages

        response = await openai_client.chat.completions.create(
            model=GPT_4o_MINI,
            messages=messages,
            temperature=0,
            response_format={"type": "json_object"},  # Ensure JSON output
        )

        content = response.choices[0].message.content
        logging.debug(f"[ROUTER RAW RESPONSE] {content}")

        try:
            parsed = json.loads(content)
            router = Router(type=parsed.get("type", "general"),
                          logic=parsed.get("logic", "default"))
        except json.JSONDecodeError:
            logging.error("Failed to parse router response, using defaults")
            router = Router(type="general", logic="parse error occurred")

        logging.info(f"[ROUTER] Routing to: {router.type}")
        print(f"🔴 [DEBUG - ANALYZE OUTPUT]: {{'router': {router}}}") # In ra toàn bộ đối tượng router để debug
        return {"router":router} # Trả về dictionary với key "router" và value là router.type
        
    except Exception as e:
        logging.error(f"[ROUTER ERROR] {e}")
        return {"router": "general"} # Trả về dictionary mặc định nếu có lỗi
def route_query(state: AgentState):
    _type = state.router.type
    logging.info(f"[ROUTER] Routing to type: {_type}")
    if _type == "admission":
        logging.info("🔁 Router trả về key: admission")
        logger.info(f"[DEBUG - ROUTE QUERY RETURN] 'admission'")
        return "admission"
    elif _type == "student":
        logging.info("🔁 Router trả về key: student")
        logger.info(f"[DEBUG - ROUTE QUERY RETURN] 'student'")
        return "student"
    elif _type == "general":
        logging.info("🔁 Router trả về key: general")
        logger.info(f"[DEBUG - ROUTE QUERY RETURN] 'general'")
        return "general"
    else:
        logging.warning(f"Unknown router type {_type}, fallback về respond")
        logger.info(f"[DEBUG - ROUTE QUERY RETURN] 'respond'")
        return "respond"



from typing import List
import logging
from langchain_core.documents import Document
from main_graph.graph_states import AgentState
from subgraph.graph_builder import researcher_graph_admission, researcher_graph_student



RESEARCHER_MAP = {
    "admission": researcher_graph_admission,
    "student": researcher_graph_student,
}
 
async def retrieve_internal_docs(router_type: str, question: str) -> List[Document]:
    researcher = RESEARCHER_MAP.get(router_type)
    if not researcher:
        return []

    try:
        result = await researcher.ainvoke({"question": question})
        raw_docs = result.get("documents", [])
        
        processed_docs = []
        for doc in raw_docs:
            # Chuẩn hóa cả 2 trường hợp: Document object và dictionary
            if isinstance(doc, Document):
                # Đảm bảo có page_content
                if not hasattr(doc, 'page_content'):
                    doc.page_content = getattr(doc, 'content', '')
                
                # Chuẩn hóa metadata
                if not hasattr(doc, 'metadata'):
                    doc.metadata = {}
                
                processed_docs.append(doc)
                
            elif isinstance(doc, dict):
                # Xử lý trường hợp dictionary
                page_content = doc.get('page_content') or doc.get('content', '')
                if not page_content.strip():
                    continue
                    
                metadata = doc.get('metadata', {})
                # Đảm bảo các trường metadata quan trọng
                metadata.setdefault('source', doc.get('source', 'ump.edu.vn'))
                metadata.setdefault('filename', doc.get('filename'))
                metadata.setdefault('page', doc.get('page'))
                
                processed_docs.append(Document(
                    page_content=page_content,
                    metadata=metadata
                ))
        
        return processed_docs
        
    except Exception as e:
        logging.error(f"Retrieval error: {str(e)}")
        return []
# async def create_admission_research_plan(
#     state: AgentState, *, config: RunnableConfig
# ) -> dict[str, Any]:
#     logger.info(f"📍 [ADMISSION PLAN] State đầu vào (type: {type(state)}): {type(state)}")
#     logger.info(f"📍 [ADMISSION PLAN] State keys: {state.keys() if isinstance(state, dict) else state.__dict__.keys()}")
#     logger.info(f"📍 [ADMISSION PLAN] State content: {state}")
#     class ResearchPlan(TypedDict):
#         steps: List[str]
#         logic: str
#     try:
#         model = await openai_client.chat.completions.create(
#         "gpt-4o",
#         messages=convert_messages(state.messages),
#         temperature=0.2,
#         stream=True,
#         )
        
#         # Tạo messages với format chuẩn
#         messages = [
#             {"role": "system", "content": ADMISSION_PLAN_SYSTEM_PROMPT},
#             *state.messages
#         ]
        
#         logging.info("---ADMISSION PLAN GENERATION---")
        
#         # Sử dụng with_structured_output để đảm bảo format
#         response = await model.with_structured_output(
#             ResearchPlan,
#             method="function_calling"
#         ).ainvoke(messages)

#         # Đảm bảo có ít nhất 1 step
#         if not response.get("steps"):
#             response["steps"] = [
#                 "Tìm thông tin về các phương thức xét tuyển tại Đại học Y Dược TP.HCM",
#                 "Tìm đề án tuyển sinh mới nhất"
#             ]

#         return {
#             "steps": response["steps"],
#             "documents": [],  # Init empty documents
#             "research_plan": response  # Giữ toàn bộ plan nếu cần
#         }

#     except Exception as e:
#         logging.error(f"[PLAN ERROR] {str(e)}")
#         # Fallback plan nếu có lỗi
#         return {
#             "steps": [
#                 "Tìm kiếm thông tin chung về phương thức xét tuyển",
#                 "Tìm đề án tuyển sinh chính thức"
#             ],
#             "documents": [],
#             "error": str(e)
#         }
import json
from typing import List, Dict, Any, TypedDict
research_plan_schema = {
    "title": "ResearchPlan",
    "description": "Plan for conducting research.",
    "type": "object",
    "properties": {
        "steps": {
            "type": "array",
            "items": {"type": "string"},
            "description": "List of research steps to take."
        },
        "logic": {
            "type": "string",
            "description": "Reasoning or logic behind the research plan."
        }
    },
    "required": ["steps", "logic"]
}

async def create_admission_research_plan(
    state: AgentState, *, config: RunnableConfig
) -> dict[str, Any]:
    logger.info(f"📍 [ADMISSION PLAN] State đầu vào (type: {type(state)}): {type(state)}")
    logger.info(f"📍 [ADMISSION PLAN] State keys: {state.keys() if isinstance(state, dict) else state.__dict__.keys()}")
    logger.info(f"📍 [ADMISSION PLAN] State content: {state}")
    class ResearchPlan(TypedDict):
        steps: List[str]
        logic: str
    try:
        # Lấy JSON schema từ TypedDict
        research_plan_schema = research_plan_schema

        # Tạo messages với format chuẩn
        messages = [
            {"role": "system", "content": ADMISSION_PLAN_SYSTEM_PROMPT},
            *state.messages
        ]

        logging.info("---ADMISSION PLAN GENERATION---")

        # Gọi create trực tiếp với functions
        response = await openai_client.chat.completions.create(
            "gpt-4o",
            messages=messages,
            temperature=0.2,
            stream=False,
            functions=[{"name": "ResearchPlan", "parameters": research_plan_schema}],
            function_call={"name": "ResearchPlan"}
        )

        structured_response = response.choices[0].message.function_call.arguments
        response_data = json.loads(structured_response)

        # Đảm bảo có ít nhất 1 step
        if not response_data.get("steps"):
            response_data["steps"] = [
                "Tìm thông tin về các phương thức xét tuyển tại Đại học Y Dược TP.HCM",
                "Tìm đề án tuyển sinh mới nhất"
            ]

        return {
            "steps": response_data["steps"],
            "documents": [],  # Init empty documents
            "research_plan": response_data  # Giữ toàn bộ plan nếu cần
        }

    except Exception as e:
        logging.error(f"[PLAN ERROR] {str(e)}")
        # Fallback plan nếu có lỗi
        return {
            "steps": [
                "Tìm kiếm thông tin chung về phương thức xét tuyển",
                "Tìm đề án tuyển sinh chính thức"
            ],
            "documents": [],
            "error": str(e)
        }
async def create_student_research_plan(
    state: AgentState, *, config: RunnableConfig
) -> dict[str, list[str] | str]:
    """Create a step-by-step research plan for answering a student-related query.

    Args:
        state (AgentState): The current state of the agent, including conversation history.
        config (RunnableConfig): Configuration with the model used to generate the plan.

    Returns:
        dict[str, list[str]]: A dictionary with a 'steps' key containing the list of research steps.
    """

    class Plan(TypedDict):
        """Generate research plan."""

        steps: list[str]

    model = ChatOpenAI(model=GPT_4o_MINI, temperature=TEMPERATURE, streaming=True)
    messages = [
        {"role": "system", "content": STUDENT_PLAN_SYSTEM_PROMPT}
    ] + state.messages
    logging.info("---STUDENT PLAN GENERATION---")
    response = cast(Plan, await model.with_structured_output(Plan).ainvoke(messages))
    return {"steps": response["steps"], "documents": "delete"}



async def ask_for_more_info(state: AgentState, *, config: RunnableConfig) -> dict[str, Any]:
    system_prompt = MORE_INFO_SYSTEM_PROMPT.format(logic=state["router"].logic)
    messages = [{"role": "system", "content": system_prompt}] + convert_messages(state.messages)

    response = await openai_client.chat.completions.create(
        model=GPT_4o_MINI,
        messages=messages,
        temperature=0.3,
        stream=False,
    )

    reply = response.choices[0].message.content.strip()
    print(f"🧠 [ASK] Hỏi lại người dùng: {reply}")

    # Nếu chuỗi rỗng → không cần hỏi lại
    if not reply:
        return {"messages": state.messages}
    
    return {
        "messages": state.messages + [AIMessage(content=reply)]
    }

from subgraph.graph_builder import researcher_graph_admission, researcher_graph_student

RESEARCHER_MAP = {
    "admission": researcher_graph_admission,
    "student": researcher_graph_student,
    # "ctsv": researcher_graph_ctsv (sau này thêm)
}

async def respond_to_general_query(
    state: AgentState, *, config: RunnableConfig
) -> dict[str, list[BaseMessage]]:
    """Generate a response to a general query not related to Đại học Y Dược TPHCM.

    This node is called when the router classifies the query as a general question.

    Args:
        state (AgentState): The current state of the agent, including conversation history and router logic.
        config (RunnableConfig): Configuration with the model used to respond.

    Returns:
        dict[str, list[str]]: A dictionary with a 'messages' key containing the generated response.
    """
    model = ChatOpenAI(model=GPT_4o, temperature=TEMPERATURE, streaming=True)
    system_prompt = GENERAL_SYSTEM_PROMPT.format(
        logic=state["router"].logic
    )
    logging.info("---RESPONSE GENERATION---")
    messages = [{"role": "system", "content": system_prompt}] + state.messages
    response = await model.ainvoke(messages)
    return {"messages": [response]}     


from openai import AsyncOpenAI
from typing import AsyncGenerator

# async def respond(state: AgentState, config: RunnableConfig) -> AsyncGenerator[dict, None]:
#     # logger.info("[▶️ RESPOND] Nhận vào %d tài liệu, %d tin nhắn", len(state.documents), len(state.messages))
#     logger.info("[▶️ RESPOND] Nhận vào %d tài liệu, %d tin nhắn", len(state.get("documents") or []), len(state.messages))
#     # Hoặc nếu bạn đang dùng 'documents_temp':
#     # logger.info("[▶️ RESPOND] Nhận vào %d tài liệu, %d tin nhắn", len(state.get("documents_temp") or []), len(state.messages))
#     # Hoặc nếu bạn đang dùng 'documents_final':
#     # logger.info("[▶️ RESPOND] Nhận vào %d tài liệu, %d tin nhắn", len(state.get("documents_final") or []), len(state.messages))
#     # ... (phần còn lại của hàm respond) ...

#     openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

#     response = await openai_client.chat.completions.create(
#         model="gpt-4o",
#         messages=convert_messages(state.messages),
#         temperature=0.2,
#         stream=True,
#     )

#     full_response = ""
#     async for chunk in response:
#         try:
#             delta = chunk.choices[0].delta.content
#             if delta:
#                 full_response += delta
#                 logger.info(f"[📤 RESPOND TOKEN] {delta}")
#                 yield {"messages": [AIMessage(content=delta)]}
#         except Exception as inner_e:
#             logger.error(f"[❌ RESPOND ERROR - WHILE STREAMING] Lỗi khi xử lý chunk: {inner_e}")
#             # Vẫn yield __end__ để báo hiệu kết thúc (có thể kèm thông báo lỗi)
#             yield {"__end__": True, "error": str(inner_e)}
#             return #
async def respond(state: AgentState, *, config: RunnableConfig) -> Dict[str, Any]:
    logger.info(f"📍 [RESPOND] State đầu vào (type: {type(state)}): {state.__dict__.keys()}")
    logger.info(f"[▶️ RESPOND] Nhận vào {len(state.research_output.get('documents_final', []) if state.research_output else [])} tài liệu, {len(state.messages)} tin nhắn")
    context = ""
    if state.research_output and state.research_output.get("documents_final"):
        top_k_documents = state.research_output["documents_final"][:3]
        context = "\n".join(f"[{i+1}] {doc.page_content}" for i, doc in enumerate(top_k_documents))

    print(f"[DEBUG - CONTEXT VALUE]: '{context}'") # Thêm dòng này SAU khi context được gán giá trị

    system_prompt = RESPONSE_SYSTEM_PROMPT.format(context=context)
    messages: list[BaseMessage] = [
        {"role": "system", "content": system_prompt}
    ] + convert_messages(state.messages)

    if state.research_output and state.research_output.get("documents_final"): # Truy cập state.research_output
        top_k_documents = state.research_output["documents_final"][:3]
        content = "\n".join(f"[{i+1}] {doc.page_content}" for i, doc in enumerate(top_k_documents))
        messages.append({"role": "system", "content": content})
    else:
        logger.warning("[RESPOND] Không có tài liệu nào được cung cấp cho việc trả lời.")
        messages.append({"role": "system", "content": "Không có thông tin liên quan."})

    response = await openai_client.chat.completions.create(
        model=GPT_4o_MINI,
        messages=messages,
        temperature=0.7,
        stream=False,
    )

    response_content = response.choices[0].message.content
    logger.info(f"[✅ RESPONSE] Trả lời: {response_content}")
    return {"response": response_content}

from langchain_core.documents import Document
from langchain_core.messages import AIMessage
import logging

import logging
from typing import AsyncGenerator
from langchain_core.documents import Document
from openai.types.chat import ChatCompletionMessageParam

from utils.prompt import RESPONSE_SYSTEM_PROMPT


def _format_doc(doc: Document) -> str:
    """Enhanced document formatting with better metadata handling"""
    if not hasattr(doc, 'metadata'):
        metadata = {}
    else:
        metadata = doc.metadata or {}
    
    source = metadata.get('source', 'unknown')
    filename = metadata.get('filename', '')
    page = metadata.get('page', '')
    
    meta_info = []
    if source and source != 'unknown':
        meta_info.append(f"source={source}")
    if filename:
        meta_info.append(f"filename={filename}")
    if page:
        meta_info.append(f"page={page}")
    
    meta_str = " " + " ".join(meta_info) if meta_info else ""
    
    content = doc.page_content if hasattr(doc, 'page_content') else str(doc)
    return f"<document{meta_str}>\n{content}\n</document>"

def format_docs(docs: List[Document]) -> str:
    if not docs:
        return "Không có tài liệu tham khảo"
    
    formatted = []
    for doc in docs:
        meta = doc.metadata or {}
        source = meta.get('source', 'unknown')
        content = doc.page_content.replace('\n', ' ').strip()
        formatted.append(f"[Nguồn: {source}]\n{content[:500]}...")
    
    return "\n\n".join(formatted)

 
from openai import AsyncOpenAI
from pydantic import BaseModel
from typing import Literal

# Model trả về
class GradeHallucinations(BaseModel):
    binary_score: Literal["0", "1"]  # 0: Không hợp lý, 1: Hợp lý

# Khởi tạo client
openai_client = AsyncOpenAI()

async def check_hallucinations(state: AgentState, *, config: RunnableConfig) -> dict[str, Any]:
    from openai import AsyncOpenAI
    openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    logging.info("---CHECK HALLUCINATIONS---")

    prompt = (
        "You are an AI evaluator. Return a JSON object with key 'binary_score': '0' (not hallucinated) or '1' (hallucinated).\n"
        "Example: { \"binary_score\": \"1\" }\n\n"
        + CHECK_HALLUCINATIONS.format(
            documents=state.documents[:3],
            generation=state.messages[-1]
        )
    )

    # messages = [{"role": "system", "content": prompt}]
    messages = [{"role": "system", "content": prompt}] + convert_messages(state.messages)


    try:
        response = await openai_client.chat.completions.create(
            model=GPT_4o_MINI,
            messages=messages,
            temperature=0,
            response_format={"type": "json_object"},
        )

        json_response = response.choices[0].message.content
        logger.info(f"[✅ CHECK HALLUCINATIONS RESULT] Raw response: {json_response}")
        
        logging.debug(f"[CHECK JSON] {json_response}")
        parsed = json.loads(json_response)

        return {"hallucination": GradeHallucinations(**parsed),
                 "messages": state.messages}

    except Exception as e:
        logging.error(f"[CHECK HALLUCINATIONS ERROR] {e}")
        return {"hallucination": GradeHallucinations(binary_score="0"),
                "messages": state.messages}  # fallback



# def human_approval(
#     state: AgentState,
# ):
#     _binary_score = state.hallucination.binary_score
#     if _binary_score == "1":
#         return "END"
#     else:
#         retry_generation = interrupt(
#         {
#             "question": "Is this correct?",
#             "llm_output": state.messages[-1]
#         })

#         if retry_generation == "y":
#             return "respond"
#         else:
#             return "END"
from typing import Dict, Any
from main_graph.graph_states import AgentState

async def human_approval(state: AgentState, *, config: RunnableConfig) -> Dict[str, Any]:
    logger.info("📍 [HUMAN APPROVAL] Đang chờ phê duyệt từ con người...")
    _binary_score = state.hallucination.binary_score

    if _binary_score == "1":
        # Trong môi trường thực tế, bạn sẽ có logic để hỏi người dùng.
        # Ở đây, chúng ta sẽ mô phỏng việc người dùng không phê duyệt.
        approved = False
    else:
        approved = True

    return {"human_approved": approved}


# viết lại dùng asynopenai
from openai import AsyncOpenAI
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
from langchain_core.messages import AIMessage
from langchain_core.messages import HumanMessage, AIMessage

def convert_messages(messages):
    result = []
    for m in messages:
        if isinstance(m, HumanMessage):
            result.append({"role": "user", "content": m.content})
        elif isinstance(m, AIMessage):
            result.append({"role": "assistant", "content": m.content})
        elif isinstance(m, dict):  # fallback nếu message đã là dict
            result.append(m)
        else:
            raise ValueError(f"Không nhận diện được kiểu message: {m}")
    return result

from langchain_core.messages import AIMessage
from langchain_core.documents import Document
import logging

from typing import List
from langchain_core.documents import Document
import logging

logger = logging.getLogger(__name__)

from langchain_core.documents import Document
from typing import List
import logging

def normalize_docs(docs: List) -> List[Document]:
    """
    Chuyển mọi tài liệu thành Document, bất kể có 'page_content' hay không.
    Nếu chỉ có 'content' thì dùng luôn.
    """
    valid_docs = []
    for doc in docs:
        try:
            # Nếu là Document
            if isinstance(doc, Document):
                content = getattr(doc, "page_content", "") or getattr(doc, "content", "")
                metadata = doc.metadata or {}
            # Nếu là dict
            elif isinstance(doc, dict):
                content = doc.get("page_content") or doc.get("content", "")
                metadata = doc.get("metadata", {})
                metadata.update({
                    "source": doc.get("source", metadata.get("source", "unknown")),
                    "filename": doc.get("filename", metadata.get("filename")),
                    "page": doc.get("page", metadata.get("page")),
                })
            elif isinstance(doc, str):  # ✅ Bổ sung hỗ trợ cho str
                if not doc.strip():
                    continue
                valid_docs.append(Document(page_content=doc.strip(), metadata={"source": "unknown"}))

            else:
                logging.warning(f"[SKIP] Không nhận diện được loại tài liệu: {type(doc)}")
        except Exception as e:
            logging.warning(f"[SKIP] Lỗi xử lý document: {e}")

    return valid_docs


# async def conduct_research(state: AgentState, *, config: RunnableConfig) -> dict[str, Any]:
#     logger.info(f"📍 [RESEARCH] State đầu vào (type: {type(state)}): {state.keys() if isinstance(state, dict) else state}")
#     logger.info(f"📍 [RESEARCH] State content: {state}")

#     router_type = state.router.type
#     retriever = RESEARCHER_MAP.get(router_type)

#     if not retriever:
#         logger.warning(f"Không tìm thấy retriever cho router.type = {router_type}")
#         return {"documents_temp": [], "documents_final": []}

#     query = state.messages[-1]["content"]

#     logger.info("🔍 Truy vấn tài liệu chính (main query)...")
#     raw_docs = await retriever.ainvoke({"question": query})

#     docs = normalize_docs(raw_docs)
#     logger.info(f"[✅ VALID DOCS] Tổng tài liệu hợp lệ: {len(docs)}")
#     logger.info(f"[RESEARCH DONE] Trả về {len(docs)} tài liệu")
#     return {
#         "documents_temp": docs,
#         "documents_final": docs
#     }
#         # Thêm log này:
#     logger.info(f"[DEBUG - RESEARCH OUTPUT STATE] {state}")
# async def conduct_research(state: AgentState, *, config: RunnableConfig) -> dict[str, Any]:
#     logger.info(f"📍 [RESEARCH] State đầu vào (type: {type(state)}): {state.__dict__.keys()}")
#     logger.info(f"📍 [RESEARCH] State content: {state}")

#     router_type = state.router.type # Trực tiếp truy cập state.router (nó là một chuỗi nếu bạn theo Cách 2)
#     retriever = RESEARCHER_MAP.get(router_type)

#     if not retriever:
#         logger.warning(f"Không tìm thấy retriever cho router.type = {router_type}")
#         return {"research_output": {"documents_temp": [], "documents_final": []}} # Cập nhật theo cấu trúc mong đợi

#     query = state.messages[-1]["content"]

#     logger.info("🔍 Truy vấn tài liệu chính (main query)...")
#     raw_docs = await retriever.ainvoke({"question": query})

#     docs = normalize_docs(raw_docs)
#     logger.info(f"[✅ VALID DOCS] Tổng tài liệu hợp lệ: {len(docs)}")
#     logger.info(f"[RESEARCH DONE] Trả về {len(docs)} tài liệu")
#     return {
#         "research_output": { # Đóng gói kết quả vào dictionary với key "research_output"
#             "documents_temp": docs,
#             "documents_final": docs
#         }
#     }
#         # Thêm log này:
#     logger.info(f"[DEBUG - RESEARCH OUTPUT STATE] {state}")

from typing import List, Dict, Any
from langchain_core.documents import Document
from datetime import datetime
from typing import List, Dict, Any
from langchain_core.documents import Document
from datetime import datetime

async def debug_conduct_research(state: AgentState, *, config: RunnableConfig) -> Dict[str, List[Document]]:
    logger.info("🔎 [DEBUG CONDUCT RESEARCH] Bắt đầu mô phỏng quá trình nghiên cứu...")
    messages = state.messages
    last_user_message = messages[-1]["content"] if messages and messages[-1] and "content" in messages[-1] else ""
    research_plan = state.research_plan

    logger.info(f"[DEBUG CONDUCT RESEARCH] Tin nhắn người dùng cuối: '{last_user_message}'")
    logger.info(f"[DEBUG CONDUCT RESEARCH] Kế hoạch nghiên cứu: '{research_plan}'")

    # --- MÔ PHỎNG TẠO QUERIES ---
    queries = []
    if research_plan and "generate_queries" in research_plan:
        logger.info("[DEBUG CONDUCT RESEARCH] Mô phỏng tạo queries...")
        if "học phí" in last_user_message.lower():
            queries.append(f"học phí ngành Y khoa Đại học Y Dược TP.HCM năm {datetime.now().year}")
            queries.append("học phí các trường đại học Y khoa ở TP.HCM")
        else:
            queries.append(f"thông tin liên quan đến '{last_user_message}'")
        logger.info(f"[DEBUG CONDUCT RESEARCH] Các truy vấn mô phỏng: {queries}")
    else:
        queries.append(last_user_message)
        logger.info(f"[DEBUG CONDUCT RESEARCH] Sử dụng trực tiếp tin nhắn làm truy vấn: {queries}")

    # --- MÔ PHỎNG RETRIEVING DOCUMENTS ---
    fake_documents: List[Document] = []
    logger.info("[DEBUG CONDUCT RESEARCH] Mô phỏng việc truy xuất tài liệu...")
    for i, query in enumerate(queries):
        logger.info(f"[DEBUG CONDUCT RESEARCH] Truy vấn mô phỏng {i+1}: '{query}'")
        if "học phí" in query.lower():
            fake_documents.append(Document(page_content=f"Tài liệu giả số {i+1}: Thông tin về học phí ngành Y khoa năm {datetime.now().year} có thể khác nhau tùy theo trường và chương trình.", metadata={"source": "fake_doc_fee"}))
        else:
            fake_documents.append(Document(page_content=f"Tài liệu giả số {i+1}: Đây là một tài liệu mô phỏng liên quan đến truy vấn '{query}'.", metadata={"source": "fake_doc_other"}))
    logger.info(f"[DEBUG CONDUCT RESEARCH] Số lượng tài liệu giả được tạo: {len(fake_documents)}")

    # TRẢ VỀ VỚI KEY "documents_temp"
    return {"documents_temp": fake_documents}
from typing import AsyncGenerator
import json
from langchain_core.messages import AIMessage
from openai import AsyncOpenAI

openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def convert_messages(messages):
    from langchain_core.messages import HumanMessage, AIMessage
    result = []
    for m in messages:
        if isinstance(m, HumanMessage):
            result.append({"role": "user", "content": m.content})
        elif isinstance(m, AIMessage):
            result.append({"role": "assistant", "content": m.content})
        elif isinstance(m, dict):
            result.append(m)
    return result

def format_docs(docs):
    if not docs:
        return "Không có tài liệu tham khảo"
    formatted = []
    for doc in docs:
        content = getattr(doc, "page_content", "")
        source = getattr(doc, "metadata", {}).get("source", "unknown")
        formatted.append(f"[Nguồn: {source}]\n{content[:500]}...")
    return "\n\n".join(formatted)

async def respond_streaming(state) -> AsyncGenerator[str, None]:
    if not state.documents:
        yield json.dumps({
            "stream": "Hiện tôi chưa tìm thấy thông tin cụ thể. Bạn có thể truy cập https://ump.edu.vn để xem thêm."
        })
        yield "[END]"
        return

    context = format_docs(state.documents)
    prompt = RESPONSE_SYSTEM_PROMPT.format(context=context)
    messages = [{"role": "system", "content": prompt}] + convert_messages(state.messages)

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o",  # hoặc GPT_4o_MINI
            messages=messages,
            temperature=0.3,
            stream=True
        )

        async for chunk in response:
            token = chunk.choices[0].delta.content
            if token:
                yield json.dumps({"stream": token})
        yield "[END]"

    except Exception as e:
        print("❌ Lỗi phản hồi:", e)
        yield json.dumps({
            "stream": "Đã xảy ra lỗi khi xử lý. Vui lòng thử lại sau."
        })
        yield "[END]"

from typing import Any, Dict

# def merge_research_results(state: Dict[str, Any], research_output: Dict[str, Any]) -> Dict[str, Any]:
#     """
#     Merges the output of the conduct_research node (documents) into the main AgentState.
#     """
#     documents = research_output.get("documents_final", [])
#     return {
#         "messages": state.get("messages", []),
#         "documents": documents,
#         "router": state.get("router"),
#         # Giữ lại các trường khác của state nếu cần
#         "research_plan": state.get("research_plan"),
#         "steps": state.get("steps"),
#         "documents_temp": research_output.get("documents_temp", []),
#         "documents_final": research_output.get("documents_final", []),
#         # ... các trường khác trong AgentState của bạn
#     }
def merge_research_results(state: Dict[str, Any]) -> Dict[str, Any]:
    print(f"📍 [DEBUG - MERGE STATE]: {state.keys()}")
    """
    Merges the output of the conduct_research node (documents) into the main AgentState.
    """
    research_output = state.research_output if hasattr(state, "research_output") else {}
    documents = research_output.get("documents_final", [])
    return {
        "messages": state.messages if hasattr(state, "messages") else [],
        "documents": documents,
        "router": state.router if hasattr(state, "router") else None,
        # Giữ lại các trường khác của state nếu cần
        "research_plan": state.research_plan if hasattr(state, "research_plan") else None,
        "steps": state.steps if hasattr(state, "steps") else None,
        "documents_temp": research_output.get("documents_temp", []),
        "documents_final": research_output.get("documents_final", []),
        # ... các trường khác trong AgentState của bạn
    }
from langchain_core.runnables import RunnableLambda

def print_state_before_route(state):
    print(f"🟡 [DEBUG - BEFORE ROUTE QUERY STATE]: {state}")
    return state

# # ==== 11. Compile ====
# graph = builder.compile(checkpointer=checkpointer)
from langgraph.graph import StateGraph, START, END
from main_graph.graph_states import AgentState
# def merge_research_results(state: AgentState) -> Dict[str, Any]:
#     """
#     Merges the output of the researcher subgraph (documents) into the main AgentState.
#     """
#     documents = research_output.get("documents", [])
#     return {"messages": state.get("messages", []), "documents": documents, "router": state.get("router")} # Keep other state
from typing import Dict, Any
from main_graph.graph_states import AgentState

# def merge_research_results(state: AgentState) -> Dict[str, Any]:
#     logger.info(f"📍 [MERGE RESULTS] State đầu vào (type: {type(state)}): {state.__dict__.keys()}")
#     logger.info(f"📍 [MERGE RESULTS] State content: {state}")

#     research_output = state.research_output # Truy cập trực tiếp thuộc tính research_output
#     documents_temp = research_output.get("documents_temp", [])
#     documents_final = research_output.get("documents_final", [])

#     # Logic hợp nhất (ví dụ đơn giản là trả về documents_final)
#     merged_documents = documents_final

#     logger.info(f"[MERGE DONE] Tổng tài liệu sau merge: {len(merged_documents)}")
#     return {"documents": merged_documents} # Lưu kết quả vào state với key "documents"
from typing import List, Dict, Any
from langchain_core.documents import Document

async def merge_research_results(state: AgentState, *, config: RunnableConfig) -> Dict[str, List[Document]]:
    logger.info("[MERGE RESULTS] Bắt đầu hợp nhất kết quả nghiên cứu...")
    all_documents: List[Document] = state.research_output.get("documents_temp", [])
    merged_documents: List[Document] = []

    if not all_documents:
        logger.warning("[MERGE DONE] Không có tài liệu nào để hợp nhất.")
        return {"documents": []}

    # Hợp nhất tất cả nội dung vào một document duy nhất
    merged_content = "\n\n".join([doc.page_content for doc in all_documents if doc and doc.page_content])
    merged_metadata = {}  # Bạn có thể cần logic phức tạp hơn để xử lý metadata

    if merged_content:
        merged_documents.append(Document(page_content=merged_content, metadata=merged_metadata))
        logger.info(f"[MERGE DONE] Đã hợp nhất {len(all_documents)} tài liệu. Nội dung sau khi merge (preview): {merged_content[:100]}...")
    else:
        logger.warning("[MERGE DONE] Không có nội dung nào để hợp nhất từ các tài liệu.")

    return {"documents": merged_documents}
def debug_merge_state(state):
    print(f"📍 [DEBUG - PASS MERGE STATE]: {state.__dict__.keys()}")
    return state

def print_state_before_route(state):
    print(f"🟡 [DEBUG - BEFORE ROUTE QUERY STATE]: {state}")
    return state
def print_full_state(state):
    print(f"📍 [DEBUG - FULL MERGE STATE]: {state.__dict__}")
    return {} # Hoặc trả về một dictionary trống


# builder = StateGraph(AgentState)

# # ==== 1. Nodes ====
# builder.add_node("analyze_and_route_query", analyze_and_route_query)
# # builder.add_node("debug_state_before_route", RunnableLambda(print_state_before_route))
# builder.add_node("create_admission_research_plan", create_admission_research_plan)
# builder.add_node("create_student_research_plan", create_student_research_plan)
# # builder.add_node("merge_results", merge_research_results) # ✅ ĐÃ BỎ COMMENT
# # builder.add_node("merge_results", debug_merge_state)
# builder.add_edge("conduct_research", "merge_results")
# builder.add_node("conduct_research", conduct_research)
# # builder.add_node("merge_results", print_full_state)
# builder.add_node("respond", respond)  # ✅ Node stream
# builder.add_node("respond_to_general_query", respond_to_general_query)
# builder.add_node("check_hallucinations", check_hallucinations)
# builder.add_node("human_approval", human_approval)
# # ==== 2. Initial ====
# builder.add_edge(START, "analyze_and_route_query")

# # ==== 3. Routing ====
# # builder.add_conditional_edges(
# #     "analyze_and_route_query",
# #     analyze_and_route_query, # Sử dụng lại hàm này để quyết định route
# #     {
# #         "admission": "create_admission_research_plan",
# #         "student": "create_student_research_plan",
# #         "general": "respond_to_general_query",
# #         "respond": "respond",
# #     }
# # )
# builder.add_conditional_edges(
#     "analyze_and_route_query",
#     lambda state: state.router.type if state.router else None,
#     {
#         "admission": "create_admission_research_plan",
#         "student": "create_student_research_plan",
#         "general": "respond_to_general_query",
#         None: "respond",
#     }
# )
# # ==== 4. Tạo plan →
# builder.add_edge("create_admission_research_plan", "conduct_research")
# builder.add_edge("create_student_research_plan", "conduct_research")
# builder.add_edge("conduct_research", "merge_results")


# # ==== 5. Nghiên cứu xong → merge results → trả lời
# builder.add_edge("merge_results", "respond") # ✅ ĐI ĐẾN RESPOND SAU MERGE
# builder.add_edge("respond", "check_hallucinations")
# builder.add_edge("check_hallucinations", "human_approval")
# # ==== 6. General → trả lời luôn và KẾT THÚC
# builder.add_edge("respond_to_general_query", END)

# # ==== 7. Sau trả lời → kiểm tra hallucination
# builder.add_conditional_edges("check_hallucinations", human_approval, {
#     "respond": "respond",
#     "END": END
# })

# # ==== 8. Kết thúc
# builder.add_edge("check_hallucinations", "human_approval", conditional=lambda state: state.hallucination.binary_score == "1")
# builder.add_edge("human_approval", "__end__", conditional=lambda state: state.human_approved)
# builder.add_edge("check_hallucinations", "__end__", conditional=lambda state: state.hallucination.binary_score == "0")
# builder.add_edge("respond", "check_hallucinations")
# builder.add_edge("check_hallucinations", END)

# # ==== 9. Compile
# graph = builder.compile()
# logger.info(f"[GRAPH EDGES] {graph.get_graph().edges}")

# builder = StateGraph(AgentState)

# # ==== 1. Nodes ====
# builder.add_node("analyze_and_route_query", analyze_and_route_query)
# builder.add_node("create_admission_research_plan", create_admission_research_plan)
# builder.add_node("create_student_research_plan", create_student_research_plan)
# builder.add_node("conduct_research", conduct_research)
# # Chọn một trong hai dòng sau (để debug hoặc chạy chính thức)
# # builder.add_node("merge_results", print_full_state)
# builder.add_node("merge_results", merge_research_results)
# builder.add_node("respond", respond)
# builder.add_node("respond_to_general_query", respond_to_general_query)
# builder.add_node("check_hallucinations", check_hallucinations)
# builder.add_node("human_approval", human_approval) # ✅ Đảm bảo bạn đã định nghĩa hàm 'human_approval'

# # ==== 2. Initial ====
# builder.add_edge(START, "analyze_and_route_query")

# # ==== 3. Routing ====
# builder.add_conditional_edges(
#     "analyze_and_route_query",
#     lambda state: state.router.type if state.router else None,
#     {
#         "admission": "create_admission_research_plan",
#         "student": "create_student_research_plan",
#         "general": "respond_to_general_query",
#         None: "respond",
#     }
# )

# # ==== 4. Tạo plan → nghiên cứu
# builder.add_edge("create_admission_research_plan", "conduct_research")
# builder.add_edge("create_student_research_plan", "conduct_research")

# # ==== 5. Nghiên cứu → merge → trả lời
# builder.add_edge("conduct_research", "merge_results")
# builder.add_edge("merge_results", "respond")

# # ==== 6. General query → trả lời và kết thúc
# builder.add_edge("respond_to_general_query", END)

# # ==== 7. Sau trả lời → kiểm tra hallucination
# builder.add_edge("respond", "check_hallucinations")

# # ==== 8. Kiểm tra hallucination → human approval (nếu có) hoặc kết thúc
# # builder.add_conditional_edges(
# #     "check_hallucinations",
# #     lambda state: "approve" if state.hallucination.binary_score == "1" else "reject",
# #     {
# #         "approve": "human_approval",
# #         "reject": END,
# #     }
# # )

# # Rẽ nhánh dựa trên kết quả kiểm tra hallucination
# builder.add_conditional_edges(
#     "check_hallucinations",
#     lambda state: "require_approval" if state.hallucination.binary_score == "1" else "no_approval",
#     {
#         "require_approval": "human_approval",
#         "no_approval": END,
#     }
# )

# # Rẽ nhánh dựa trên phê duyệt của con người
# builder.add_conditional_edges(
#     "human_approval",
#     lambda state: "retry" if not state.human_approved else "end",
#     {
#         "retry": "respond", # Quay lại node respond để thử lại
#         "end": END,
#     }
# )
async def inspect_documents_before_merge(state: AgentState, *, config: RunnableConfig) -> Dict[str, List[Document]]:
    logger.info("🔎 [INSPECT DOCUMENTS BEFORE MERGE]")
    logger.debug(f"[STATE BEFORE MERGE]: {state}")
    for i, doc in enumerate(state.documents):
        logger.info(f"[DOC {i} BEFORE MERGE]: {doc.page_content[:50]}...") # In 50 ký tự đầu
        logger.debug(f"[FULL DOC {i} BEFORE MERGE]: {doc}") # In toàn bộ document (ở mức debug)
    return {"documents_before_merge": state.documents}
async def inspect_documents_after_merge(state: AgentState, *, config: RunnableConfig) -> Dict[str, List[Document]]:
    logger.info("✅ [INSPECT DOCUMENTS AFTER MERGE]")
    for i, doc in enumerate(state.documents):
        logger.info(f"[DOC {i} AFTER MERGE]: {doc.page_content[:50]}...") # In 50 ký tự đầu
        logger.debug(f"[FULL DOC {i} AFTER MERGE]: {doc}") # In toàn bộ document (ở mức debug)
    return {"documents_after_merge": state.documents}
async def _awaitable_debug_research(state: AgentState, config: RunnableConfig):
    return await debug_conduct_research(state, config=config)
# # ==== 9. Human approval → kết thúc
# builder.add_edge("human_approval", END)

# # ==== 10. Compile
# graph = builder.compile()
# logger.info(f"[GRAPH EDGES] {graph.get_graph().edges}")
builder = StateGraph(AgentState)

# ==== 1. Nodes ====
builder.add_node("analyze_and_route_query", analyze_and_route_query)
builder.add_node("create_admission_research_plan", create_admission_research_plan)
builder.add_node("create_student_research_plan", create_student_research_plan)
# builder.add_node("conduct_research", debug_conduct_research)
builder.add_node("conduct_research", _awaitable_debug_research)
builder.add_node("inspect_docs_before_merge", inspect_documents_before_merge)


# Chọn một trong hai dòng sau (để debug hoặc chạy chính thức)
# builder.add_node("merge_results", print_full_state)
builder.add_node("merge_results", merge_research_results)
builder.add_node("inspect_docs_after_merge", inspect_documents_after_merge)
builder.add_node("respond", respond)
builder.add_node("respond_to_general_query", respond_to_general_query)
builder.add_node("check_hallucinations", check_hallucinations)
builder.add_node("human_approval", human_approval) # ✅ Đảm bảo bạn đã định nghĩa hàm 'human_approval'

# ==== 2. Initial ====
builder.add_edge(START, "analyze_and_route_query")

# ==== 3. Routing ====
builder.add_conditional_edges(
    "analyze_and_route_query",
    lambda state: state.router.type if state.router else None,
    {
        "admission": "create_admission_research_plan",
        "student": "create_student_research_plan",
        "general": "respond_to_general_query",
        None: "respond",
    }
)

# ==== 4. Tạo plan → nghiên cứu
builder.add_edge("create_admission_research_plan", "conduct_research")
builder.add_edge("create_student_research_plan", "conduct_research")
builder.add_edge("conduct_research", "inspect_docs_before_merge")
builder.add_edge("inspect_docs_before_merge", "merge_results") # Chuyển kết quả đến merge_results
builder.add_edge("merge_results", "inspect_docs_after_merge")
builder.add_edge("inspect_docs_after_merge", "respond") # Chuyển kết quả đến respond
# ==== 5. Nghiên cứu → merge → trả lời
# builder.add_edge("conduct_research", "merge_results")
# builder.add_edge("merge_results", "respond")

# ==== 6. General query → trả lời và kết thúc
builder.add_edge("respond_to_general_query", END)

# ==== 7. Sau trả lời → kiểm tra hallucination
builder.add_edge("respond", "check_hallucinations")

# ==== 8. Kiểm tra hallucination → human approval (nếu có) hoặc kết thúc
# builder.add_conditional_edges(
#     "check_hallucinations",
#     lambda state: "approve" if state.hallucination.binary_score == "1" else "reject",
#     {
#         "approve": "human_approval",
#         "reject": END,
#     }
# )

# Rẽ nhánh dựa trên kết quả kiểm tra hallucination
# builder.add_conditional_edges(
#     "check_hallucinations",
#     lambda state: "require_approval" if state.hallucination.binary_score == "1" else "no_approval",
#     {
#         "require_approval": "human_approval",
#         "no_approval": END,
#     }
# )

# # Rẽ nhánh dựa trên phê duyệt của con người
# builder.add_conditional_edges(
#     "human_approval",
#     lambda state: "retry" if not state.human_approved and state.retry_count < state.max_retries else "end",
#     {
#         "retry": "respond", # Quay lại node respond để thử lại
#         "end": END,
#     }
# )
async def human_approval(state: AgentState, *, config: RunnableConfig) -> Dict[str, Any]:
    logger.info("📍 [HUMAN APPROVAL] Đang chờ phê duyệt từ con người...")
    _binary_score = state.hallucination.binary_score
    approved = False # Mặc định là không phê duyệt

    # Logic tương tác thực tế với người dùng ở đây để thay đổi 'approved'

    return {"human_approved": approved}

# Rẽ nhánh sau phê duyệt của con người
builder.add_conditional_edges(
    "human_approval",
    lambda state: "retry" if not state.human_approved and state.retry_count < state.max_retries else "end",
    {
        "retry": "respond",
        "end": END,
    }
)
# Node để tăng biến đếm thử lại
builder.add_node("increment_retry_count", lambda state: {"retry_count": state.retry_count + 1})
builder.add_edge("increment_retry_count", "respond")

# ==== 9. Human approval → kết thúc (đã được xử lý ở conditional edges)
# builder.add_edge("human_approval", END) # Không cần edge này nữa

# ==== 10. Compile
graph = builder.compile()
logger.info(f"[GRAPH EDGES] {graph.get_graph().edges}")