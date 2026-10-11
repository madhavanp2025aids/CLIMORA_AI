import requests
import pandas as pd
import os

def ingest_historical_weather(lat, lon, start_date, end_date, output_dir):
    print(f"Fetching Historical Weather for lat:{lat}, lon:{lon}...")
    
    # Open-Meteo historical weather API
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": ["temperature_2m", "relative_humidity_2m", "direct_radiation"],
        "timezone": "auto"
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        # Convert to DataFrame
        hourly = data.get("hourly", {})
        if not hourly:
            print("No hourly data found.")
            return

        df = pd.DataFrame({
            "time": pd.to_datetime(hourly["time"]),
            "temperature_2m_C": hourly["temperature_2m"],
            "relative_humidity_percent": hourly["relative_humidity_2m"],
            "solar_radiation": hourly["direct_radiation"]
        })

        output_path = os.path.join(output_dir, "historical_weather.csv")
        df.to_csv(output_path, index=False)
        print(f"Saved weather data to {output_path}")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")

if __name__ == "__main__":
    # Coordinates for Chicago Loop
    LAT, LON = 41.8837, -87.6289
    START_DATE = "2023-06-01" # Summer month for heat analysis
    END_DATE = "2023-08-31"
    RAW_DATA_DIR = os.path.join("data", "raw")
    
    ingest_historical_weather(LAT, LON, START_DATE, END_DATE, RAW_DATA_DIR)
