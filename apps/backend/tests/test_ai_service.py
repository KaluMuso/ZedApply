"""Unit tests for app.services.ai_service."""
from unittest.mock import MagicMock, patch

import pytest
from openai import APIError, AuthenticationError, RateLimitError

from app.services.ai_service import generate_tailored_cover_letter


@pytest.mark.asyncio
async def test_generate_raises_when_api_key_missing():
    with patch("app.services.ai_service.get_settings") as mock_settings:
        mock_settings.return_value.openai_api_key = ""
        with pytest.raises(ValueError, match="not configured"):
            await generate_tailored_cover_letter(
                user_cv_text="CV text",
                job_description="Job desc",
                company_name="Acme",
                role="Engineer",
            )


@pytest.mark.asyncio
async def test_generate_maps_rate_limit():
    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = RateLimitError(
        "rate limited", response=MagicMock(), body=None
    )
    with patch("app.services.ai_service.get_settings") as mock_settings:
        mock_settings.return_value.openai_api_key = "sk-test"
        with patch(
            "app.services.ai_service._get_openai_client", return_value=mock_client
        ):
            with pytest.raises(ValueError, match="temporarily busy"):
                await generate_tailored_cover_letter(
                    user_cv_text="CV",
                    job_description="Job",
                    company_name=None,
                    role="Role",
                )


@pytest.mark.asyncio
async def test_generate_success():
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content="Dear Hiring Manager,\n\nBody."))
    ]
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response

    with patch("app.services.ai_service.get_settings") as mock_settings:
        mock_settings.return_value.openai_api_key = "sk-test"
        with patch(
            "app.services.ai_service._get_openai_client", return_value=mock_client
        ):
            result = await generate_tailored_cover_letter(
                user_cv_text="Skills: Python",
                job_description="Need Python",
                company_name="ZedCo",
                role="Developer",
            )
    assert result["word_count"] >= 3
    assert "Dear Hiring Manager" in result["content"]
