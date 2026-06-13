import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("Missing supabase credentials")
    exit(1)

supabase = create_client(supabase_url, supabase_key)

try:
    response = supabase.table("jobs").select("id, title, company, url, deactivation_reason").in_("deactivation_reason", ["manual_uncontactable", "no_valid_apply_path_pending_enrich"]).limit(20).execute()
    jobs = response.data
    if not jobs:
        print("No jobs found matching criteria.")
    else:
        print("Here are some jobs you can review:")
        for job in jobs:
            print(f"- [{job['deactivation_reason']}] {job['company']} - {job['title']} (ID: {job['id']})")
except Exception as e:
    print(f"Error: {e}")
