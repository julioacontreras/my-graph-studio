from typing import Any

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    code: str
    message: str
    line: int | None = None
    column: int | None = None
    details: list[dict[str, Any]] | None = None
