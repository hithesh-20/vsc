from typing import Generic, TypeVar, Optional, Any, List
from pydantic import BaseModel

DataT = TypeVar("DataT")


class APIResponse(BaseModel, Generic[DataT]):
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[DataT] = None
    error: Optional[str] = None


class MessageResponse(BaseModel):
    message: str
    success: bool = True
