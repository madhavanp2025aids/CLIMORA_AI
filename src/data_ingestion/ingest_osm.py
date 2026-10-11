import osmnx as ox
import os

def ingest_osm_data(place_name, output_dir):
    print(f"Fetching OpenStreetMap data for {place_name}...")
    
    # Configure osmnx
    ox.settings.use_cache = True
    ox.settings.log_console = True

    try:
        # Fetch building footprints
        print("Fetching buildings...")
        tags_buildings = {"building": True}
        buildings = ox.features_from_place(place_name, tags=tags_buildings)
        
        # Filter to only polygons/multipolygons if necessary to avoid points
        buildings = buildings[buildings.geometry.type.isin(['Polygon', 'MultiPolygon'])]
        
        buildings_path = os.path.join(output_dir, "buildings.geojson")
        buildings.to_file(buildings_path, driver="GeoJSON")
        print(f"Saved {len(buildings)} buildings to {buildings_path}")

        # Fetch green spaces/parks (for vegetation analysis)
        print("Fetching green spaces...")
        tags_greenery = {"leisure": "park", "landuse": ["grass", "forest", "recreation_ground"]}
        parks = ox.features_from_place(place_name, tags=tags_greenery)
        
        parks = parks[parks.geometry.type.isin(['Polygon', 'MultiPolygon'])]
        
        parks_path = os.path.join(output_dir, "parks.geojson")
        parks.to_file(parks_path, driver="GeoJSON")
        print(f"Saved {len(parks)} green spaces to {parks_path}")

        print("OSM Data Ingestion Complete.")

    except Exception as e:
        print(f"Error fetching data: {e}")

if __name__ == "__main__":
    TARGET_PLACE = "Loop, Chicago, Illinois, USA" # Testing with a highly dense urban neighborhood
    RAW_DATA_DIR = os.path.join("data", "raw")
    ingest_osm_data(TARGET_PLACE, RAW_DATA_DIR)
