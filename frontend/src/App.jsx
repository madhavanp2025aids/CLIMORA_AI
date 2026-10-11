import React, { useState, useEffect, useMemo } from 'react';
import { Flame, Map as MapIcon, Trees, Activity, Layers, Settings, Droplets, Users, AlertTriangle, Download, Filter, Sliders, Lightbulb, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import Map, { NavigationControl, Source, Layer, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const App = () => {
  const [canopySim, setCanopySim] = useState(0);
  const [roofSim, setRoofSim] = useState(0);
  const [waterSim, setWaterSim] = useState(0);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('mitigation');
  
  // New features state
  const [mapStyleType, setMapStyleType] = useState('dark');
  const [minRisk, setMinRisk] = useState(0);
  const [layerOpacity, setLayerOpacity] = useState(0.7);
  const [baseRadius, setBaseRadius] = useState(4);
  const [viewState, setViewState] = useState({
    longitude: 78.9629,
    latitude: 20.5937,
    zoom: 4,
    pitch: 0,
  });

  const flyToCity = (lon, lat, zoomLevel = 11) => {
    setViewState({
      longitude: lon,
      latitude: lat,
      zoom: zoomLevel,
      pitch: 45,
      transitionDuration: 1500
    });
  };

  const cityBtnStyle = {
    padding: '0.4rem 0.8rem',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid var(--border)',
    borderRadius: '1rem',
    color: 'var(--text-main)',
    cursor: 'pointer',
    fontSize: '0.8rem'
  };

  // Fetch generated mock dataset from backend with fallback
  useEffect(() => {
    fetch('http://localhost:8000/api/data')
      .then(res => {
        if (!res.ok) throw new Error("Backend response error");
        return res.json();
      })
      .then(setData)
      .catch(err => {
        console.warn("Backend fetch failed, falling back to static asset:", err);
        fetch('/india_heat_data.json')
          .then(r => r.json())
          .then(setData)
          .catch(e => console.error("Error loading data:", e));
      });
  }, []);

  // Update dynamic SHAP data based on hovered area or use global avg
  const shapData = useMemo(() => {
    if (!hoverInfo || !hoverInfo.properties) {
      return [
        { name: 'Concrete Density', impact: 1.8 },
        { name: 'Traffic Vol.', impact: 0.8 },
        { name: 'Building Age', impact: 0.5 },
        { name: 'Albedo (Reflect)', impact: -1.2 },
        { name: 'Tree Canopy %', impact: -2.4 },
      ];
    }
    const props = hoverInfo.properties;
    return [
      { name: 'Concrete Density', impact: parseFloat((props.building_density / 40).toFixed(2)) },
      { name: 'Pop. Density', impact: parseFloat((props.pop_density / 50000).toFixed(2)) },
      { name: 'Dist. to Park (m)', impact: parseFloat((props.dist_to_park / 500).toFixed(2)) },
      { name: 'Elderly %', impact: parseFloat((props.elderly_pct / 10).toFixed(2)) },
    ].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }, [hoverInfo]);

  // Adjust dataset in real-time based on simulation sliders
  const simulatedData = useMemo(() => {
    if (!data) return null;
    const simFeatures = data.features.map(f => {
      const props = f.properties;
      const tempReduction = (Number(canopySim) * 0.1) + (Number(roofSim) * 0.05) + (Number(waterSim) * 0.15);
      const newTemp = Math.max(20, props.temperature - tempReduction);
      const riskScore = Math.max(0, Math.min(1, (newTemp - 25) / 10));
      return {
        ...f,
        properties: {
          ...props,
          temperature: newTemp,
          risk_score: riskScore
        }
      };
    }).filter(f => f.properties.risk_score >= minRisk);
    return { type: "FeatureCollection", features: simFeatures };
  }, [data, canopySim, roofSim, waterSim, minRisk]);

  const mapStyle = useMemo(() => {
    if (mapStyleType === 'dark') return "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
    if (mapStyleType === 'light') return "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
    if (mapStyleType === 'satellite') return {
      "version": 8,
      "sources": {
        "esri": {
          "type": "raster",
          "tiles": ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
          "tileSize": 256
        }
      },
      "layers": [{
        "id": "esri-satellite",
        "type": "raster",
        "source": "esri"
      }]
    };
  }, [mapStyleType]);

  const heatLayerStyle = useMemo(() => ({
    id: 'heat-points',
    type: 'circle',
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        10, Number(baseRadius),
        15, Number(baseRadius) * 6
      ],
      'circle-color': [
        'interpolate', ['linear'], ['get', 'risk_score'],
        0, '#10b981', 
        0.5, '#f59e0b', 
        1, '#ef4444' 
      ],
      'circle-opacity': Number(layerOpacity),
      'circle-stroke-width': 1,
      'circle-stroke-color': '#000'
    }
  }), [baseRadius, layerOpacity]);

  const handleExport = () => {
    if (!simulatedData) return;
    const blob = new Blob([JSON.stringify(simulatedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'climate_shield_simulation.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const riskDistribution = useMemo(() => {
    if (!simulatedData) return [];
    let safe = 0;
    let moderate = 0;
    let danger = 0;
    
    simulatedData.features.forEach(f => {
      const score = f.properties.risk_score;
      if (score < 0.33) safe++;
      else if (score < 0.66) moderate++;
      else danger++;
    });
    
    return [
      { name: 'Safe', value: safe, color: '#10b981' },
      { name: 'Moderate', value: moderate, color: '#f59e0b' },
      { name: 'Danger', value: danger, color: '#ef4444' }
    ];
  }, [simulatedData]);

  const highlyVulnerableHotspots = useMemo(() => {
    if (!simulatedData) return [];
    const sorted = [...simulatedData.features].sort((a, b) => b.properties.risk_score - a.properties.risk_score);
    const hotspots = [];
    const seenCities = new Set();
    for (let f of sorted) {
      if (f.properties.risk_score > 0.7 && !seenCities.has(f.properties.city)) {
        hotspots.push(f);
        seenCities.add(f.properties.city);
      }
      if (hotspots.length >= 5) break;
    }
    return hotspots;
  }, [simulatedData]);

  const getRecommendations = (props) => {
    const recs = [];
    if (props.building_density > 75) {
      recs.push({ title: 'Cool Roof Initiative', desc: 'High density restricts tree planting. Mandate highly reflective white roofs on commercial buildings.', color: 'var(--accent)' });
    }
    if (props.dist_to_park > 500) {
      recs.push({ title: 'Micro-Parks & Green Walls', desc: 'Area is too far from existing parks. Convert unused small lots or building facades to green spaces.', color: 'var(--success)' });
    } else {
      recs.push({ title: 'Park Expansion', desc: 'Expand canopy cover of nearby existing parks and create shaded green corridors leading to them.', color: 'var(--success)' });
    }
    if (props.elderly_pct > 12) {
      recs.push({ title: 'Cooling Centers', desc: 'High elderly population detected. Establish easily accessible, air-conditioned public cooling centers.', color: '#3b82f6' });
    }
    if (recs.length === 0) {
      recs.push({ title: 'General Canopy Expansion', desc: 'Plant more drought-resistant street trees to improve overall shade.', color: 'var(--success)' });
    }
    return recs;
  };

  const onHover = (event) => {
    const feature = event.features && event.features[0];
    if (feature) {
      setHoverInfo({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        properties: feature.properties
      });
    } else {
      setHoverInfo(null);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-area">
          <Flame className="logo-icon" size={32} />
          <span>ClimaShield AI</span>
        </div>
        
        <nav className="nav-menu">
          <div className={`nav-item ${activeTab === 'vulnerability' ? 'active' : ''}`} onClick={() => setActiveTab('vulnerability')}><MapIcon size={20} /> Heat Vulnerability</div>
          <div className={`nav-item ${activeTab === 'shap' ? 'active' : ''}`} onClick={() => setActiveTab('shap')}><Activity size={20} /> SHAP Analysis</div>
          <div className={`nav-item ${activeTab === 'mitigation' ? 'active' : ''}`} onClick={() => setActiveTab('mitigation')}><Trees size={20} /> Mitigation Sandbox</div>
          <div className={`nav-item ${activeTab === 'action' ? 'active' : ''}`} onClick={() => setActiveTab('action')}><Lightbulb size={20} /> AI Action Plan</div>
          <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}><Settings size={20} /> Settings</div>
        </nav>
        
        <div style={{marginTop: 'auto', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem'}}>
          Powered by Python & Gemini
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        
        {/* Map Container */}
        <div className="map-container">
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            mapStyle={mapStyle}
            interactiveLayerIds={['heat-points']}
            onMouseMove={onHover}
            onMouseLeave={() => setHoverInfo(null)}
          >
            <NavigationControl position="bottom-left" showCompass={false} />
            
            {simulatedData && (
              <Source type="geojson" data={simulatedData}>
                <Layer {...heatLayerStyle} />
              </Source>
            )}

            {hoverInfo && hoverInfo.properties && (
              <Popup
                longitude={hoverInfo.longitude}
                latitude={hoverInfo.latitude}
                closeButton={false}
                closeOnClick={false}
                anchor="bottom"
              >
                <div>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '1px'}}>Local Temp</div>
                  <strong style={{fontSize: '1.5rem', color: 'var(--accent)'}}>{hoverInfo.properties.temperature.toFixed(1)}°C</strong>
                  <div style={{marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem'}}>
                      <span>Risk Score:</span>
                      <span style={{color: hoverInfo.properties.risk_score > 0.5 ? 'var(--danger)' : 'var(--success)'}}>
                        {(hoverInfo.properties.risk_score * 100).toFixed(0)}/100
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            )}
          </Map>
        </div>

        {/* Floating Panels */}
        <div className="overlay-panels">
          <div className="panel right-panel">
            
            {activeTab === 'mitigation' && (
              <>
                <div className="panel-header">
                  <h2 className="panel-title"><Layers size={22} color="var(--accent)" /> Mitigation Sandbox</h2>
                </div>
                
                <div className="control-group">
                  <div className="control-label">
                    <span>Increase Tree Canopy</span>
                    <span style={{color: 'var(--success)'}}>+{canopySim}%</span>
                  </div>
                  <div className="slider-container">
                    <Trees size={18} color="var(--success)" />
                    <input 
                      type="range" 
                      min="0" max="50" 
                      value={canopySim} 
                      onChange={(e) => setCanopySim(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="control-group">
                  <div className="control-label">
                    <span>Cool Roof Adoption</span>
                    <span style={{color: 'var(--accent)'}}>+{roofSim}%</span>
                  </div>
                  <div className="slider-container">
                    <Flame size={18} color="var(--accent)" />
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={roofSim} 
                      onChange={(e) => setRoofSim(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="control-group">
                  <div className="control-label">
                    <span>Expand Water Bodies</span>
                    <span style={{color: '#3b82f6'}}>+{waterSim}%</span>
                  </div>
                  <div className="slider-container">
                    <Droplets size={18} color="#3b82f6" />
                    <input 
                      type="range" 
                      min="0" max="25" 
                      value={waterSim} 
                      onChange={(e) => setWaterSim(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="impact-box" style={{marginTop: '1.5rem'}}>
                  <h3 style={{fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <Settings size={16} /> Estimated Thermal Impact
                  </h3>
                  <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>
                    Simulated reduction in local Land Surface Temperature:
                  </p>
                  <strong style={{fontSize: '2rem', color: 'var(--success)', display: 'block', marginTop: '0.5rem', fontWeight: 700}}>
                    -{((Number(canopySim) * 0.1) + (Number(roofSim) * 0.05) + (Number(waterSim) * 0.15)).toFixed(2)} °C
                  </strong>
                </div>
              </>
            )}

            {activeTab === 'shap' && (
              <>
                <div className="panel-header">
                  <h2 className="panel-title">
                    <Activity size={22} color="var(--danger)" /> 
                    {hoverInfo ? 'Local Feature Impact' : 'Global Feature Impact'}
                  </h2>
                </div>

                <div className="chart-container" style={{height: '300px', marginTop: '1rem'}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={shapData} layout="vertical" margin={{ top: 5, right: 10, left: 35, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={110} tick={{fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Inter'}} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        cursor={{fill: 'rgba(255,255,255,0.03)'}}
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border)', borderRadius: '0.75rem', backdropFilter: 'blur(10px)' }}
                        itemStyle={{ color: 'var(--text-main)' }}
                      />
                      <Bar dataKey="impact" radius={[0, 6, 6, 0]} barSize={12}>
                        {
                          shapData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.impact > 0 ? 'var(--danger)' : 'var(--success)'} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {activeTab === 'vulnerability' && (
              <>
                <div className="panel-header">
                  <h2 className="panel-title"><AlertTriangle size={22} color="var(--danger)" /> Vulnerability Overview</h2>
                </div>
                <div style={{padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem'}}>
                  <p>Explore heat vulnerability across the map. The map displays heat zones based on surface temperatures and urban infrastructure data.</p>
                  <p style={{marginTop: '1rem'}}>Red zones indicate high vulnerability, while green zones indicate lower risk.</p>
                  
                  <div style={{marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem'}}>
                    <h3 style={{color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Filter size={16}/> Risk Filter</h3>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                      <input 
                        type="range" min="0" max="1" step="0.1" 
                        value={minRisk} onChange={(e) => setMinRisk(Number(e.target.value))}
                        style={{flex: 1}}
                      />
                      <span style={{color: 'var(--accent)', fontWeight: 'bold'}}>{(minRisk * 100).toFixed(0)}%+</span>
                    </div>
                    <p style={{fontSize: '0.75rem', marginTop: '0.5rem'}}>Hide areas below this risk threshold.</p>
                  </div>

                  <div style={{marginTop: '1.5rem'}}>
                     <h3 style={{color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '1rem'}}>Quick Navigate</h3>
                     <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem'}}>
                        <button onClick={() => flyToCity(77.2090, 28.6139)} style={cityBtnStyle}>Delhi</button>
                        <button onClick={() => flyToCity(72.8777, 19.0760)} style={cityBtnStyle}>Mumbai</button>
                        <button onClick={() => flyToCity(80.2707, 13.0827)} style={cityBtnStyle}>Chennai</button>
                        <button onClick={() => flyToCity(77.5946, 12.9716)} style={cityBtnStyle}>Bangalore</button>
                        <button onClick={() => flyToCity(88.3639, 22.5726)} style={cityBtnStyle}>Kolkata</button>
                        <button onClick={() => flyToCity(72.5714, 23.0225)} style={cityBtnStyle}>Ahmedabad</button>
                        <button onClick={() => flyToCity(78.9629, 20.5937, 4)} style={{...cityBtnStyle, background: 'var(--accent)', color: '#000'}}>View All India</button>
                     </div>
                  </div>

                  <div style={{marginTop: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem'}}>
                    <h3 style={{color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '1rem', textAlign: 'center'}}>Risk Distribution</h3>
                    <div style={{height: '200px'}}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={riskDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {riskDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}
                            itemStyle={{ color: 'var(--text-main)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {hoverInfo ? (
                    <div style={{marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem'}}>
                       <h3 style={{color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '1rem'}}>Selected Area Stats:</h3>
                       <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                         <span>Temperature:</span>
                         <span style={{color: 'var(--accent)', fontWeight: 'bold'}}>{hoverInfo.properties.temperature.toFixed(1)}°C</span>
                       </div>
                       <div style={{display: 'flex', justifyContent: 'space-between'}}>
                         <span>Risk Score:</span>
                         <span style={{color: hoverInfo.properties.risk_score > 0.5 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold'}}>
                           {(hoverInfo.properties.risk_score * 100).toFixed(0)}/100
                         </span>
                       </div>
                    </div>
                  ) : (
                    <div style={{marginTop: '2rem', padding: '1rem', border: '1px dashed var(--border)', borderRadius: '0.5rem', textAlign: 'center'}}>
                      Hover over the map to view specific area details.
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'action' && (
              <>
                <div className="panel-header">
                  <h2 className="panel-title"><Lightbulb size={22} color="#f59e0b" /> AI Action Plan</h2>
                </div>
                
                <div style={{padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', overflowY: 'auto', maxHeight: 'calc(100vh - 150px)'}}>
                  
                  {hoverInfo ? (
                    <div>
                      <h3 style={{color: 'var(--text-main)', fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <MapPin size={18} color="var(--danger)"/> Target: {hoverInfo.properties.city || 'Custom Area'}
                      </h3>
                      <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
                         <div style={{flex: 1, background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center'}}>
                            <div style={{fontSize: '1.25rem', color: 'var(--accent)', fontWeight: 'bold'}}>{hoverInfo.properties.temperature.toFixed(1)}°C</div>
                            <div style={{fontSize: '0.7rem', textTransform: 'uppercase'}}>Temperature</div>
                         </div>
                         <div style={{flex: 1, background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center'}}>
                            <div style={{fontSize: '1.25rem', color: hoverInfo.properties.risk_score > 0.6 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold'}}>{(hoverInfo.properties.risk_score * 100).toFixed(0)}</div>
                            <div style={{fontSize: '0.7rem', textTransform: 'uppercase'}}>Risk Score</div>
                         </div>
                      </div>

                      <h4 style={{color: 'var(--text-main)', marginBottom: '0.75rem'}}>Context-Aware Recommendations</h4>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                        {getRecommendations(hoverInfo.properties).map((rec, i) => (
                          <div key={i} style={{borderLeft: `3px solid ${rec.color}`, paddingLeft: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '0 0.5rem 0.5rem 0'}}>
                            <strong style={{color: rec.color, display: 'block', marginBottom: '0.25rem'}}>{rec.title}</strong>
                            <span>{rec.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.5rem'}}>
                         <h3 style={{color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}><AlertTriangle size={18}/> Hover Required</h3>
                         <p>Hover over any specific area on the map to generate AI-driven spatial recommendations tailored to its exact demographics and infrastructure.</p>
                      </div>

                      <h4 style={{color: 'var(--text-main)', marginBottom: '0.75rem', fontSize: '1rem'}}>Most Vulnerable Zones in India</h4>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                        {highlyVulnerableHotspots.map((spot, i) => (
                          <div key={i} onClick={() => flyToCity(spot.geometry.coordinates[0], spot.geometry.coordinates[1], 13)} style={{background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer', border: '1px solid transparent'}} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem'}}>
                               <strong style={{color: 'var(--text-main)'}}>{spot.properties.city} Hotspot</strong>
                               <span style={{background: 'var(--danger)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: 'bold'}}>{(spot.properties.risk_score * 100).toFixed(0)} Risk</span>
                            </div>
                            <div style={{fontSize: '0.8rem'}}>Temp: {spot.properties.temperature.toFixed(1)}°C | Density: {spot.properties.building_density.toFixed(0)}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </>
            )}

            {activeTab === 'settings' && (
              <>
                <div className="panel-header">
                  <h2 className="panel-title"><Settings size={22} color="var(--text-main)" /> Settings</h2>
                </div>
                <div style={{padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem'}}>
                   <div style={{marginBottom: '1.5rem'}}>
                     <h3 style={{color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><MapIcon size={16}/> Map Style</h3>
                     <select 
                       value={mapStyleType} 
                       onChange={(e) => setMapStyleType(e.target.value)}
                       style={{width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border)', borderRadius: '0.25rem'}}
                     >
                       <option value="dark">Dark Matter (Default)</option>
                       <option value="light">Positron (Light)</option>
                       <option value="satellite">Satellite (Esri)</option>
                     </select>
                   </div>

                   <div style={{marginBottom: '1.5rem'}}>
                     <h3 style={{color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Sliders size={16}/> Visual Tuning</h3>
                     
                     <div style={{marginBottom: '1rem'}}>
                       <label style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem'}}>
                         <span>Point Radius</span>
                         <span style={{color: 'var(--accent)'}}>{baseRadius}px</span>
                       </label>
                       <input type="range" min="1" max="10" step="1" value={baseRadius} onChange={(e) => setBaseRadius(Number(e.target.value))} style={{width: '100%'}}/>
                     </div>
                     
                     <div>
                       <label style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem'}}>
                         <span>Layer Opacity</span>
                         <span style={{color: 'var(--accent)'}}>{(layerOpacity * 100).toFixed(0)}%</span>
                       </label>
                       <input type="range" min="0.1" max="1" step="0.1" value={layerOpacity} onChange={(e) => setLayerOpacity(Number(e.target.value))} style={{width: '100%'}}/>
                     </div>
                   </div>

                   <div style={{borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem'}}>
                     <button 
                       onClick={handleExport}
                       style={{width: '100%', padding: '0.75rem', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer'}}
                     >
                       <Download size={18} /> Export Simulation Data (JSON)
                     </button>
                   </div>
                </div>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
