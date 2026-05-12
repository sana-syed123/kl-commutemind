import os
import time
import zipfile
import logging
import requests
import pandas as pd
from io import BytesIO
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Usually there are separate feeds for rapid-rail-kl and rapid-bus-kl.
# We will focus on rail for the initial routing test (KLCC, Bukit Bintang).
GTFS_RAIL_URL = "https://api.data.gov.my/gtfs-static/prasarana?category=rapid-rail-kl"

def download_with_retry(url: str, max_retries: int = 3, backoff_factor: float = 2.0) -> bytes:
    """
    Downloads data with exponential backoff if the API is slow or temporarily down.
    """
    for attempt in range(max_retries):
        try:
            logger.info(f"Attempting to download GTFS from {url} (Attempt {attempt + 1}/{max_retries})")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            logger.info("Download successful.")
            return response.content
        except requests.exceptions.RequestException as e:
            logger.warning(f"Download failed: {e}")
            if attempt < max_retries - 1:
                sleep_time = backoff_factor ** attempt
                logger.info(f"Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)
            else:
                logger.error("Max retries reached. Download failed.")
                raise

def extract_and_load_gtfs(gtfs_content: bytes, extract_dir: str = "data/gtfs") -> Dict[str, pd.DataFrame]:
    """
    Extracts the GTFS ZIP content and loads relevant files into pandas DataFrames.
    """
    os.makedirs(extract_dir, exist_ok=True)
    
    with zipfile.ZipFile(BytesIO(gtfs_content)) as z:
        z.extractall(extract_dir)
        
    dfs = {}
    files_to_load = ['stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt', 'transfers.txt']
    
    for file_name in files_to_load:
        file_path = os.path.join(extract_dir, file_name)
        if os.path.exists(file_path):
            # Read as strings to preserve IDs like '01'
            dfs[file_name.split('.')[0]] = pd.read_csv(file_path, dtype=str)
        else:
            logger.warning(f"File {file_name} not found in GTFS archive.")
            
    return dfs

def get_gtfs_data() -> Dict[str, pd.DataFrame]:
    """
    Orchestrates downloading and loading the GTFS data.
    """
    gtfs_content = download_with_retry(GTFS_RAIL_URL)
    dfs = extract_and_load_gtfs(gtfs_content)
    return dfs

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    data = get_gtfs_data()
    for name, df in data.items():
        print(f"Loaded {name} with {len(df)} rows.")
