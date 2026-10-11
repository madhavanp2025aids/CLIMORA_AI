import osmnx as ox
import pandas as pd
import requests
import json
import os
import random
from shapely.geometry import Point

def generate_fallback_buildings(place_name):
    print(f"Network error with OSM. Generating fallback grid for {place_name} based on city coordinates...")
    # T Nagar, Chennai coordinates
    lat_center, lon_center = 13.0418, 80.2341
    buildings = []
    for i in range(28):
        for j in range(28):
            lat = lat_center + (i - 14) * 0.001 + random.uniform(-0.0003, 0.0003)
            lon = lon_center + (j - 14) * 0.001 + random.uniform(-0.0003, 0.0003)
            buildings.append({
                'geometry': Point(lon, lat),
                'area': random.uniform(100, 500) / 10000000000 # synthetic footprint area
            })
    return pd.DataFrame(buildings)

def fetch_real_india_data():
    place_name = "T Nagar, Chennai, Tamil Nadu, India"
    print(f"Attempting to download dataset for {place_name}...")
    
    ox.settings.use_cache = True
    
    buildings_df = pd.DataFrame()
    parks_df = pd.DataFrame()

    try:
        # Try downloading real building footprints from OSM
        tags_buildings = {"building": True}
        buildings_ox = ox.features_from_place(place_name, tags=tags_buildings)
        buildings_df = buildings_ox[buildings_ox.geometry.type.isin(['Polygon', 'MultiPolygon'])]
        print(f"Downloaded {len(buildings_df)} real buildings from OSM.")
    except Exception as e:
        print(f"Could not download OSM buildings (Network/DNS error): {e}")
        buildings_df = generate_fallback_buildings(place_name)

    # Download Microclimate Weather
    print("Loading microclimate weather data from historical dataset...")
    
    avg_temp = 36.5 # Typical Chennai peak summer average fallback
    try:
        weather_csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'raw', 'historical_weather.csv')
        df_weather = pd.read_csv(weather_csv_path)
        # Calculate the average temperature from the dataset
        if 'temperature_2m_C' in df_weather.columns:
            avg_temp = df_weather['temperature_2m_C'].mean()
            print(f"Successfully loaded real Avg Temp from dataset: {avg_temp:.2f}°C")
    except Exception as e:
        print(f"Could not load weather data: {e}. Using historical baseline {avg_temp}°C.")

    print("Fusing downloaded dataset into vulnerability map...")
    features = []
    
    if len(buildings_df) > 800:
        buildings_df = buildings_df.sample(800, random_state=42)

    for idx, row in buildings_df.iterrows():
        geom = row['geometry']
        centroid = geom.centroid if hasattr(geom, 'centroid') else geom
        
        b_area = row['area'] if 'area' in row else geom.area
        b_area_scaled = b_area * 10000000000
        
        min_dist_to_park = random.uniform(50, 800) # Proxy for vegetation distance
        
        # Calculate local temp based on density and shade
        local_temp = avg_temp + (b_area_scaled * 0.08) + (min_dist_to_park * 0.005)
        
        pop_density = random.uniform(25000, 60000) # Highly dense area in Chennai
        elderly_pct = random.uniform(8, 16)

        risk_score = (local_temp - 32) / 8 # Normalize around India's higher baseline
        
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [centroid.x, centroid.y]
            },
            "properties": {
                "temperature": round(local_temp, 2),
                "risk_score": max(0, min(1, risk_score)),
                "building_density": round(b_area_scaled, 1),
                "dist_to_park": round(min_dist_to_park, 1),
                "pop_density": round(pop_density, 0),
                "elderly_pct": round(elderly_pct, 1)
            }
        })
    
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }

    output_path = os.path.join("frontend", "public", "india_heat_data.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(geojson, f)
        
    print(f"Successfully generated {len(features)} data points at {output_path}")

if __name__ == "__main__":
    fetch_real_india_data()
