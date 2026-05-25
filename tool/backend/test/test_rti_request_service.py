# tests/test_rti_request_service.py
import uuid
import pytest
from unittest.mock import MagicMock, AsyncMock
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy import text
from sqlmodel import SQLModel, Session, create_engine, select
from datetime import datetime, timezone

import src.utils.file_validation as file_validation
from src.services.rti_request_service import RTIRequestService
from src.utils.file_validation import FileValidationPolicy, FileValidationRules
from src.models.table_schemas.table_schemas import (
    RTIRequest, RTIStatus, RTIStatusHistory, RTIDirection, 
    Sender, Receiver
)
from src.models.response_models.rti_requests import RTIRequestResponse, RTIRequestListResponse, RTIRequestExpandedResponse
from src.core.exceptions import (
    InternalServerException, BadRequestException, 
    NotFoundException, ConflictException
)

# test create rti request
@pytest.mark.asyncio
async def test_create_rti_request_success(rti_request_db, make_file_service, make_rti_request_request):
    """Happy path: RTI Request is created along with status history."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    fs = make_file_service(relative_path="rti-requests/dir/file.pdf")
    service = RTIRequestService(session=rti_request_db, file_service=fs)
    
    request = make_rti_request_request(
        sender_id=sender.id,
        receiver_id=receiver.id,
        title="My Sample RTI Request"
    )
    
    result = await service.create_rti_request(request_data=request)
    
    assert isinstance(result, RTIRequestResponse)
    assert result.title == "My Sample RTI Request"
    assert result.sender.id == sender.id
    assert result.receiver.id == receiver.id
    
    # Check if RTIRequest record exists
    db_request = rti_request_db.exec(select(RTIRequest).where(RTIRequest.id == result.id)).first()
    assert db_request is not None
    
    # Check if RTIStatusHistory record exists
    db_history = rti_request_db.exec(select(RTIStatusHistory).where(RTIStatusHistory.rti_request_id == result.id)).first()
    assert db_history is not None
    assert db_history.direction == RTIDirection.sent
    assert db_history.files == ["rti-requests/dir/file.pdf"]
    
    # Verify file service was called
    fs.create_file.assert_called_once()

@pytest.mark.asyncio
async def test_create_rti_request_with_custom_date(rti_request_db, make_file_service, make_rti_request_request):
    """Verifies that an RTI Request is created with a custom created_date."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    fs = make_file_service(relative_path="rti-requests/custom/file.pdf")
    service = RTIRequestService(session=rti_request_db, file_service=fs)
    
    custom_date = "2023-05-15"
    request = make_rti_request_request(
        sender_id=sender.id,
        receiver_id=receiver.id,
        title="Custom Date RTI Request",
        created_date=custom_date
    )
    
    result = await service.create_rti_request(request_data=request)
    
    assert isinstance(result, RTIRequestResponse)
    
    # Check DB record
    db_request = rti_request_db.exec(select(RTIRequest).where(RTIRequest.id == result.id)).first()
    assert db_request is not None
    assert db_request.created_at.year == datetime.now().year
    assert db_request.created_at.month == datetime.now().month
    assert db_request.created_at.day == datetime.now().day 
    
    # Check Status History entry_time
    db_history = rti_request_db.exec(select(RTIStatusHistory).where(RTIStatusHistory.rti_request_id == result.id)).first()
    assert db_history is not None
    assert db_history.entry_time == datetime(2023, 5, 15)
    # Check that history record itself has a current created_at (auto-handled)
    assert db_history.created_at.year == datetime.now().year
    assert db_history.created_at.month == datetime.now().month
    assert db_history.created_at.day == datetime.now().day

@pytest.mark.asyncio
async def test_create_rti_request_with_iso_custom_date(rti_request_db, make_file_service, make_rti_request_request):
    """Verifies that an RTI Request is created with a custom ISO format created_date."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    fs = make_file_service(relative_path="rti-requests/iso/file.pdf")
    service = RTIRequestService(session=rti_request_db, file_service=fs)
    
    custom_date = "2023-06-20T10:30:00Z"
    request = make_rti_request_request(
        sender_id=sender.id,
        receiver_id=receiver.id,
        title="ISO Date RTI Request",
        created_date=custom_date
    )
    
    result = await service.create_rti_request(request_data=request)
    
    # Check DB record
    db_request = rti_request_db.exec(select(RTIRequest).where(RTIRequest.id == result.id)).first()
    assert db_request is not None
    # RTIRequest.created_at should be current time (handled by DB)
    assert db_request.created_at.year == datetime.now().year
    assert db_request.created_at.month == datetime.now().month
    assert db_request.created_at.day == datetime.now().day 
    
    # Check Status History entry_time
    db_history = rti_request_db.exec(select(RTIStatusHistory).where(RTIStatusHistory.rti_request_id == result.id)).first()
    assert db_history is not None
    # entry_time should be the custom ISO date
    assert db_history.entry_time == datetime(2023, 6, 20, 10, 30)
    # history.created_at should be current time (handled by DB)
    assert db_history.created_at.year == datetime.now().year
    assert db_history.created_at.month == datetime.now().month
    assert db_history.created_at.day == datetime.now().day

@pytest.mark.asyncio
async def test_create_rti_request_invalid_file_extension(rti_request_db, make_file_service, make_rti_request_request):
    """BadRequestException raised for unsupported file extensions."""
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    request = make_rti_request_request(filename="test.exe")
    
    with pytest.raises(BadRequestException) as exc:
        await service.create_rti_request(request_data=request)
    assert "extension" in str(exc.value)

@pytest.mark.asyncio
async def test_create_rti_request_invalid_content_type(rti_request_db, make_file_service, make_rti_request_request):
    """BadRequestException raised for unsupported request MIME types."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())

    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id, content_type="text/plain")

    with pytest.raises(BadRequestException) as exc:
        await service.create_rti_request(request_data=request)
    assert "content type" in str(exc.value)

@pytest.mark.asyncio
async def test_create_rti_request_uppercase_extension_allowed(rti_request_db, make_file_service, make_rti_request_request):
    """Uppercase request file extensions are normalized before validation."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()

    fs = make_file_service(relative_path="rti-requests/dir/file.pdf")
    service = RTIRequestService(session=rti_request_db, file_service=fs)

    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id, filename="TEST.PDF")

    result = await service.create_rti_request(request_data=request)

    assert result.sender.id == sender.id

@pytest.mark.asyncio
async def test_create_rti_request_missing_created_status(rti_request_db, make_file_service, make_rti_request_request):
    """InternalServerException raised when 'CREATED' status is missing from DB."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    # Delete the CREATED status
    rti_request_db.exec(select(RTIStatus).where(RTIStatus.name == "CREATED")).first()
    rti_request_db.delete(rti_request_db.exec(select(RTIStatus).where(RTIStatus.name == "CREATED")).first())
    rti_request_db.commit()
    
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    
    with pytest.raises(InternalServerException) as exc:
        await service.create_rti_request(request_data=request)
    assert "Status 'CREATED' not found" in str(exc.value)

@pytest.mark.asyncio
async def test_create_rti_request_db_failure_rolls_back(rti_request_db, monkeypatch, make_file_service, make_rti_request_request):
    """Verifies rollback and GitHub file deletion on DB commit failure."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    relative_path = "rti-requests/fail/file.pdf"
    fs = make_file_service(relative_path=relative_path)
    service = RTIRequestService(session=rti_request_db, file_service=fs)
    
    # Mock commit failure
    monkeypatch.setattr(rti_request_db, "commit", MagicMock(side_effect=Exception("DB Error")))
    rollback_mock = MagicMock()
    monkeypatch.setattr(rti_request_db, "rollback", rollback_mock)
    
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    
    with pytest.raises(InternalServerException):
        await service.create_rti_request(request_data=request)
    
    rollback_mock.assert_called_once()
    fs.delete_file.assert_called_once_with(file_path=relative_path)

@pytest.mark.asyncio
async def test_create_rti_request_not_found(rti_request_db, make_file_service, make_rti_request_request):
    """NotFoundException raised when a foreign key (sender/receiver) is not found."""
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    # Use a non-existent sender_id
    non_existent_sender_id = uuid.uuid4()
    
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    request = make_rti_request_request(sender_id=non_existent_sender_id, receiver_id=receiver.id)
    
    with pytest.raises(NotFoundException):
        await service.create_rti_request(request_data=request)

@pytest.mark.asyncio
async def test_create_rti_request_without_description(rti_request_db, make_file_service, make_rti_request_request):
    """Optional description can be None without breaking the creation flow."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id, title="No Desc")
    request.description = None
    
    result = await service.create_rti_request(request_data=request)
    assert result.description is None
    assert result.title == "No Desc"

@pytest.mark.asyncio
async def test_create_rti_request_integrity_error(rti_request_db, make_file_service, make_rti_request_request):
    """IntegrityError during creation (e.g. NOT NULL violation) is mapped to ConflictException."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    # Create a request with title=None to trigger NOT NULL constraint violation on RTIRequest.title
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    request.title = None 
    
    with pytest.raises(ConflictException):
        await service.create_rti_request(request_data=request)

@pytest.mark.asyncio
async def test_create_rti_request_missing_file(rti_request_db, make_file_service, make_rti_request_request):
    """BadRequestException if file is missing in RTI Request creation."""
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    request = make_rti_request_request()
    request.file = None
    
    with pytest.raises(BadRequestException) as exc:
        await service.create_rti_request(request_data=request)
    assert "file is required" in str(exc.value)

@pytest.mark.asyncio
async def test_create_rti_request_invalid_template(rti_request_db, make_file_service, make_rti_request_request):
    """NotFoundException if rti_template_id is provided but not found in DB."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    request = make_rti_request_request(
        sender_id=sender.id, 
        receiver_id=receiver.id,
        rti_template_id=uuid.uuid4()
    )
    
    with pytest.raises(NotFoundException) as exc:
        await service.create_rti_request(request_data=request)
    assert "RTI Template" in str(exc.value)

# test get rti request by id
@pytest.mark.asyncio
async def test_get_rti_request_by_id_success(rti_request_db, make_file_service, make_rti_request_request):
    """Happy path: RTI Request is retrieved by ID."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    # Create one
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    created = await service.create_rti_request(request_data=request)
    
    # Get by ID
    result = service.get_rti_request_by_id(request_id=created.id)
    
    assert isinstance(result, RTIRequestResponse)
    assert result.id == created.id
    assert result.title == created.title
    assert result.description == created.description
    assert result.sender.id == sender.id
    assert result.receiver.id == receiver.id
    assert result.rti_template is None  # Since we didn't provide one
    assert result.created_at is not None
    assert result.updated_at is not None

@pytest.mark.asyncio
async def test_get_rti_request_by_id_not_found(rti_request_db, make_file_service):
    """NotFoundException raised when ID doesn't exist."""
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    with pytest.raises(NotFoundException) as exc:
        service.get_rti_request_by_id(request_id=99999)
    assert "not found" in str(exc.value)


@pytest.mark.asyncio
async def test_get_rti_request_by_id_internal_error(rti_request_db, monkeypatch, make_file_service):
    """InternalServerException raised on database failure during retrieval."""
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    # Mock session.get to raise an exception
    monkeypatch.setattr(rti_request_db, "get", MagicMock(side_effect=Exception("DB breakdown")))
    
    with pytest.raises(InternalServerException) as exc:
        service.get_rti_request_by_id(request_id=99999)
    assert "Failed to read RTI request" in str(exc.value)

# test get rti request
@pytest.mark.asyncio
async def test_get_rti_requests_success(rti_request_db, make_file_service, make_rti_request_request):
    """Verifies fetching paginated RTI Requests."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    fs = make_file_service()
    service = RTIRequestService(session=rti_request_db, file_service=fs)
    
    # Create 3 RTI requests
    for i in range(3):
        request = make_rti_request_request(
            sender_id=sender.id,
            receiver_id=receiver.id,
            title=f"RTI Request {i}"
        )
        await service.create_rti_request(request_data=request)
    
    # Test fetching with page_size=2
    response = service.get_rti_requests(page=1, page_size=2)

    assert isinstance(response, RTIRequestListResponse)
    
    assert len(response.data) == 2
    assert response.pagination.total_items == 3
    assert response.pagination.total_pages == 2
    assert response.pagination.page == 1
    assert response.pagination.page_size == 2

@pytest.mark.asyncio
async def test_get_rti_requests_with_no_history(rti_request_db, make_file_service):
    """Verifies that requests with no history records have null current_status."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    # Manually create a request without using the service (to bypass history creation)
    req_id = 99999
    req = RTIRequest(
        id=req_id,
        title="No History Request",
        sender_id=sender.id,
        receiver_id=receiver.id,
        file="some/file.pdf"
    )
    rti_request_db.add(req)
    rti_request_db.commit()
    
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    response = service.get_rti_requests(page=1, page_size=10)
    
    # Find our request in the list
    found = next((r for r in response.data if r.id == req_id), None)
    assert found is not None
    assert isinstance(found, RTIRequestExpandedResponse)
    assert found.current_status is None

@pytest.mark.asyncio
async def test_get_rti_requests_latest_status_only(rti_request_db, make_file_service):
    """Verifies that only the latest status is returned for a request with multiple history records."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    # 1. Create a request
    req_id = 99999
    req = RTIRequest(
        id=req_id,
        title="Multiple History Request",
        sender_id=sender.id,
        receiver_id=receiver.id,
        file="some/file.pdf"
    )
    rti_request_db.add(req)
    rti_request_db.commit()
    
    # 2. Add multiple status records
    # First, ensure we have statuses
    s1 = RTIStatus(id=uuid.uuid4(), name="PENDING")
    s2 = RTIStatus(id=uuid.uuid4(), name="DELIVERED")
    rti_request_db.add(s1)
    rti_request_db.add(s2)
    rti_request_db.commit()
    
    # Older history
    h1 = RTIStatusHistory(
        id=uuid.uuid4(),
        rti_request_id=req_id,
        status_id=s1.id,
        entry_time=datetime(2023, 1, 1),
        direction=RTIDirection.sent,
        files=[]
    )
    # Newer history
    h2 = RTIStatusHistory(
        id=uuid.uuid4(),
        rti_request_id=req_id,
        status_id=s2.id,
        entry_time=datetime(2023, 1, 2),
        direction=RTIDirection.received,
        files=[]
    )
    rti_request_db.add(h1)
    rti_request_db.add(h2)
    rti_request_db.commit()
    
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    response = service.get_rti_requests(page=1, page_size=10)
    
    found = next((r for r in response.data if r.id == req_id), None)
    assert found is not None
    assert found.current_status is not None
    assert found.current_status.name == "DELIVERED"
    # Note: Depending on SQLite datetime handling, we might need to compare carefully
    assert found.current_status.updated_at.year == 2023
    assert found.current_status.updated_at.day == 2

@pytest.mark.asyncio
async def test_get_rti_requests_empty_db(make_file_service):
    """Test behavior when there are no requests in the database."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        service = RTIRequestService(session=session, file_service=make_file_service())
        response = service.get_rti_requests()
        
        assert response.pagination.page == 1
        assert response.pagination.total_items == 0
        assert response.pagination.total_pages == 0
        assert response.data == []

@pytest.mark.asyncio
async def test_get_rti_requests_page_out_of_bounds(rti_request_db, make_file_service):
    """Requesting a page beyond total pages should return empty list."""
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    response = service.get_rti_requests(page=10, page_size=2)
    
    assert response.pagination.page == 10
    assert response.data == []

@pytest.mark.asyncio
async def test_get_rti_requests_search_by_title(rti_request_db, make_file_service, make_rti_request_request):
    """Verifies that RTI Requests can be filtered by title."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())

    # Create requests with specific titles
    await service.create_rti_request(request_data=make_rti_request_request(
        sender_id=sender.id, receiver_id=receiver.id, title="Sample1 Report"
    ))
    await service.create_rti_request(request_data=make_rti_request_request(
        sender_id=sender.id, receiver_id=receiver.id, title="Sample2 Report"
    ))

    # Search for "Sample1"
    response = service.get_rti_requests(search_query="Sample1")
    assert len(response.data) == 1
    assert response.data[0].title == "Sample1 Report"
    assert response.pagination.total_items == 1

@pytest.mark.asyncio
async def test_get_rti_requests_search_by_partial_title(rti_request_db, make_file_service, make_rti_request_request):
    """Verifies that RTI Requests can be filtered by title(partial)."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())

    # Create requests with specific titles
    await service.create_rti_request(request_data=make_rti_request_request(
        sender_id=sender.id, receiver_id=receiver.id, title="Sample1 Request title meeting minutes"
    ))
    await service.create_rti_request(request_data=make_rti_request_request(
        sender_id=sender.id, receiver_id=receiver.id, title="General template 2026"
    ))

    # Search for "Gen"
    response = service.get_rti_requests(search_query="gen")
    assert len(response.data) == 1
    assert response.data[0].title == "General template 2026"
    assert response.pagination.total_items == 1

@pytest.mark.asyncio
async def test_get_rti_requests_search_by_description(rti_request_db, make_file_service, make_rti_request_request):
    """Verifies that RTI Requests can be filtered by description."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())

    # Create requests with specific descriptions
    await service.create_rti_request(request_data=make_rti_request_request(
        sender_id=sender.id, receiver_id=receiver.id, title="R1", description="Contains secret data"
    ))
    await service.create_rti_request(request_data=make_rti_request_request(
        sender_id=sender.id, receiver_id=receiver.id, title="R2", description="Public info"
    ))

    # Search for "secret"
    response = service.get_rti_requests(search_query="secret")
    assert len(response.data) == 1
    assert response.data[0].title == "R1"
    assert response.pagination.total_items == 1

@pytest.mark.asyncio
async def test_get_rti_requests_search_by_partial_description(rti_request_db, make_file_service, make_rti_request_request):
    """Verifies that RTI Requests can be filtered by description."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())

    # Create requests with specific descriptions
    await service.create_rti_request(request_data=make_rti_request_request(
        sender_id=sender.id, receiver_id=receiver.id, title="R1", description="Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s."
    ))
    await service.create_rti_request(request_data=make_rti_request_request(
        sender_id=sender.id, receiver_id=receiver.id, title="R2", description="There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable."
    ))

    # Search for "dummy"
    response = service.get_rti_requests(search_query="dummy")
    assert len(response.data) == 1
    assert response.data[0].title == "R1"
    assert response.pagination.total_items == 1

@pytest.mark.asyncio
async def test_get_rti_requests_search_no_results(rti_request_db, make_file_service, make_rti_request_request):
    """Verifies that searching for a non-existent term returns empty data."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())

    await service.create_rti_request(request_data=make_rti_request_request(
        sender_id=sender.id, receiver_id=receiver.id, title="Something"
    ))

    # Search for "missing"
    response = service.get_rti_requests(search_query="missing")
    assert len(response.data) == 0
    assert response.pagination.total_items == 0

@pytest.mark.asyncio
async def test_get_rti_requests_internal_error(rti_request_db, monkeypatch, make_file_service):
    """Simulate a database failure during listing and ensure InternalServerException is raised."""
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    def fake_exec(*args, **kwargs):
        raise OperationalError("Fake DB failure", None, None)
    
    monkeypatch.setattr(rti_request_db, "exec", fake_exec)
    
    with pytest.raises(InternalServerException):
        service.get_rti_requests()

# test update rti request
@pytest.mark.asyncio
async def test_update_rti_request_success(rti_request_db, make_file_service, make_rti_request_request, make_rti_request_update_request):
    """Happy path: RTI Request title and description are updated."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    # Create one
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    created = await service.create_rti_request(request_data=request)
    
    # Update title and description
    update_request = make_rti_request_update_request(id=created.id, title="New Title", description="New Desc")
    result = await service.update_rti_request(request_data=update_request)
    
    assert result.title == "New Title"
    assert result.description == "New Desc"

@pytest.mark.asyncio
async def test_update_rti_request_with_file_success(rti_request_db, make_file_service, make_rti_request_request, make_rti_request_update_request):
    """Updating RTI Request with a new file calls the file service's update_file."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    relative_path = "rti-requests/update/file.pdf"
    fs = make_file_service(relative_path=relative_path)
    fs.read_file = AsyncMock(return_value={"content": b"old content", "sha": "old-sha"})
    
    service = RTIRequestService(session=rti_request_db, file_service=fs)
    
    # Create one
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    created = await service.create_rti_request(request_data=request)
    
    # Update with new file
    update_request = make_rti_request_update_request(id=created.id, filename="updated.pdf")
    result = await service.update_rti_request(request_data=update_request)
    
    assert result.id == created.id
    fs.update_file.assert_called_once()

@pytest.mark.asyncio
async def test_update_rti_request_invalid_file_extension(rti_request_db, make_file_service, make_rti_request_request, make_rti_request_update_request):
    """BadRequestException raised for unsupported file extensions during update."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    # Create valid request
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    created = await service.create_rti_request(request_data=request)
    
    # Update with invalid file extension
    update_request = make_rti_request_update_request(id=created.id, filename="invalid.exe")
    
    with pytest.raises(BadRequestException) as exc:
        await service.update_rti_request(request_data=update_request)
    assert "extension" in str(exc.value)

@pytest.mark.asyncio
async def test_update_rti_request_invalid_content_type(rti_request_db, make_file_service, make_rti_request_request, make_rti_request_update_request):
    """BadRequestException raised for unsupported MIME types during update."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    fs = make_file_service(relative_path="rti-requests/update/file.pdf")
    service = RTIRequestService(session=rti_request_db, file_service=fs)

    create_request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    created = await service.create_rti_request(request_data=create_request)

    update_request = make_rti_request_update_request(id=created.id, filename="updated.pdf", content_type="text/plain")

    with pytest.raises(BadRequestException) as exc:
        await service.update_rti_request(request_data=update_request)
    assert "content type" in str(exc.value)

@pytest.mark.asyncio
async def test_update_rti_request_not_found(rti_request_db, make_file_service, make_rti_request_update_request):
    """NotFoundException raised when updating a non-existent RTI Request."""
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    update_request = make_rti_request_update_request(id=99999)
    
    with pytest.raises(NotFoundException):
        await service.update_rti_request(request_data=update_request)

@pytest.mark.asyncio
async def test_update_rti_request_db_failure_rolls_back_file(rti_request_db, monkeypatch, make_file_service, make_rti_request_request, make_rti_request_update_request):
    """Verifies file rollback on GitHub when DB commit fails during update."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    old_content = b"old content"
    old_sha = "old-sha"
    new_sha = "new-sha"
    
    fs = make_file_service(relative_path="rti-requests/dummy/dummy.pdf")
    fs.read_file = AsyncMock(side_effect=[
        {"content": old_content, "sha": old_sha}, # first call (old)
        {"content": b"new content", "sha": new_sha} # second call (new) for rollback
    ])
    
    service = RTIRequestService(session=rti_request_db, file_service=fs)
    
    # Create one
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    created = await service.create_rti_request(request_data=request)
    
    # Mock DB failure
    monkeypatch.setattr(rti_request_db, "commit", MagicMock(side_effect=Exception("DB Error")))
    
    update_request = make_rti_request_update_request(id=created.id, filename="updated.pdf")
    
    with pytest.raises(InternalServerException):
        await service.update_rti_request(request_data=update_request)
    
    # Verify rollback call
    fs.update_file.assert_any_call(
        file_path="rti-requests/dummy/dummy.pdf",
        content=old_content,
        sha=new_sha,
        message=f"Rollback: restore previous version for {created.id}"
    )

@pytest.mark.asyncio
async def test_update_rti_request_post_commit_file_deletion_failure(rti_request_db, make_file_service, make_rti_request_request, make_rti_request_update_request):
    """Failure to delete old file after DB commit should not fail the request or trigger rollback."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    initial_path = "rti-requests/old-file.pdf"
    updated_path = "rti-requests/new-file.txt"
    fs = make_file_service(relative_path=initial_path)
    fs.read_file = AsyncMock(return_value={"content": b"old", "sha": "sha"})
    # Fail ONLY the delete_file call
    fs.delete_file = AsyncMock(side_effect=Exception("GitHub Down"))
    
    service = RTIRequestService(session=rti_request_db, file_service=fs)
    
    # Create with .pdf
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id, filename="old.pdf")
    created = await service.create_rti_request(request_data=request)
    
    # Change the mock to return a .txt path for the next create_file call (during update)
    fs.create_file = AsyncMock(return_value={"relative_path": updated_path})
    
    # To trigger delete_file, we temporarily widen the shared allowlist.
    original_rules = file_validation.FILE_VALIDATION_RULES[FileValidationPolicy.RTI_REQUEST]
    try:
        file_validation.FILE_VALIDATION_RULES[FileValidationPolicy.RTI_REQUEST] = FileValidationRules(
            label=original_rules.label,
            allowed_extensions=frozenset({".pdf", ".txt"}),
            allowed_content_types=original_rules.allowed_content_types,
        )
        update_request = make_rti_request_update_request(id=created.id, filename="new.txt")
        
        # This should succeed even if delete_file fails
        result = await service.update_rti_request(request_data=update_request)
        
        assert result.id == created.id
        fs.delete_file.assert_called_once_with(file_path=initial_path)
        
        # CRITICAL: Verify that the DB was actually updated despite the cleanup failure
        # Get the history record for the CREATED status
        status_history = rti_request_db.exec(
            select(RTIStatusHistory).where(RTIStatusHistory.rti_request_id == created.id)
        ).first()
        assert status_history.files == [updated_path]
    finally:
        file_validation.FILE_VALIDATION_RULES[FileValidationPolicy.RTI_REQUEST] = original_rules

@pytest.mark.asyncio
async def test_update_rti_request_missing_initial_history(rti_request_db, make_file_service, make_rti_request_request, make_rti_request_update_request):
    """InternalServerException if 'CREATED' history record is missing during update."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    created = await service.create_rti_request(request_data=request)
    
    # Delete the history record
    histories = rti_request_db.exec(select(RTIStatusHistory).where(RTIStatusHistory.rti_request_id == created.id)).all()
    for h in histories:
        rti_request_db.delete(h)
    rti_request_db.commit()
    
    update_request = make_rti_request_update_request(id=created.id, filename="new.pdf")
    with pytest.raises(InternalServerException) as exc:
        await service.update_rti_request(request_data=update_request)
    assert "Initial file record not found" in str(exc.value)

@pytest.mark.asyncio
async def test_create_rti_request_empty_file_service_path(rti_request_db, make_file_service, make_rti_request_request):
    """InternalServerException if file service returns no relative path."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    fs = make_file_service()
    fs.create_file = AsyncMock(return_value={}) # No relative_path
    service = RTIRequestService(session=rti_request_db, file_service=fs)
    
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    with pytest.raises(InternalServerException) as exc:
        await service.create_rti_request(request_data=request)
    assert "Invalid path response" in str(exc.value)

@pytest.mark.asyncio
async def test_update_rti_request_blocked_by_history(rti_request_db, make_file_service, make_rti_request_request, make_rti_request_update_request):
    """Update is blocked if there are multiple status history records."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    # Create one
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    created = await service.create_rti_request(request_data=request)
    
    status = rti_request_db.exec(select(RTIStatus)).first()
        
    # Add second history
    history2 = RTIStatusHistory(
        id=uuid.uuid4(),
        rti_request_id=created.id,
        status_id=status.id,
        direction=RTIDirection.sent,
        entry_time=datetime.now(timezone.utc),
        files=[]
    )
    rti_request_db.add(history2)
    rti_request_db.commit()
    
    update_request = make_rti_request_update_request(id=created.id, title="Blocked")
    with pytest.raises(ConflictException) as exc:
        await service.update_rti_request(request_data=update_request)
    assert "associated status history records beyond creation" in str(exc.value)

@pytest.mark.asyncio
async def test_update_rti_request_integrity_error(rti_request_db, make_file_service, make_rti_request_request, make_rti_request_update_request):
    """IntegrityError during update (e.g. unique constraint violation) is mapped to ConflictException."""

    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    # Create two requests
    req1 = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id, title="Title 1")
    created1 = await service.create_rti_request(request_data=req1)
    
    req2 = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id, title="Title 2")
    created2 = await service.create_rti_request(request_data=req2)
    
    # Add a temporary unique constraint on title to trigger IntegrityError on collision
    rti_request_db.execute(text("CREATE UNIQUE INDEX idx_rti_request_title_unique ON rti_requests (title)"))
    rti_request_db.commit()

    # Try to update Title 2 to Title 1
    update_request = make_rti_request_update_request(id=created2.id, title="Title 1")
    
    with pytest.raises(ConflictException):
        await service.update_rti_request(request_data=update_request)

@pytest.mark.asyncio
async def test_update_rti_request_invalid_template(rti_request_db, make_file_service, make_rti_request_request, make_rti_request_update_request):
    """NotFoundException if invalid RTI Template ID is provided during update."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    created = await service.create_rti_request(request_data=request)
    
    update_request = make_rti_request_update_request(id=created.id, rti_template_id=uuid.uuid4())
    with pytest.raises(NotFoundException) as exc:
        await service.update_rti_request(request_data=update_request)
    assert "RTI Template" in str(exc.value)

@pytest.mark.asyncio
async def test_update_rti_request_invalid_sender(rti_request_db, make_file_service, make_rti_request_request, make_rti_request_update_request):
    """NotFoundException if invalid sender ID is provided during update."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    created = await service.create_rti_request(request_data=request)
    
    update_request = make_rti_request_update_request(id=created.id, sender_id=uuid.uuid4())
    with pytest.raises(NotFoundException) as exc:
        await service.update_rti_request(request_data=update_request)
    assert "Sender" in str(exc.value)

@pytest.mark.asyncio
async def test_update_rti_request_invalid_receiver(rti_request_db, make_file_service, make_rti_request_request, make_rti_request_update_request):
    """NotFoundException if invalid receiver ID is provided during update."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    created = await service.create_rti_request(request_data=request)
    
    update_request = make_rti_request_update_request(id=created.id, receiver_id=uuid.uuid4())
    with pytest.raises(NotFoundException) as exc:
        await service.update_rti_request(request_data=update_request)
    assert "Receiver" in str(exc.value)

# test delete rti request
@pytest.mark.asyncio
async def test_delete_rti_request_success(rti_request_db, make_file_service, make_rti_request_request):
    """Happy path: RTI Request, its history and files are deleted."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    fs = make_file_service()
    fs.read_file = AsyncMock(return_value={"content": b"content", "sha": "sha"})
    
    service = RTIRequestService(session=rti_request_db, file_service=fs)
    
    # Create one
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    created = await service.create_rti_request(request_data=request)
    
    # Delete it
    await service.delete_rti_request(request_id=created.id)
    
    # Verify DB deletion
    assert rti_request_db.get(RTIRequest, created.id) is None
    
    # Verify History deletion
    histories = rti_request_db.exec(select(RTIStatusHistory).where(RTIStatusHistory.rti_request_id == created.id)).all()
    assert len(histories) == 0
    
    # Verify GitHub deletion
    fs.delete_file.assert_called()

@pytest.mark.asyncio
async def test_delete_rti_request_not_found(rti_request_db, make_file_service):
    """NotFoundException raised when deleting non-existent RTI Request."""
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    with pytest.raises(NotFoundException):
        await service.delete_rti_request(request_id=99999)

@pytest.mark.asyncio
async def test_delete_rti_request_conflict_no_file_deletion(rti_request_db, monkeypatch, make_file_service, make_rti_request_request):
    """IntegrityError during deletion prevents GitHub file deletion."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    fs = make_file_service()
    service = RTIRequestService(session=rti_request_db, file_service=fs)
    
    # Create one
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    created = await service.create_rti_request(request_data=request)
    
    # Mock IntegrityError on commit
    monkeypatch.setattr(rti_request_db, "commit", MagicMock(side_effect=IntegrityError("conflict", None, None)))
    
    with pytest.raises(ConflictException):
        await service.delete_rti_request(request_id=created.id)
    
    # Verify delete_file was NEVER called because DB commit failed
    fs.delete_file.assert_not_called()

@pytest.mark.asyncio
async def test_delete_rti_request_blocked_by_history(rti_request_db, make_file_service, make_rti_request_request):
    """Deletion is blocked if there are multiple status history records."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    service = RTIRequestService(session=rti_request_db, file_service=make_file_service())
    
    # Create one (adds first history)
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    created = await service.create_rti_request(request_data=request)
    
    # Add a second history record
    history2 = RTIStatusHistory(
        id=uuid.uuid4(),
        rti_request_id=created.id,
        status_id=rti_request_db.exec(select(RTIStatus)).first().id, # just use any status
        direction=RTIDirection.sent,
        entry_time=datetime.now(timezone.utc),
        files=[]
    )
    rti_request_db.add(history2)
    rti_request_db.commit()
    
    with pytest.raises(ConflictException) as exc:
        await service.delete_rti_request(request_id=created.id)
    assert "records beyond creation" in str(exc.value)

@pytest.mark.asyncio
async def test_delete_rti_request_cleanup_failure_non_blocking(rti_request_db, make_file_service, make_rti_request_request):
    """Failure to delete GitHub files should not prevent the delete_rti_request from finishing successfully."""
    sender = rti_request_db.exec(select(Sender)).first()
    receiver = rti_request_db.exec(select(Receiver)).first()
    
    fs = make_file_service()
    fs.delete_file = AsyncMock(side_effect=Exception("Network error"))
    service = RTIRequestService(session=rti_request_db, file_service=fs)
    
    request = make_rti_request_request(sender_id=sender.id, receiver_id=receiver.id)
    created = await service.create_rti_request(request_data=request)
    
    # Delete should finish without raising, even if file cleanup fails
    await service.delete_rti_request(request_id=created.id)
    assert rti_request_db.get(RTIRequest, created.id) is None

    
