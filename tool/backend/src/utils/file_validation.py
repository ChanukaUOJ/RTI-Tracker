from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path

from fastapi import UploadFile

from src.core.exceptions import BadRequestException


class FileValidationPolicy(StrEnum):
    RTI_TEMPLATE = "rti_template"
    RTI_REQUEST = "rti_request"
    RTI_HISTORY = "rti_history"


@dataclass(frozen=True)
class FileValidationRules:
    label: str
    allowed_extensions: frozenset[str]
    allowed_content_types: frozenset[str]


FILE_VALIDATION_RULES = {
    FileValidationPolicy.RTI_TEMPLATE: FileValidationRules(
        label="RTI template file",
        allowed_extensions=frozenset({".md"}),
        allowed_content_types=frozenset({"text/markdown", "text/x-markdown"}),
    ),
    FileValidationPolicy.RTI_REQUEST: FileValidationRules(
        label="RTI request file",
        allowed_extensions=frozenset({".pdf"}),
        allowed_content_types=frozenset({"application/pdf"}),
    ),
    FileValidationPolicy.RTI_HISTORY: FileValidationRules(
        label="RTI history attachment",
        allowed_extensions=frozenset({".pdf"}),
        allowed_content_types=frozenset({"application/pdf"}),
    ),
}


def _get_file_extension(filename: str | None) -> str:
    if not filename:
        return ""
    return Path(filename).suffix.lower()


def _get_file_validation_rules(policy: FileValidationPolicy) -> FileValidationRules:
    return FILE_VALIDATION_RULES[policy]


def _validate_file_extension(file: UploadFile, allowed_extensions: frozenset[str], label: str) -> str:
    extension = _get_file_extension(file.filename)
    if not extension:
        raise BadRequestException(f"{label} must include a file extension")

    if extension not in allowed_extensions:
        allowed_list = ", ".join(sorted(allowed_extensions))
        raise BadRequestException(
            f"{label} has invalid extension '{extension}'. Allowed: {allowed_list}"
        )

    return extension


def _validate_file_content_type(file: UploadFile, allowed_content_types: frozenset[str], label: str) -> None:
    if not file.content_type or file.content_type not in allowed_content_types:
        allowed_list = ", ".join(sorted(allowed_content_types))
        raise BadRequestException(
            f"{label} has invalid content type '{file.content_type}'. Allowed: {allowed_list}"
        )


def validate_upload_file(file: UploadFile, *, policy: FileValidationPolicy) -> str:
    rules = _get_file_validation_rules(policy)
    extension = _validate_file_extension(file, rules.allowed_extensions, rules.label)
    _validate_file_content_type(file, rules.allowed_content_types, rules.label)
    return extension
