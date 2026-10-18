from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class APIError(BaseModel):
    """Standardized error model across GameVerse API."""
    code: str = Field(
        ...,
        description="Machine-readable error code",
        examples=["AUTHENTICATION_FAILED"]
    )
    message: str = Field(
        ...,
        description="Human-readable explanation of error",
        examples=["Invalid login credentials."]
    )
    details: Any | None = Field(
        default=None,
        description="Optional extra error details or validation issues"
    )


class APIResponse(BaseModel, Generic[T]):
    """
    Standardized top-level response envelope:
    { "success": bool, "data": ..., "error": { "code": str, "message": str } | null }
    """
    success: bool = Field(default=True, description="Whether the operation succeeded")
    data: T | None = Field(default=None, description="Payload data returned when successful")
    error: APIError | None = Field(default=None, description="Error details when success is False")
