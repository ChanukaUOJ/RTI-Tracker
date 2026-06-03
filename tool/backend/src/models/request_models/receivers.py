from pydantic import BaseModel, Field, ConfigDict, EmailStr, model_validator
from typing import Optional, List, Annotated
from uuid import UUID
from src.core.exceptions import BadRequestException

class ReceiverUpdateRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True, populate_by_name=True)
    
    position_id: Optional[UUID] = Field(None, alias="positionId", description="ID of the position")
    institution_id: Optional[UUID] = Field(None, alias="institutionId", description="ID of the institution")
    emails: Optional[List[EmailStr]] = Field(None, description="List of receiver emails")
    address: Optional[str] = Field(None, description="Address of the receiver")
    contact_nos: Optional[List[Annotated[str, Field(pattern=r"^(?:\+94|0)\d{9}$")]]] = Field(None, alias="contactNos", description="List of receiver contact numbers")

class ReceiverRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True, populate_by_name=True)
    
    position_id: UUID = Field(..., alias="positionId", description="ID of the position")
    institution_id: UUID = Field(..., alias="institutionId", description="ID of the institution")
    emails: Optional[List[EmailStr]] = Field(None, description="List of receiver emails")
    address: Optional[str] = Field(None, description="Address of the receiver")
    contact_nos: Optional[List[Annotated[str, Field(pattern=r"^(?:\+94|0)\d{9}$")]]] = Field(None, alias="contactNos", description="List of receiver contact numbers")

    @model_validator(mode="after")
    def validate_email_or_contact(self):
        if not self.emails and not self.contact_nos:
            raise BadRequestException("Either email or contactNo must be provided.")
        return self
