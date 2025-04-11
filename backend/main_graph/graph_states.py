from dataclasses import dataclass, field
from typing import Annotated, Literal, TypedDict, List

from langchain_core.documents import Document
from langchain_core.messages import AnyMessage, BaseMessage
from langgraph.graph import add_messages

from utils.utils import reduce_docs
from pydantic import BaseModel, Field

@dataclass(kw_only=True)
class InputState:
    """Represents the input state for the agent.

    This class defines the structure of the input state, which includes
    the messages exchanged between the user and the agent. It serves as
    a restricted version of the full State, providing a narrower interface
    to the outside world compared to what is maintained iprint("Hello, World!")ternally.
    """

    messages: Annotated[list[AnyMessage], add_messages]
    
    """Messages track the primary execution state of the agent.

    Typically accumulates a pattern of Human/AI/Human/AI messages; if
    you were to combine this template with a tool-calling ReAct agent pattern,
    it may look like this:

    1. HumanMessage - user input
    2. AIMessage with .tool_calls - agent picking tool(s) to use to collect
         information
    3. ToolMessage(s) - the responses (or errors) from the executed tools
    
        (... repeat steps 2 and 3 as needed ...)
    4. AIMessage without .tool_calls - agent responding in unstructured
        format to the user.

    5. HumanMessage - user responds with the next conversational turn.

        (... repeat steps 2-5 as needed ... )
    
    Merges two lists of messages, updating existing messages by ID.

    By default, this ensures the state is "append-only", unless the
    new message has the same ID as an existing message.
    

    Returns:
        A new list of messages with the messages from `right` merged into `left`.
        If a message in `right` has the same ID as a message in `left`, the
        message from `right` will replace the message from `left`."""
    




class GradeHallucinations(BaseModel):
    """Binary score for hallucination present in generation answer."""

    binary_score: str = Field(
        description="Answer is grounded in the facts, '1' or '0'"
    )


# # Primary agent state
# from typing import List, Dict, Any
# from langchain_core.messages import BaseMessage
# @dataclass(kw_only=True)
# class AgentState(TypedDict):
#     messages: List[BaseMessage]
#     documents: List[Document]  # Hoặc List[Dict[str, Any]] tùy thuộc vào cách bạn xử lý
#     documents_temp: List[Document]
#     documents_final: List[Document]


from typing import List, Dict, Any, Literal, Optional
from pydantic import BaseModel

class Router(BaseModel):
    type: str
    logic: str

class AgentState(BaseModel):
    messages: List[Dict[str, str]]
    documents: List[Any] = []
    router: Optional[Router] = None  # Sử dụng Optional
    research_plan: Optional[str] = None
    research_results: Optional[str] = None
    research_output: Optional[Dict[str, Any]] = None # research_output nên là Dict
    response: Optional[str] = None
    hallucination: Optional[GradeHallucinations] = None # Thêm hallucination
    hallucination_reasoning: Optional[str] = None # Bạn có thể giữ lại nếu muốn
    human_approved: Optional[bool] = None
    retry_count: int = 0
    max_retries: int = 2