import json
import os
import random

cities = {
    "Delhi": {"lat": 28.6139, "lon": 77.2090, "base_temp": 40.0},
    "Mumbai": {"lat": 19.0760, "lon": 72.8777, "base_temp": 34.0},
    "Chennai": {"lat": 13.0827, "lon": 80.2707, "base_temp": 36.5},
    "Bangalore": {"lat": 12.9716, "lon": 77.5946, "base_temp": 30.0},
    "Kolkata": {"lat": 22.5726, "lon": 88.3639, "base_temp": 35.0},
    "Hyderabad": {"lat": 17.3850, "lon": 78.4867, "base_temp": 38.0},
    "Ahmedabad": {"lat": 23.0225, "lon": 72.5714, "base_temp": 42.0}
}

features = []

for city_name, data in cities.items():
    center_lat = data["lat"]
    center_lon = data["lon"]
    base_temp = data["base_temp"]
    
    # Generate 150 points per city
    for _ in range(150):
        # spread roughly ~10km
        lat = center_lat + random.uniform(-0.1, 0.1)
        lon = center_lon + random.uniform(-0.1, 0.1)
        
        b_area_scaled = random.uniform(50, 90) # density
        min_dist_to_park = random.uniform(50, 1000)
        
        # Local temp variation
        local_temp = base_temp + random.uniform(-2, 3) + (b_area_scaled * 0.02) + (min_dist_to_park * 0.001)
        
        pop_density = random.uniform(10000, 80000)
        elderly_pct = random.uniform(5, 20)
        
        # Risk score calculation
        risk_score = (local_temp - 30) / 12
        risk_score = max(0, min(1, risk_score))
        
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "properties": {
                "city": city_name,
                "temperature": round(local_temp, 2),
                "risk_score": round(risk_score, 2),
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

output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "public", "india_heat_data.json")
os.makedirs(os.path.dirname(output_path), exist_ok=True)

with open(output_path, "w") as f:
    json.dump(geojson, f)

print(f"Generated {len(features)} points across India into {output_path}")
