"""Feed dedupe when ingest created multiple job rows for one listing."""

from app.services.matching import dedupe_match_rows_by_listing, listing_dedupe_key


def test_listing_dedupe_key_uses_title_and_company():
    job = {"title": "  MEAL   Lead ", "company": "Save the Children", "id": "j1"}
    assert listing_dedupe_key(job) == "tc:meal lead|save the children"


def test_listing_dedupe_key_prefers_apply_url():
    job = {
        "title": "Role A",
        "company": "Co",
        "apply_url": "https://employer.example/apply/123?utm=1",
        "id": "j1",
    }
    assert listing_dedupe_key(job) == "url:https://employer.example/apply/123"


def test_dedupe_match_rows_keeps_highest_score():
    rows = [
        {
            "id": "m1",
            "job_id": "j1",
            "score": 59,
            "jobs": {
                "id": "j1",
                "title": "Monitoring, Evaluation, Accountability and Learning (MEAL) Lead",
                "company": "Save the Children",
            },
        },
        {
            "id": "m2",
            "job_id": "j2",
            "score": 57,
            "jobs": {
                "id": "j2",
                "title": "Monitoring, Evaluation, Accountability and Learning (MEAL) Lead",
                "company": "Save the Children",
            },
        },
    ]
    out = dedupe_match_rows_by_listing(rows)
    assert len(out) == 1
    assert out[0]["job_id"] == "j1"
    assert out[0]["score"] == 59


def test_dedupe_match_rows_keeps_distinct_listings():
    rows = [
        {
            "id": "m1",
            "job_id": "j1",
            "score": 60,
            "jobs": {"id": "j1", "title": "Data Analyst", "company": "Save the Children"},
        },
        {
            "id": "m2",
            "job_id": "j2",
            "score": 59,
            "jobs": {
                "id": "j2",
                "title": "MEAL Lead",
                "company": "Save the Children",
            },
        },
    ]
    assert len(dedupe_match_rows_by_listing(rows)) == 2
