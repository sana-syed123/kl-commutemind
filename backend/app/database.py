import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")

# Initialize Supabase client if credentials are provided
if url and key and url != "your_supabase_url_here":
    supabase: Client = create_client(url, key)
else:
    # Dummy object for development if keys are not set
    supabase = None
    print("WARNING: Supabase URL/Key not set. Supabase client is None.")
