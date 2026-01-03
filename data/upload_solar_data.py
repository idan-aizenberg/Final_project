import os
import pandas as pd
from supabase import create_client, Client

# --- Configuration ---
# Replace these with your actual Supabase URL and Service Role Key
SUPABASE_URL = "YOUR_SUPABASE_URL"
SUPABASE_KEY = "YOUR_SUPABASE_SERVICE_ROLE_KEY" 
CSV_FILE_PATH = "/Users/idanaizenberg/Documents/Braude/WeatherSight/Final_project/data/data_integr_2025_10.csv"

# Initialize Supabase Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_solar_data():
    print(f"Reading CSV from {CSV_FILE_PATH}...")
    
    try:
        df = pd.read_csv(CSV_FILE_PATH)
    except FileNotFoundError:
        print("Error: File not found. Please check the path.")
        return

    # The first column header in your CSV is "13136460", which acts as the Location ID
    location_id = df.columns[0]
    print(f"Detected Location ID: {location_id}")

    records = []
    
    # Iterate through rows
    for index, row in df.iterrows():
        # The first element is the ID for this simulation row
        sim_id = int(row.iloc[0])
        
        # The rest of the row are the float values
        # We convert numpy floats to python floats for JSON serialization
        values = row.iloc[1:].astype(float).tolist()
        
        # Handle NaNs if any (replace with 0.0)
        values = [v if pd.notnull(v) else 0.0 for v in values]

        record = {
            "id": sim_id,
            "location_id": location_id,
            "data_values": values
        }
        records.append(record)

    # Upload in chunks to avoid hitting payload limits
    chunk_size = 5
    total_uploaded = 0
    
    print(f"Starting upload of {len(records)} rows...")
    
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        try:
            response = supabase.table("solar_radiation_simulations").upsert(chunk).execute()
            total_uploaded += len(chunk)
            print(f"Uploaded {total_uploaded}/{len(records)} rows.")
        except Exception as e:
            print(f"Error uploading chunk {i}: {e}")

    print("Upload complete!")

if __name__ == "__main__":
    upload_solar_data()
