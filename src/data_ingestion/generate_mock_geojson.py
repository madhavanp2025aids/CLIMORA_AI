import json
import random
import os

def generate_mock_data():
    # Chicago Loop approximate bounding box
    lat_min, lat_max = 41.8700, 41.8900
    lon_min, lon_max = -87.6400, -87.6100

    features = []
    
    # Generate a grid of points
    for i in range(15):
        for j in range(15):
            lat = lat_min + (lat_max - lat_min) * (i / 14)
            lon = lon_min + (lon_max - lon_min) * (j / 14)
            
            # Add some randomness to position
            lat += random.uniform(-0.0005, 0.0005)
            lon += random.uniform(-0.0005, 0.0005)

            # Synthetic features
            tree_canopy = random.uniform(0, 40) # %
            albedo = random.uniform(0.1, 0.8)
            building_density = random.uniform(20, 90) # %
            traffic_vol = random.uniform(100, 1000)
            
            # Heat vulnerability calculation (mock)
            # High density + low canopy + low albedo = HOT
            base_temp = 30.0 # C
            temp = base_temp + (building_density * 0.05) - (tree_canopy * 0.1) - (albedo * 2.0)
            
            risk_score = (temp - 25) / 10 # Normalize roughly 0 to 1
            risk_score = max(0, min(1, risk_score))

            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]
                },
                "properties": {
                    "temperature": round(temp, 2),
                    "risk_score": round(risk_score, 2),
                    "tree_canopy": round(tree_canopy, 1),
                    "albedo": round(albedo, 2),
                    "building_density": round(building_density, 1),
                    "traffic": round(traffic_vol, 0)
                }
            }
            features.append(feature)

    geojson = {
        "type": "FeatureCollection",
        "features": features
    }

    # Save to frontend/public
    output_path = os.path.join("frontend", "public", "heat_data.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(geojson, f)

    print(f"Successfully generated {len(features)} data points at {output_path}")

if __name__ == "__main__":
    generate_mock_data()
