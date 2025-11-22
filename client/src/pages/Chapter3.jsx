import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Chapter3.css';

// Import image assets
import hazardIcon from '../assets/hazard.png';
import poiIcon from '../assets/poi.png';
import coralIcon from '../assets/coral.png';
import submarineIcon from '../assets/submarine-clipart-xl.png';

const RAW_HAZARDS = [
  { r: 26, c: 11, type: "thermal_vent", label: "Active Chimney" },
  { r: 42, c: 44, type: "acidic_zone", label: "Low pH Mass" },
  { r: 0, c: 4, type: "trench_wall", label: "Steep Escarpment" },
  { r: 42, c: 34, type: "methane_leak", label: "Bubbling Seep" },
  { r: 12, c: 46, type: "methane_leak", label: "Bubbling Seep" }
];

const RAW_POI = [
  { r: 2, c: 0, id: "WRECK_001", label: "Sunken Freighter", desc: "20th Century hull." },
  { r: 0, c: 0, id: "WRECK_002", label: "Sunken Freighter", desc: "Cargo hold breach." },
  { r: 32, c: 0, id: "REEF_032", label: "Reef Sanctuary", desc: "High biodiversity." },
  { r: 5, c: 7, id: "WRECK_005", label: "Sunken Freighter", desc: "Deep resting state." }
];

const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export default function Chapter3() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [connectionMode, setConnectionMode] = useState('CONNECTING');
  const [status, setStatus] = useState({ depth: '--', pressure: '--', coords: '--' });
  const [scanResult, setScanResult] = useState(null);
  const [isPanic, setIsPanic] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');
  const [health, setHealth] = useState(100);
  const [coralSamples, setCoralSamples] = useState(0);
  const [gameStatus, setGameStatus] = useState('playing');

  // Mutable Game State
  const gameState = useRef({
    grid: [], 
    gridSize: 50,
    cellSize: 40,
    mouse: { x: -1000, y: -1000 },
    camera: { x: 0, y: 0 },
    isDragging: false,
    lastMouse: { x: 0, y: 0 },
    shakeStrength: 0,
    activeCell: null,
    health: 100,
    coralSamples: 0,
    gameStatus: 'playing',
    visitedHazards: new Set(),
    collectedCorals: new Set(),
    images: {
      hazard: null,
      poi: null,
      coral: null,
      submarine: null
    }
  });

  // Preload images
  useEffect(() => {
    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    Promise.all([
      loadImage(hazardIcon),
      loadImage(poiIcon),
      loadImage(coralIcon),
      loadImage(submarineIcon)
    ]).then(([hazard, poi, coral, submarine]) => {
      gameState.current.images = { hazard, poi, coral, submarine };
    }).catch(err => {
      console.warn("Failed to load images:", err);
    });
  }, []);

  // Initialize grid data
  useEffect(() => {
    const initGridData = async () => {
      try {
        // Try to fetch coral data from server
        const coralResponse = await fetch('http://localhost:3000/api/corals', {
          signal: AbortSignal.timeout(3000)
        });
        
        const hazardsResponse = await fetch('http://localhost:3000/api/hazards', {
          signal: AbortSignal.timeout(3000)
        });
        
        const poiResponse = await fetch('http://localhost:3000/api/poi', {
          signal: AbortSignal.timeout(3000)
        });
        
        if (!coralResponse.ok || !hazardsResponse.ok || !poiResponse.ok) {
          throw new Error('Server error');
        }
        
        const coralData = await coralResponse.json();
        const hazardsData = await hazardsResponse.json();
        const poiData = await poiResponse.json();
        
        // Build grid with coral data
        const grid = [];
        const GRID_SIZE = 50;
        
        for (let r = 0; r < GRID_SIZE; r++) {
          grid[r] = [];
          for (let c = 0; c < GRID_SIZE; c++) {
            grid[r][c] = {
              row: r, col: c,
              depth: rand(10, 100),
              pressure: rand(1, 10),
              biome: "plain",
              hazard: null, 
              poi: null, 
              coral: null
            };
          }
        }
        
        // Add corals from server data
        coralData.forEach(coral => {
          const r = coral.row;
          const c = coral.col;
          if (grid[r]?.[c]) {
            grid[r][c].coral = {
              cover: coral.coral_cover_pct,
              health: coral.health_index,
              bleaching: coral.bleaching_risk,
              biodiversity: coral.biodiversity_index
            };
            grid[r][c].biome = "coral";
          }
        });
        
        // Add hazards
        hazardsData.forEach(h => {
          if (grid[h.row]?.[h.col]) {
            grid[h.row][h.col].hazard = {
              type: h.type,
              severity: h.severity,
              label: h.notes
            };
          }
        });
        
        // Add POIs
        poiData.forEach(p => {
          if (grid[p.row]?.[p.col]) {
            grid[p.row][p.col].poi = {
              id: p.id,
              category: p.category,
              label: p.label,
              desc: p.description,
              value: p.research_value
            };
          }
        });
        
        gameState.current.grid = grid;
        gameState.current.gridSize = GRID_SIZE;
        setConnectionMode('ONLINE');
        setLoading(false);
        
      } catch (err) {
        console.warn("Backend unreachable, using SIMULATION mode.", err);
        
        // Fallback Grid Generation
        const grid = [];
        const GRID_SIZE = 50;
        
        for (let r = 0; r < GRID_SIZE; r++) {
          grid[r] = [];
          for (let c = 0; c < GRID_SIZE; c++) {
            grid[r][c] = {
              row: r, col: c,
              depth: rand(10, 100),
              pressure: rand(1, 10),
              biome: "plain",
              hazard: null, poi: null, coral: null
            };
            
            // Add some random corals
            if (Math.random() < 0.15) {
              const healthIndex = Math.random();
              grid[r][c].coral = {
                cover: randInt(50, 100),
                health: healthIndex,
                bleaching: 1 - healthIndex,
                biodiversity: Math.random()
              };
              grid[r][c].biome = "coral";
            }
          }
        }
        
        // Inject Mock Data
        RAW_HAZARDS.forEach(h => { 
          if (grid[h.r]?.[h.c]) {
            grid[h.r][h.c].hazard = { type: h.type, label: h.label };
          }
        });
        
        RAW_POI.forEach(p => { 
          if (grid[p.r]?.[p.c]) {
            grid[p.r][p.c].poi = p;
          }
        });
        
        // Add procedural hazards
        for (let i = 0; i < 20; i++) {
          let r = randInt(0, 49), c = randInt(0, 49);
          if (grid[r][c]) {
            grid[r][c].hazard = { type: "thermal_vent", label: "Unknown Thermal Spike" };
          }
        }

        gameState.current.grid = grid;
        gameState.current.gridSize = GRID_SIZE;
        setConnectionMode('OFFLINE');
        setLoading(false);
      }
    };

    initGridData();
  }, []);

  // Render loop
  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const handleResize = () => {
      if(canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const render = () => {
      const { grid, mouse, shakeStrength, gridSize, cellSize } = gameState.current;
      
      // Clear
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!grid || grid.length === 0) { 
        animationFrameId = requestAnimationFrame(render);
        return; 
      }

      // Auto-pan camera to follow mouse at screen edges
      const { camera } = gameState.current;
      const edgeThreshold = 100;
      const panSpeed = 5;
      
      if (mouse.x > canvas.width - edgeThreshold) {
        camera.x -= panSpeed;
      } else if (mouse.x < edgeThreshold) {
        camera.x += panSpeed;
      }
      
      if (mouse.y > canvas.height - edgeThreshold) {
        camera.y -= panSpeed;
      } else if (mouse.y < edgeThreshold) {
        camera.y += panSpeed;
      }
      
      // Clamp camera to grid bounds
      const gridSizePx = gridSize * cellSize;
      const maxX = 0;
      const minX = canvas.width - gridSizePx;
      const maxY = 0;
      const minY = canvas.height - gridSizePx;
      
      camera.x = Math.max(minX, Math.min(maxX, camera.x));
      camera.y = Math.max(minY, Math.min(maxY, camera.y));

      // Camera with shake
      let shakeX = 0, shakeY = 0;
      if (shakeStrength > 0) {
        shakeX = (Math.random() - 0.5) * 20;
        shakeY = (Math.random() - 0.5) * 20;
      }
      const startX = camera.x + shakeX;
      const startY = camera.y + shakeY;

      // Draw Grid
      ctx.save();
      ctx.translate(startX, startY);

      for (let r = 0; r < gridSize; r++) {
        if (!grid[r]) continue;
        for (let c = 0; c < gridSize; c++) {
          const cell = grid[r][c];
          if (!cell) continue;

          const x = c * cellSize;
          const y = r * cellSize;

          // Biome colors
          ctx.fillStyle = '#0d2840'; // Default ocean floor
          if (cell.biome === 'coral' && cell.coral) {
            // Color based on coral health
            if (cell.coral.health > 0.9) {
              ctx.fillStyle = '#1a4d2e'; // Healthy green
            } else if (cell.coral.health > 0.7) {
              ctx.fillStyle = '#4d4d1a'; // Moderate yellow-green
            } else {
              ctx.fillStyle = '#4d1a1a'; // Unhealthy red
            }
          }
          if (cell.hazard) ctx.fillStyle = '#1a0a0a'; 
          
          ctx.fillRect(x, y, cellSize - 1, cellSize - 1);

          // Icons
          const cx = x + cellSize / 2;
          const cy = y + cellSize / 2;
          const iconSize = 24;
          const { images } = gameState.current;

          // Draw coral icon
          if (cell.coral && !cell.hazard && images.coral) {
            ctx.drawImage(images.coral, cx - iconSize/2, cy - iconSize/2, iconSize, iconSize);
          }

          if (cell.hazard && images.hazard) {
            ctx.drawImage(images.hazard, cx - iconSize/2, cy - iconSize/2, iconSize, iconSize);
          } else if (cell.poi && images.poi) {
            ctx.drawImage(images.poi, cx - iconSize/2, cy - iconSize/2, iconSize, iconSize);
          }

          // Debug text
          ctx.fillStyle = "rgba(0, 255, 157, 0.1)";
          ctx.font = "8px monospace";
          ctx.fillText(`${r},${c}`, cx - 10, y + cellSize - 5);
        }
      }
      ctx.restore();

      // Draw submarine cursor
      const { submarine } = gameState.current.images;
      if (submarine) {
        ctx.save();
        const subSize = 40;
        ctx.drawImage(submarine, mouse.x - subSize/2, mouse.y - subSize/2, subSize, subSize);
        ctx.restore();
      }

      // Flashlight effect
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      const flashlight = ctx.createRadialGradient(mouse.x, mouse.y, 10, mouse.x, mouse.y, 200);
      flashlight.addColorStop(0, 'rgba(0, 0, 0, 1)');
      flashlight.addColorStop(0.7, 'rgba(0, 0, 0, 0.6)');
      flashlight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = flashlight;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Panic Overlay
      if (shakeStrength > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        const panicGrad = ctx.createRadialGradient(mouse.x, mouse.y, 10, mouse.x, mouse.y, 200);
        panicGrad.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
        panicGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = panicGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = `rgba(255, 0, 0, ${Math.random() * 0.2})`;
        ctx.fillRect(0, Math.random() * canvas.height, canvas.width, 2);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [loading]);

  // Mouse handlers
  const handleMouseDown = (e) => {
    gameState.current.isDragging = true;
    gameState.current.lastMouse = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    gameState.current.isDragging = false;
  };

  const handleMouseMove = (e) => {
    if (loading || !canvasRef.current) return;
    if (gameStatus !== 'playing') return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Handle dragging
    if (gameState.current.isDragging) {
      const deltaX = e.clientX - gameState.current.lastMouse.x;
      const deltaY = e.clientY - gameState.current.lastMouse.y;
      
      gameState.current.camera.x += deltaX;
      gameState.current.camera.y += deltaY;
      
      const { gridSize, cellSize } = gameState.current;
      const gridSizePx = gridSize * cellSize;
      const maxX = 0;
      const minX = canvas.width - gridSizePx;
      const maxY = 0;
      const minY = canvas.height - gridSizePx;
      
      gameState.current.camera.x = Math.max(minX, Math.min(maxX, gameState.current.camera.x));
      gameState.current.camera.y = Math.max(minY, Math.min(maxY, gameState.current.camera.y));
      
      gameState.current.lastMouse = { x: e.clientX, y: e.clientY };
      return;
    }

    gameState.current.mouse = { x: mouseX, y: mouseY };

    const { gridSize, cellSize, camera } = gameState.current;
    const col = Math.floor((mouseX - camera.x) / cellSize);
    const row = Math.floor((mouseY - camera.y) / cellSize);

    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
      if (gameState.current.activeCell) {
        gameState.current.activeCell = null;
        setScanResult(null);
        setIsPanic(false);
        gameState.current.shakeStrength = 0;
        setStatus(prev => ({ ...prev, coords: '--' }));
      }
      return;
    }

    const cell = gameState.current.grid[row]?.[col];
    if (!cell) return;

    if (gameState.current.activeCell !== cell) {
      gameState.current.activeCell = cell;

      setStatus({
        depth: Math.floor(cell.depth) + "m",
        pressure: Math.floor(cell.pressure) + "atm",
        coords: `${row}, ${col}`
      });

      // Handle hazards
      if (cell.hazard) {
        setIsPanic(true);
        setWarningMsg(cell.hazard.type ? cell.hazard.type.replace('_', ' ') : "DANGER");
        gameState.current.shakeStrength = 5;

        const hazardKey = `${row},${col}`;
        if (!gameState.current.visitedHazards.has(hazardKey)) {
          gameState.current.visitedHazards.add(hazardKey);
          const newHealth = health - 10;
          gameState.current.health = newHealth;
          setHealth(newHealth);

          if (newHealth <= 0) {
            setGameStatus('dead');
            gameState.current.gameStatus = 'dead';
            setIsPanic(false);
            gameState.current.shakeStrength = 0;
            return;
          }
        }
      } else {
        setIsPanic(false);
        gameState.current.shakeStrength = 0;
      }

      // Handle coral collection
      let collectedCoralInfo = null;
      if (cell.coral) {
        const coralKey = `${row},${col}`;
        if (!gameState.current.collectedCorals.has(coralKey)) {
          gameState.current.collectedCorals.add(coralKey);
          const newCoralCount = gameState.current.coralSamples + 1;
          gameState.current.coralSamples = newCoralCount;
          setCoralSamples(newCoralCount);
          
          collectedCoralInfo = cell.coral;
          cell.coral = null; // Remove coral after collection
          cell.biome = "plain";

          if (newCoralCount >= 30) {
            setGameStatus('success');
            gameState.current.gameStatus = 'success';
            setIsPanic(false);
            gameState.current.shakeStrength = 0;
          }
        }
      }

      // Show scan results
      if (cell.poi || cell.coral || collectedCoralInfo) {
        setScanResult({ 
          poi: cell.poi, 
          coral: cell.coral || collectedCoralInfo 
        });
      } else {
        setScanResult(null);
      }
    }
  };

  const resetRun = () => {
    gameState.current.health = 100;
    gameState.current.coralSamples = 0;
    gameState.current.gameStatus = 'playing';
    gameState.current.visitedHazards.clear();
    gameState.current.collectedCorals.clear();
    gameState.current.activeCell = null;
    gameState.current.shakeStrength = 0;
    setHealth(100);
    setCoralSamples(0);
    setGameStatus('playing');
    setIsPanic(false);
    setWarningMsg('');
    setScanResult(null);
    setStatus({ depth: '--', pressure: '--', coords: '--' });
    
    // Reload the page to reset the grid
    window.location.reload();
  };

  if (loading) return (
    <div className="loading-screen">
      INITIALIZING CORAL REEF SCANNER...
    </div>
  );

  return (
    <div className="chapter3-container" style={{ cursor: gameStatus !== 'playing' ? 'default' : 'none' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="chapter3-canvas"
      />

      {/* HUD */}
      <div className="hud-container">
        <div className="health-bar-container">
          <div className="health-bar-label">HULL INTEGRITY</div>
          <div className="health-bar-outer">
            <div className="health-bar-inner" style={{ 
              width: `${health}%`, 
              backgroundColor: health > 60 ? '#00ff9d' : health > 30 ? '#ffaa00' : '#ff0000' 
            }}></div>
          </div>
          <div className="health-bar-text">{health}%</div>
        </div>
        
        <div className="hud-panels-wrapper">
          <div className="hud-panel">
            <h2 className="panel-header">
              <span>Status</span>
              <span className={connectionMode === 'ONLINE' ? "connection-status online" : "connection-status offline"}>
                [{connectionMode}]
              </span>
            </h2>
            <div className="status-list">
              <div className="status-item">
                <span>DEPTH:</span> 
                <span className="status-value">{status.depth}</span>
              </div>
              <div className="status-item">
                <span>PRESSURE:</span> 
                <span className="status-value">{status.pressure}</span>
              </div>
              <div className="status-item">
                <span>COORDS:</span> 
                <span className="status-value">{status.coords}</span>
              </div>
              <div className="status-item">
                <span>SAMPLES:</span> 
                <span className="status-value">{coralSamples}/30</span>
              </div>
            </div>
          </div>

          <div className={`hud-panel scan-panel ${scanResult ? 'visible' : 'hidden'}`}>
            <h2 className="panel-header">Scan Results</h2>
            <div className="scan-results">
              {scanResult?.poi && (
                <div>
                  <div className="scan-item-poi">POI: {scanResult.poi.label}</div>
                  <div className="scan-item-desc">{scanResult.poi.desc}</div>
                  {scanResult.poi.value && (
                    <div className="scan-item-detail">Research Value: {scanResult.poi.value}</div>
                  )}
                </div>
              )}
              {scanResult?.coral && (
                <div>
                  <div className="scan-item-coral">Coral Sample Collected!</div>
                  <div className="scan-item-detail">Coverage: {scanResult.coral.cover}%</div>
                  <div className="scan-item-detail">Health: {(scanResult.coral.health * 100).toFixed(1)}%</div>
                  <div className="scan-item-detail">Bleaching Risk: {(scanResult.coral.bleaching * 100).toFixed(1)}%</div>
                  <div className="scan-item-detail">Biodiversity: {(scanResult.coral.biodiversity * 100).toFixed(1)}%</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isPanic && (
        <div className="warning-overlay">
          WARNING: {warningMsg}
        </div>
      )}

      {gameStatus !== 'playing' && (
        <div className="end-overlay">
          <div className="end-card">
            <div className="end-title">
              {gameStatus === 'dead' ? 'MISSION FAILED' : 'RESEARCH COMPLETE'}
            </div>
            <div className="end-metrics">
              <div>Final hull integrity: {health}%</div>
              <div>Coral samples collected: {coralSamples}</div>
              {gameStatus === 'success' && (
                <div className="success-message">
                  Excellent work! Your coral samples will help scientists understand reef health and biodiversity.
                </div>
              )}
            </div>
            <div className="end-actions">
              <button className="end-button" onClick={resetRun}>
                {gameStatus === 'dead' ? 'Retry Mission' : 'Explore Again'}
              </button>
              <button className="end-button secondary" onClick={() => navigate('/chapter1')}>
                Back to Chapter 1
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
