from typing import Optional
import os
import logging
from uuid import UUID, uuid4
from typing import Dict
from sqlalchemy.exc import IntegrityError
from sqlmodel import select, Session, func, or_
from sqlalchemy.orm import joinedload
from src.models import PaginationModel
from src.services.github_file_service import GithubFileService
from src.models.table_schemas.table_schemas import RTIRequest, RTIStatus, RTIStatusHistory, RTIDirection, Receiver, Sender, RTITemplate, RTIStatusName
from src.models.response_models.rti_requests import RTIRequestResponse, RTIRequestListResponse, RTIRequestExpandedResponse
from src.models.response_models import RTICurrentStatusResponse
from src.models.request_models.rti_requests import RTIRequestRequest, RTIRequestUpdateRequest
from src.core.exceptions import InternalServerException, BadRequestException, NotFoundException, ConflictException
from datetime import datetime, timezone
from src.utils.file_validation import (
    FileValidationPolicy,
    validate_upload_file,
)

logger = logging.getLogger(__name__)

class RTIRequestService:
    """
    This service is responsible for executing all RTI request operations.
    """

    def __init__(self, session: Session, file_service: GithubFileService):
        self.session = session
        self.file_service = file_service

    async def create_rti_request(
        self,
        *,
        request_data: RTIRequestRequest
    ) -> RTIRequestResponse:
        committed = False
        try:
            unique_id = uuid4()
            uploaded_file_path: str | None = None

            # 1. validate file extension
            if not request_data.file:
                raise BadRequestException("RTI Request file is required")

            ext = validate_upload_file(
                request_data.file,
                policy=FileValidationPolicy.RTI_REQUEST,
            )

            # 1.1 Validate foreign keys
            if not self.session.get(Sender, request_data.sender_id):
                raise NotFoundException(f"Sender with id {request_data.sender_id} not found.")
            if not self.session.get(Receiver, request_data.receiver_id):
                raise NotFoundException(f"Receiver with id {request_data.receiver_id} not found.")
            if request_data.rti_template_id and not self.session.get(RTITemplate, request_data.rti_template_id):
                raise NotFoundException(f"RTI Template with id {request_data.rti_template_id} not found.")
    
            file_path = f"rti-requests/{unique_id}/{unique_id}{ext.lower()}"

            # 2. Upload file
            content = await request_data.file.read()
            response = await self.file_service.create_file(
                file_path=file_path,
                content=content,
                message=f"Upload file for RTI Request {unique_id}"
            )

            relative_path = response.get("relative_path", "")
            if not relative_path:
                await self.file_service.delete_file(file_path=file_path)
                raise InternalServerException("[RTI SERVICE] Invalid path response from file service")

            uploaded_file_path = relative_path

            # 3. Insert RTIRequest
            creation_time = datetime.now(timezone.utc)
            if request_data.created_date:
                try:
                    # Handle YYYY-MM-DD format from frontend
                    creation_time = datetime.strptime(request_data.created_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                except ValueError:
                    try:
                        # Fallback for ISO format if needed
                        creation_time = datetime.fromisoformat(request_data.created_date.replace("Z", "+00:00"))
                    except ValueError:
                        logger.warning(f"Invalid created_at format: {request_data.created_date}, defaulting to now")

            rti_request = RTIRequest(
                id=unique_id,
                title=request_data.title,
                description=request_data.description,
                sender_id=request_data.sender_id,
                receiver_id=request_data.receiver_id,
                rti_template_id=request_data.rti_template_id
            )
            self.session.add(rti_request)

            # 4. Insert RTIStatusHistory
            statement = select(RTIStatus).where(RTIStatus.name == RTIStatusName.CREATED)
            created_status = self.session.exec(statement).first()

            if not created_status:
                raise InternalServerException("Status 'CREATED' not found in database.")

            status_history = RTIStatusHistory(
                id=uuid4(),
                rti_request_id=unique_id,
                status_id=created_status.id,
                direction=RTIDirection.sent,
                description="RTI Request Created",
                entry_time=creation_time,
                files=[relative_path]
            )
            self.session.add(status_history)

            self.session.commit()
            committed = True
            self.session.refresh(rti_request)

            return RTIRequestResponse.model_validate(rti_request)

        except (BadRequestException, NotFoundException, ConflictException, InternalServerException):
            raise
        except Exception as e:
            if not committed:
                self.session.rollback()
                # remove the orphaned file from GitHub if the DB commit failed
                if uploaded_file_path:
                    try:
                        await self.file_service.delete_file(file_path=uploaded_file_path)
                    except Exception as ex:
                        logger.error(f"[RTI SERVICE] Compensating transaction failed — could not delete {uploaded_file_path}: {ex}")

            if isinstance(e, IntegrityError):
                logger.error(f"[RTI SERVICE] Integrity error creating RTI request: {e}")
                raise ConflictException("Database integrity error occurred while creating the RTI Request.") from e

            logger.error(f"[RTI SERVICE] Error creating RTI request: {e}")
            raise InternalServerException(f"Failed to create RTI request: {e}") from e

    # API
    def get_rti_requests(
        self,
        *,
        page: int = 1,
        page_size: int = 10,
        search_query: Optional[str] = None
    ) -> RTIRequestListResponse:
        """Fetches a paginated list of RTI Requests."""
        try:
            offset = (page - 1) * page_size

            # Apply search filter if provided
            search_filters = []
            if search_query:
                query = search_query.strip()
                search_filters.append(
                    or_(
                        RTIRequest.title.icontains(query),
                        RTIRequest.description.icontains(query)
                    )
                )

            # subquery to rank history records
            rank_subq = (
                select(
                    RTIStatusHistory.id.label("history_id"),
                    RTIStatusHistory.rti_request_id,
                    func.row_number().over(
                        partition_by=RTIStatusHistory.rti_request_id,
                        order_by=[RTIStatusHistory.entry_time.desc(), RTIStatusHistory.created_at.desc()]
                    ).label("rn")
                )
                .subquery()
            )

            # main query
            statement_records = (
                select(RTIRequest, RTIStatusHistory, RTIStatus)
                .options(
                    joinedload(RTIRequest.sender),
                    joinedload(RTIRequest.receiver),
                    joinedload(RTIRequest.rti_template)
                )
                .outerjoin(rank_subq, (RTIRequest.id == rank_subq.c.rti_request_id) & (rank_subq.c.rn == 1))
                .outerjoin(RTIStatusHistory, RTIStatusHistory.id == rank_subq.c.history_id)
                .outerjoin(RTIStatus, RTIStatusHistory.status_id == RTIStatus.id)
                .where(*search_filters)
                .order_by(RTIRequest.created_at.desc())
                .offset(offset)
                .limit(page_size)
            )

            results = self.session.exec(statement_records).unique().all()

            data = []
            for rti_req, history, status_obj in results:
                current_status_data = None
                if status_obj and history:
                    current_status_data = RTICurrentStatusResponse(
                        id=status_obj.id,
                        name=status_obj.name,
                        updated_at=history.entry_time
                    )

                data.append(
                    RTIRequestExpandedResponse(
                        **RTIRequestResponse.model_validate(rti_req).model_dump(),
                        current_status=current_status_data
                    )
                )
            
            # fetch the total record count (with same filters applied)
            statement_count = (
                select(func.count(RTIRequest.id))
                .select_from(RTIRequest)
                .where(*search_filters)
            )
            total_items = self.session.exec(statement_count).one()

            # pagination response
            pagination = PaginationModel(
                page=page,
                page_size=page_size,
                total_items=total_items,
                total_pages=(total_items + page_size - 1) // page_size if total_items > 0 else 0
            )

            return RTIRequestListResponse(
                data=data,
                pagination=pagination
            )
        except Exception as e:
            logger.error(f"Error fetching RTI requests: {e}")
            raise InternalServerException("Failed to fetch RTI requests from database.") from e

    # API
    def get_rti_request_by_id(
        self,
        *,
        request_id: UUID
    ) -> RTIRequestResponse:
        """Fetches a single RTI Request by its ID."""
        try:
            try:
                target_id = UUID(request_id) if isinstance(request_id, str) else request_id
            except ValueError:
                raise BadRequestException(f"Invalid UUID format: {request_id}")

            rti_request = self.session.get(RTIRequest, target_id)

            if not rti_request:
                raise NotFoundException(f"RTI Request with id {request_id} not found.")

            return RTIRequestResponse.model_validate(rti_request)

        except (BadRequestException, NotFoundException):
            raise
        except Exception as e:
            logger.error(f"[RTI SERVICE] Error reading RTI request: {e}")
            raise InternalServerException(f"Failed to read RTI request: {e}") from e

    # API
    async def update_rti_request(
        self,
        *,
        request_data: RTIRequestUpdateRequest
    ) -> RTIRequestResponse:
        """Updates an existing RTI Request."""
        committed = False
        try:
            target_id = request_data.id
            if not target_id:
                raise BadRequestException("RTI Request ID is required for update")

            rti_request = self.session.get(RTIRequest, target_id)
            if not rti_request:
                raise NotFoundException(f"RTI Request with id {target_id} not found.")

            # Check if request has progressed
            statement_histories = select(RTIStatusHistory).where(RTIStatusHistory.rti_request_id == target_id)
            histories = self.session.exec(statement_histories).all()
            if len(histories) > 1:
                raise ConflictException("Cannot update RTI Request because it has associated status history records beyond creation.")

            # Validate foreign keys if they are being updated
            update_data = request_data.model_dump(exclude_unset=True)
            if update_data.get("sender_id") and not self.session.get(Sender, update_data["sender_id"]):
                raise NotFoundException(f"Sender with id {update_data['sender_id']} not found.")
            if update_data.get("receiver_id") and not self.session.get(Receiver, update_data["receiver_id"]):
                raise NotFoundException(f"Receiver with id {update_data['receiver_id']} not found.")
            if update_data.get("rti_template_id") and not self.session.get(RTITemplate, update_data["rti_template_id"]):
                raise NotFoundException(f"RTI Template with id {update_data['rti_template_id']} not found.")

            old_file_data: Dict | None = None
            old_file_path: str | None = None
            new_file_path: str | None = None

            # 1. Update file if provided
            if request_data.file:
                ext = validate_upload_file(
                    request_data.file,
                    policy=FileValidationPolicy.RTI_REQUEST,
                )

                # Find the 'CREATED' status history to get the current file path
                status_statement = select(RTIStatus).where(RTIStatus.name == RTIStatusName.CREATED)
                created_status = self.session.exec(status_statement).first()

                if not created_status:
                    raise InternalServerException("Status 'CREATED' not found in database.")

                history_statement = select(RTIStatusHistory).where(
                    RTIStatusHistory.rti_request_id == target_id,
                    RTIStatusHistory.status_id == created_status.id
                )
                status_history = self.session.exec(history_statement).first()

                if not status_history or not status_history.files:
                    raise InternalServerException("Initial file record not found for this RTI Request.")

                old_file_path = status_history.files[0]
                new_file_content = await request_data.file.read()

                # If extension is same, update in place. If different, create new & delete old.
                _, old_ext = os.path.splitext(old_file_path)
                
                if ext.lower() == old_ext.lower():
                    # Same extension: Update existing file
                    old_file_data = await self.file_service.read_file(old_file_path)
                    response = await self.file_service.update_file(
                        file_path=old_file_path,
                        content=new_file_content,
                        sha=old_file_data["sha"],
                        message=f"Update content for RTI Request {target_id}"
                    )
                else:
                    # Different extension: Create new, will delete old on success
                    new_file_path = f"rti-requests/{target_id}/{target_id}{ext.lower()}"
                    response = await self.file_service.create_file(
                        file_path=new_file_path,
                        content=new_file_content,
                        message=f"Update file (new extension) for RTI Request {target_id}"
                    )

                    relative_path = response.get("relative_path", "")
                    if not relative_path:
                        await self.file_service.delete_file(file_path=new_file_path)
                        raise InternalServerException("[RTI SERVICE] Invalid path response from file service")

                    new_file_path = relative_path
                    status_history.files = [new_file_path]
                    self.session.add(status_history)

            # Update other fields
            for key, value in update_data.items():
                if key not in ["id", "file"] and value is not None and hasattr(rti_request, key):
                    setattr(rti_request, key, value)

            self.session.add(rti_request)
            self.session.commit()
            committed = True
            
            # If extension changed and commit succeeded, delete the old file
            if new_file_path and old_file_path:
                try:
                    await self.file_service.delete_file(file_path=old_file_path)
                except Exception as ex:
                    # We log the failure but do not raise it, as the DB is already committed
                    # referencing the new file. The old file is now an orphan.
                    logger.error(f"[RTI SERVICE] Failed to delete old file {old_file_path} from GitHub after commit: {ex}")

            self.session.refresh(rti_request)
            return RTIRequestResponse.model_validate(rti_request)

        except (BadRequestException, NotFoundException, ConflictException, InternalServerException):
            raise
        except Exception as e:
            if not committed:
                self.session.rollback()
                
                # Compensating transactions for file updates (only if NOT committed)
                if old_file_data and old_file_path:
                    # Restore old version
                    try:
                        current_file_data = await self.file_service.read_file(old_file_path)
                        await self.file_service.update_file(
                            file_path=old_file_path,
                            content=old_file_data["content"],
                            sha=current_file_data["sha"],
                            message=f"Rollback: restore previous version for {target_id}"
                        )
                    except Exception as ex:
                        logger.error(f"[RTI SERVICE] Rollback failed (restore old): {ex}")
                elif new_file_path:
                    # Delete newly created file
                    try:
                        await self.file_service.delete_file(file_path=new_file_path)
                    except Exception as ex:
                        logger.error(f"[RTI SERVICE] Rollback failed (delete new): {ex}")

            if isinstance(e, IntegrityError):
                logger.error(f"[RTI SERVICE] Integrity error updating RTI request: {e}")
                raise ConflictException("Database integrity error occurred while updating the RTI Request.") from e

            logger.error(f"[RTI SERVICE] Error updating RTI request: {e}")
            raise InternalServerException(f"Failed to update RTI request: {e}") from e

    # API
    async def delete_rti_request(
        self,
        *,
        request_id: UUID
    ) -> None:
        """Deletes an RTI Request and its associated history and files."""
        try:
            target_id = request_id
            rti_request = self.session.get(RTIRequest, target_id)
            if not rti_request:
                raise NotFoundException(f"RTI Request with id {target_id} not found.")

            # 1. Fetch all histories and their files
            statement = select(RTIStatusHistory).where(RTIStatusHistory.rti_request_id == target_id)
            histories = self.session.exec(statement).all()
            
            # If there are more than 1 history record, it means the request has progressed
            # and should not be deleted according to business rules.
            if len(histories) > 1:
                raise ConflictException("Cannot delete RTI Request because it has associated status history records beyond creation.")

            all_file_paths = []
            for history in histories:
                if history.files:
                    all_file_paths.extend(history.files)

            # 2. Perform DB Deletion
            try:
                # Delete histories
                for history in histories:
                    self.session.delete(history)

                # Delete the request
                self.session.delete(rti_request)
                self.session.commit()

            except IntegrityError:
                self.session.rollback()
                raise ConflictException("Cannot delete RTI Request because it is connected to other entities.")

            # 3. Clean up files from GitHub after successful DB deletion
            # If this fails, we log it as orphaned files for manual cleanup.
            for file_path in all_file_paths:
                try:
                    await self.file_service.delete_file(file_path=file_path)
                except Exception as ex:
                    logger.error(f"[RTI SERVICE] Failed to delete orphaned file from GitHub: {file_path}. Error: {ex}")

        except (BadRequestException, NotFoundException, ConflictException):
            raise
        except Exception as e:
            self.session.rollback()
            logger.error(f"[RTI SERVICE] Error deleting RTI request: {e}")
            raise InternalServerException(f"Failed to delete RTI request: {e}") from e
    

            
