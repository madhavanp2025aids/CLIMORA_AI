# CLIMORA AI 🌍🔥

CLIMORA AI is an advanced climate risk intelligence and urban heat mitigation platform designed to monitor, simulate, and counter Urban Heat Island (UHI) effects and climate vulnerabilities across cities.

---

## 🌟 Key Features

- **Interactive Geospatial Heat Mapping**: High-performance GIS visualization using MapLibre GL and Deck.gl.
- **Urban Heat Island & Microclimate Simulation**:
  - Tree Canopy expansion impact analysis.
  - Cool / High-albedo reflective roof intervention modeling.
  - Urban water bodies and blue infrastructure cooling simulation.
- **Vulnerability & Demographic Risk Analytics**: Multi-factor risk indices integrating heat metrics, population density, and vegetation indices.
- **Multi-City Navigation**: Dedicated fly-to views and localized microclimate data for major urban clusters.
- **FastAPI Backend & Data Ingestion**: Clean microservice architecture serving geospatial data, OpenStreetMap extraction, and weather integration pipelines.

---

## 🏗️ Architecture

```
CLIMORA_AI/
├── frontend/                # React + Vite geospatial dashboard
│   ├── src/                 # React components & visualizations
│   ├── public/              # Static assets & geo datasets
│   └── package.json
├── src/                     # Backend API & ingestion pipelines
│   ├── main.py              # FastAPI server
│   └── data_ingestion/      # OSM, weather, & synthetic geo generators
├── data/                    # Raw & processed datasets
├── requirements.txt         # Python dependencies
└── .gitignore
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (3.10+)

### 2. Backend Setup

```bash
# Optional: create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run FastAPI server
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`.

### 3. Frontend Setup

```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite dev server
npm run dev
```

The web dashboard will be accessible at `http://localhost:5173`.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, MapLibre GL, Deck.gl, Recharts, Lucide Icons
- **Backend**: FastAPI, Uvicorn, Python
- **Geospatial & Data Processing**: GeoPandas, OSMnx, Shapely, Pandas, Requests
