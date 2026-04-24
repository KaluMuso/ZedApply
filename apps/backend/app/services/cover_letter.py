"""Cover letter generation service using Claude Haiku with prompt caching."""

import anthropic

from app.core.config import get_settings


SYSTEM_PROMPT = (
    "You are a professional career assistant for Zambian job seekers. "
    "Write concise, specific cover letters based on the provided CV context and "
    "job description. Avoid fabricating experience. Use plain, polished English "
    "and tailor the letter to the role requirements."
)


async def generate_cover_letter(
    user_cv_text: str,
    job_description: str,
    tone: str = "formal",
) -> dict[str, int | str]:
    """Generate a tailored cover letter and return content plus word count."""
    settings = get_settings()
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1200,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[
            {
                "role": "user",
                "content": (
                    "Write a cover letter with the requested tone.\n\n"
                    f"Tone: {tone}\n\n"
                    "Candidate CV Context:\n"
                    f"{user_cv_text[:8000]}\n\n"
                    "Job Description:\n"
                    f"{job_description[:8000]}\n\n"
                    "Output requirements:\n"
                    "- 250 to 400 words\n"
                    "- Include a greeting, body, and sign-off\n"
                    "- Use only details supported by the CV context\n"
                    "- Return only the letter text"
                ),
            }
        ],
    )

    content = response.content[0].text.strip()
    word_count = len([word for word in content.split() if word])
    return {"content": content, "word_count": word_count}
