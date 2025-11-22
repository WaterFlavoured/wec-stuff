import React, { useEffect, useRef, useState } from 'react';
import './AbyssGame.css';

// Import image assets
import hazardIcon from './assets/hazard.png';
import poiIcon from './assets/poi.png';
import lifeIcon from './assets/life.png';
import resourceIcon from './assets/resource.png';
import submarineIcon from './assets/submarine-clipart-xl.png';

// --- MOCK DATA FALLBACKS ---
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

const RAW_LIFE = [
  { r: 22, c: 45, species: "Abyssal_Ray", threat: 2 },
  { r: 44, c: 38, species: "Abyssal_Ray", threat: 2 },
  { r: 47, c: 31, species: "Abyssal_Plant", threat: 0 },
  { r: 25, c: 29, species: "Giant_Isopod", threat: 1 }
];

const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export default function AbyssGame() {
  const canvasRef = useRef(null);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [connectionMode, setConnectionMode] = useState('CONNECTING');
  const [status, setStatus] = useState({ depth: '--', pressure: '--', coords: '--' });
  const [scanResult, setScanResult] = useState(null);
  const [isPanic, setIsPanic] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');

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
    images: {
      hazard: null,
      poi: null,
      life: null,
      resource: null,
      submarine: null
    }
  });

  // --- 1. PRELOAD IMAGES ---
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
      loadImage(lifeIcon),
      loadImage(resourceIcon),
      loadImage(submarineIcon)
    ]).then(([hazard, poi, life, resource, submarine]) => {
      gameState.current.images = { hazard, poi, life, resource, submarine };
    }).catch(err => {
      console.warn("Failed to load images:", err);
    });
  }, []);

  // --- 2. INITIALIZATION ---
  useEffect(() => {
    const initGridData = async () => {
      try {
        // Fetch from Express Server
        const response = await fetch('http://localhost:3000/api/gamestate', {
            signal: AbortSignal.timeout(3000)
        });
        
        if (!response.ok) throw new Error('Server error');
        
        const data = await response.json();
        gameState.current.grid = data.grid;
        gameState.current.gridSize = data.metadata.rows;
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
              depth: rand(4000, 6000),
              pressure: rand(400, 600),
              biome: "plain",
              hazard: null, poi: null, life: null, resource: null
            };
            if (Math.random() < 0.1) grid[r][c].biome = "slope";
            if (Math.random() < 0.05) grid[r][c].resource = { type: "Manganese_Nodule", value: randInt(20000, 50000) };
          }
        }
        // Inject Mock Data
        RAW_HAZARDS.forEach(h => { if (grid[h.r]?.[h.c]) grid[h.r][h.c].hazard = h; });
        RAW_POI.forEach(p => { if (grid[p.r]?.[p.c]) grid[p.r][p.c].poi = p; });
        RAW_LIFE.forEach(l => { if (grid[l.r]?.[l.c]) grid[l.r][l.c].life = l; });
        
        // Add procedural hazards
        for (let i = 0; i < 40; i++) {
            let r = randInt(0, 49), c = randInt(0, 49);
            grid[r][c].hazard = { type: "thermal_vent", label: "Unknown Thermal Spike" };
        }

        gameState.current.grid = grid;
        gameState.current.gridSize = GRID_SIZE;
        setConnectionMode('OFFLINE');
        setLoading(false);
      }
    };

    initGridData();
  }, []);

  // --- 3. RENDER LOOP ---
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
      ctx.fillStyle = '#050505';
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

      // Draw Entire Grid
      ctx.save();
      ctx.translate(startX, startY);

      for (let r = 0; r < gridSize; r++) {
        if (!grid[r]) continue;
        for (let c = 0; c < gridSize; c++) {
          const cell = grid[r][c];
          if (!cell) continue;

          const x = c * cellSize;
          const y = r * cellSize;

          // Biome
          ctx.fillStyle = '#001a11';
          if (cell.biome === 'slope') ctx.fillStyle = '#00261a';
          if (cell.hazard) ctx.fillStyle = '#1a0a0a'; 
          ctx.fillRect(x, y, cellSize - 1, cellSize - 1);

          // Icons
          const cx = x + cellSize / 2;
          const cy = y + cellSize / 2;
          const iconSize = 24;
          const { images } = gameState.current;

          if (cell.hazard && images.hazard) {
            ctx.drawImage(images.hazard, cx - iconSize/2, cy - iconSize/2, iconSize, iconSize);
          } else if (cell.poi && images.poi) {
            ctx.drawImage(images.poi, cx - iconSize/2, cy - iconSize/2, iconSize, iconSize);
          } else if (cell.life && images.life) {
            ctx.drawImage(images.life, cx - iconSize/2, cy - iconSize/2, iconSize, iconSize);
          } else if (cell.resource && images.resource) {
            ctx.drawImage(images.resource, cx - iconSize/2, cy - iconSize/2, iconSize, iconSize);
          }

          // Debug Text
          ctx.fillStyle = "rgba(0, 255, 157, 0.1)";
          ctx.font = "8px monospace";
          ctx.fillText(`${r},${c}`, cx, y + cellSize - 5);
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

      // Flashlight Mask
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      const flashlight = ctx.createRadialGradient(mouse.x, mouse.y, 10, mouse.x, mouse.y, 180);
      flashlight.addColorStop(0, 'rgba(0, 0, 0, 1)');
      flashlight.addColorStop(0.8, 'rgba(0, 0, 0, 0.5)');
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
        
        // Glitch
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

  // --- 4. MOUSE HANDLER ---
  const handleMouseDown = (e) => {
    gameState.current.isDragging = true;
    gameState.current.lastMouse = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    gameState.current.isDragging = false;
  };

  const handleMouseMove = (e) => {
    if (loading || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Handle dragging for camera movement
    if (gameState.current.isDragging) {
      const deltaX = e.clientX - gameState.current.lastMouse.x;
      const deltaY = e.clientY - gameState.current.lastMouse.y;
      
      gameState.current.camera.x += deltaX;
      gameState.current.camera.y += deltaY;
      
      // Clamp camera to grid bounds
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

      if (cell.hazard) {
        setIsPanic(true);
        setWarningMsg(cell.hazard.type ? cell.hazard.type.replace('_', ' ') : "DANGER");
        gameState.current.shakeStrength = 5;
      } else {
        setIsPanic(false);
        gameState.current.shakeStrength = 0;
      }

      if (cell.poi || cell.life || cell.resource) {
        setScanResult({ poi: cell.poi, life: cell.life, resource: cell.resource });
      } else {
        setScanResult(null);
      }
    }
  };

  if (loading) return (
    <div className="loading-screen">
        INITIALIZING ABYSSAL INTERFACE...
    </div>
  );

  return (
    <div className="abyss-game-container">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="abyss-game-canvas"
      />

      {/* HUD */}
      <div className="hud-container">
        <div className="hud-panel">
          <h2 className="panel-header">
            <span>Status</span>
            <span className={connectionMode === 'ONLINE' ? "connection-status online" : "connection-status offline"}>[{connectionMode}]</span>
          </h2>
          <div className="status-list">
             <div className="status-item"><span>DEPTH:</span> <span className="status-value">{status.depth}</span></div>
             <div className="status-item"><span>PRESSURE:</span> <span className="status-value">{status.pressure}</span></div>
             <div className="status-item"><span>COORDS:</span> <span className="status-value">{status.coords}</span></div>
          </div>
        </div>

        <div className={`hud-panel scan-panel ${scanResult ? 'visible' : 'hidden'}`}>
          <h2 className="panel-header">Scan Results</h2>
          <div className="scan-results">
            {scanResult?.poi && <div><div className="scan-item-poi">Target: {scanResult.poi.label}</div><div className="scan-item-desc">{scanResult.poi.desc}</div></div>}
            {scanResult?.life && <div><div className="scan-item-life">Bio-sign: {scanResult.life.species.replace(/_/g, ' ')}</div><div className="scan-item-desc">Threat: {scanResult.life.threat}</div></div>}
            {scanResult?.resource && <div><div className="scan-item-resource">Mineral: {scanResult.resource.type.replace(/_/g, ' ')}</div><div className="scan-item-detail">Value: ${scanResult.resource.value}</div></div>}
          </div>
        </div>
      </div>

      {isPanic && (
        <div className="warning-overlay">
          WARNING: {warningMsg}
        </div>
      )}
    </div>
  );
}