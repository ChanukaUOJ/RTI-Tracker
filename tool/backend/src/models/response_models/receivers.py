from datetime import datetime
from typing import Optional, Sequence, List
from src.models import Position, Institution, PaginationModel
from src.models.response_models import PositionResponse, InstitutionResponse, PositionShortResponse, InstitutionShortResponse
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class ReceiverResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    id: UUID = Field(..., description="Unique identifier for the receiver")
    position: PositionResponse = Field(..., description="Position object of the receiver")
    institution: InstitutionResponse = Field(..., description="Institution object of the receiver")
    emails: Optional[List[str]] = Field(
        None, description="List of receiver emails"
    )
    address: Optional[str] = Field(
        None, description="Address of the receiver"
    )
    contact_nos: Optional[List[str]] = Field(
        None, 
        serialization_alias="contactNos",
        description="List of receiver contact numbers"
    )
    created_at: datetime = Field(..., serialization_alias="createdAt", description="ISO 8601 timestamp of when the receiver was created")
    updated_at: datetime = Field(..., serialization_alias="updatedAt", description="ISO 8601 timestamp of when the receiver was last updated")


class ReceiverShortResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    id: UUID = Field(..., description="Unique identifier for the receiver")
    position: PositionShortResponse = Field(..., description="Position object of the receiver")
    institution: InstitutionShortResponse = Field(..., description="Institution object of the receiver")
    emails: Optional[List[str]] = Field(None, description="List of receiver emails")
    address: Optional[str] = Field(None, description="Address of the receiver")
    contact_nos: Optional[List[str]] = Field(None, serialization_alias="contactNos", description="List of receiver contact numbers")

class ReceiverListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    data: Sequence[ReceiverResponse] = Field([], description="List of receivers")
    pagination: PaginationModel = Field(..., description="Pagination metadata")