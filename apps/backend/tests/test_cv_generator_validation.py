"""Tests for GeneratedCV — the Pydantic schema that validates /cv/generate
LLM output before it lands in cv_generations.

The /cv/generate endpoint returns free-form CV text from the model. The
real failure modes we've seen in prod and pin here:

  1. Empty / one-line output (model gave up or hit max_tokens early)
  2. Refusal text ("I cannot help with that...")
  3. Prompt-injection echo where the model dumps our system markers back
     out (e.g. "--- CANDIDATE CV ---")
  4. Implausibly long output (could be hallucinated padding)
"""
import pytest
from pydantic import ValidationError

from app.services.cv_generator import GeneratedCV


class TestGeneratedCVLength:
    def test_realistic_cv_passes(self):
        content = "Jane Doe — Accountant\n\n" + ("Experience entry. " * 30)
        word_count = len(content.split())
        cv = GeneratedCV(content=content, word_count=word_count)
        assert cv.word_count == word_count

    def test_too_short_rejected(self):
        with pytest.raises(ValidationError):
            GeneratedCV(content="Too short.", word_count=2)

    def test_too_long_rejected(self):
        with pytest.raises(ValidationError):
            GeneratedCV(content="x" * 13000, word_count=500)

    def test_too_few_words_rejected(self):
        # Has enough chars but only a handful of "words" — model probably
        # padded with whitespace or repeated a phrase.
        content = "word " * 220  # 220 words, but min is 50 - this should pass
        cv = GeneratedCV(content=content, word_count=220)
        assert cv.word_count == 220

        # 30 words is below the 50-word floor.
        with pytest.raises(ValidationError):
            GeneratedCV(content="x" * 300, word_count=30)

    def test_implausibly_high_word_count_rejected(self):
        # 5000-word "CV" is almost certainly hallucinated padding.
        with pytest.raises(ValidationError):
            GeneratedCV(content="x" * 11000, word_count=5000)


class TestGeneratedCVRefusalsAndEchoes:
    @pytest.mark.parametrize(
        "phrase",
        [
            "I cannot help with that request.",
            "I can't help you with this",
            "I'm unable to generate that CV.",
            "I am unable to write a CV for this role.",
            "I cannot generate content of that nature.",
            "As an AI language model, I have to decline.",
        ],
    )
    def test_refusal_phrasings_rejected(self, phrase):
        # Pad to exceed the length floor; the validator should still catch
        # the refusal marker.
        content = phrase + " " + ("filler text " * 30)
        with pytest.raises(ValidationError, match="refused|echoed"):
            GeneratedCV(content=content, word_count=len(content.split()))

    def test_prompt_echo_candidate_marker(self):
        content = (
            "Some plausible CV intro.\n\n--- CANDIDATE CV ---\n"
            "Then the model dumped our prompt markers."
            + " filler" * 50
        )
        with pytest.raises(ValidationError, match="refused|echoed"):
            GeneratedCV(content=content, word_count=len(content.split()))

    def test_prompt_echo_target_marker(self):
        content = (
            "Resume for the role.\n\n--- TARGET JOB DESCRIPTION ---\n"
            "Echoed back the job block from our prompt."
            + " filler" * 50
        )
        with pytest.raises(ValidationError, match="refused|echoed"):
            GeneratedCV(content=content, word_count=len(content.split()))

    def test_case_insensitivity(self):
        """Markers should match regardless of casing the model uses."""
        content = "RESUME\n\nI CANNOT HELP with that. " + ("filler " * 50)
        with pytest.raises(ValidationError, match="refused|echoed"):
            GeneratedCV(content=content, word_count=len(content.split()))


class TestGeneratedCVHappyPath:
    def test_typical_zambian_cv_passes(self):
        content = """KALUBA MUSONDA
Senior Accountant | UNZA BSc Accounting | +260971234567 | kaluba@example.com

PROFESSIONAL SUMMARY
ZICA-registered Senior Accountant with 7 years of experience across
manufacturing and NGO sectors in Lusaka and Kitwe. Strong in monthly
close, GL reconciliation, and tax submission to ZRA. Comfortable with
QuickBooks, Sage Evolution, and Microsoft Excel.

EXPERIENCE
Senior Accountant — Acme Manufacturing, Lusaka (2023–present)
- Owned month-end close across three subsidiaries
- Reduced reporting cycle from 14 to 8 days
- Led the ZRA VAT and PAYE compliance program

EDUCATION
- BSc Accounting, UNZA (2018)
- ZICA Licentiate (2020)

REFERENCES available on request.
"""
        cv = GeneratedCV(content=content, word_count=len(content.split()))
        assert cv.content.startswith("KALUBA MUSONDA")
