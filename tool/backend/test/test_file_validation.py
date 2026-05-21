import pytest

from src.core.exceptions import BadRequestException
from src.utils.file_validation import FileValidationPolicy, validate_upload_file


def test_validate_upload_file_accepts_request_pdf(make_upload_file):
    upload = make_upload_file(content_type="application/pdf", filename="request.pdf")

    extension = validate_upload_file(upload, policy=FileValidationPolicy.RTI_REQUEST)

    assert extension == ".pdf"


def test_validate_upload_file_accepts_uppercase_history_extension(make_upload_file):
    upload = make_upload_file(content_type="application/pdf", filename="HISTORY.PDF")

    extension = validate_upload_file(upload, policy=FileValidationPolicy.RTI_HISTORY)

    assert extension == ".pdf"


def test_validate_upload_file_accepts_template_markdown(make_upload_file):
    upload = make_upload_file(content_type="text/markdown", filename="template.md")

    extension = validate_upload_file(upload, policy=FileValidationPolicy.RTI_TEMPLATE)

    assert extension == ".md"


def test_validate_upload_file_rejects_missing_extension(make_upload_file):
    upload = make_upload_file(content_type="application/pdf", filename="request")

    with pytest.raises(BadRequestException) as exc:
        validate_upload_file(upload, policy=FileValidationPolicy.RTI_REQUEST)

    assert "must include a file extension" in str(exc.value)


def test_validate_upload_file_rejects_invalid_extension(make_upload_file):
    upload = make_upload_file(content_type="application/pdf", filename="request.txt")

    with pytest.raises(BadRequestException) as exc:
        validate_upload_file(upload, policy=FileValidationPolicy.RTI_REQUEST)

    assert "invalid extension" in str(exc.value)


def test_validate_upload_file_rejects_invalid_content_type(make_upload_file):
    upload = make_upload_file(content_type="text/plain", filename="request.pdf")

    with pytest.raises(BadRequestException) as exc:
        validate_upload_file(upload, policy=FileValidationPolicy.RTI_REQUEST)

    assert "invalid content type" in str(exc.value)
