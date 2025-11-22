import React, { useEffect, useRef, useState } from 'react';

// --- MOCK DATA FALLBACKS ---
// Used if the server is unreachable so the app doesn't crash.
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
  const [connectionMode, setConnectionMode] = useState('CONNECTING'); // CONNECTING, ONLINE, OFFLINE
  const [status, setStatus] = useState({ depth: '--', pressure: '--', coords: '--' });
  const [scanResult, setScanResult] = useState(null);
  const [isPanic, setIsPanic] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');

  // Mutable Game State (Refs for performance in render loop)
  const gameState = useRef({
    grid: [], 
    gridSize: 50,
    cellSize: 40,
    mouse: { x: -1000, y: -1000 },
    shakeStrength: 0,
    activeCell: null
  });

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    const initGridData = async () => {
      try {
        // Attempt to fetch from Express Server
        const response = await fetch('http://localhost:3000/api/gamestate', {
            signal: AbortSignal.timeout(3000) // 3s timeout
        });
        
        if (!response.ok) throw new Error('Server error');
        
        const data = await response.json();
        gameState.current.grid = data.grid;
        gameState.current.gridSize = data.metadata.rows;
        setConnectionMode('ONLINE');
        setLoading(false);
        
      } catch (err) {
        console.warn("Backend unreachable, using SIMULATION mode.", err);
        
        // Generate Fallback Grid
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
        
        // Procedural Hazards
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

  // --- 2. RENDER LOOP ---
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
      
      // 1. Clear Background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!grid || grid.length === 0) { 
          animationFrameId = requestAnimationFrame(render);
          return; 
      }

      // 2. Calculate Camera Shake
      const gridSizePx = gridSize * cellSize;
      let shakeX = 0, shakeY = 0;
      if (shakeStrength > 0) {
        shakeX = (Math.random() - 0.5) * 20;
        shakeY = (Math.random() - 0.5) * 20;
      }
      const startX = (canvas.width - gridSizePx) / 2 + shakeX;
      const startY = (canvas.height - gridSizePx) / 2 + shakeY;

      // 3. Draw Visible Grid (Optimized)
      const range = 6; 
      const mCol = Math.floor((mouse.x - startX) / cellSize);
      const mRow = Math.floor((mouse.y - startY) / cellSize);
      const rMin = Math.max(0, mRow - range);
      const rMax = Math.min(gridSize, mRow + range);
      const cMin = Math.max(0, mCol - range);
      const cMax = Math.min(gridSize, mCol + range);

      ctx.save();
      ctx.translate(startX, startY);

      for (let r = rMin; r < rMax; r++) {
        if (!grid[r]) continue;
        for (let c = cMin; c < cMax; c++) {
          const cell = grid[r][c];
          if (!cell) continue;

          const x = c * cellSize;
          const y = r * cellSize;

          // Ground
          ctx.fillStyle = '#001a11';
          if (cell.biome === 'slope') ctx.fillStyle = '#00261a';
          if (cell.hazard) ctx.fillStyle = '#1a0a0a'; 
          ctx.fillRect(x, y, cellSize - 1, cellSize - 1);

          // Icons
          ctx.font = "20px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const cx = x + cellSize / 2;
          const cy = y + cellSize / 2;

          if (cell.hazard) ctx.fillText("⚠️", cx, cy);
          else if (cell.poi) ctx.fillText("⚓", cx, cy);
          else if (cell.life) ctx.fillText("🦑", cx, cy);
          else if (cell.resource) ctx.fillText("💎", cx, cy);

          // Debug Coords
          ctx.fillStyle = "rgba(0, 255, 157, 0.1)";
          ctx.font = "8px monospace";
          ctx.fillText(`${r},${c}`, cx, y + cellSize - 5);
        }
      }
      ctx.restore();

      // 4. Flashlight Mask
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      const flashlight = ctx.createRadialGradient(mouse.x, mouse.y, 10, mouse.x, mouse.y, 180);
      flashlight.addColorStop(0, 'rgba(0, 0, 0, 1)');
      flashlight.addColorStop(0.8, 'rgba(0, 0, 0, 0.5)');
      flashlight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = flashlight;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      // 5. Panic Overlay
      if (shakeStrength > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        const panicGrad = ctx.createRadialGradient(mouse.x, mouse.y, 10, mouse.x, mouse.y, 200);
        panicGrad.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
        panicGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = panicGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Glitch Lines
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

  // --- 3. MOUSE HANDLER ---
  const handleMouseMove = (e) => {
    if (loading || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    gameState.current.mouse = { x: mouseX, y: mouseY };

    const { gridSize, cellSize } = gameState.current;
    const gridSizePx = gridSize * cellSize;
    const startX = (canvas.width - gridSizePx) / 2; 
    const startY = (canvas.height - gridSizePx) / 2;

    const col = Math.floor((mouseX - startX) / cellSize);
    const row = Math.floor((mouseY - startY) / cellSize);

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
    <div className="h-screen w-full bg-black flex items-center justify-center text-green-500 font-mono">
        INITIALIZING ABYSSAL INTERFACE...
    </div>
  );

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden cursor-none font-mono text-[#00ff9d]">
      <style>{`
        @keyframes flash { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .animate-flash { animation: flash 0.2s infinite; }
      `}</style>

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        className="absolute top-0 left-0 block w-full h-full"
      />

      {/* HUD */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-5 flex justify-between z-10">
        <div className="bg-[#00140acc] border border-[#004d33] p-4 rounded backdrop-blur-sm w-72 h-fit">
          <h2 className="text-white border-b border-[#00ff9d] pb-1 mb-2 text-sm tracking-widest uppercase flex justify-between">
            <span>Status</span>
            <span className={connectionMode === 'ONLINE' ? "text-green-400" : "text-yellow-600"}>[{connectionMode}]</span>
          </h2>
          <div className="space-y-1 text-xs">
             <div className="flex justify-between"><span>DEPTH:</span> <span className="text-white font-bold">{status.depth}</span></div>
             <div className="flex justify-between"><span>PRESSURE:</span> <span className="text-white font-bold">{status.pressure}</span></div>
             <div className="flex justify-between"><span>COORDS:</span> <span className="text-white font-bold">{status.coords}</span></div>
          </div>
        </div>

        <div className={`bg-[#00140acc] border border-[#004d33] p-4 rounded backdrop-blur-sm w-72 h-fit transition-all duration-300 ${scanResult ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-5'}`}>
          <h2 className="text-white border-b border-[#00ff9d] pb-1 mb-2 text-sm tracking-widest uppercase">Scan Results</h2>
          <div className="space-y-3 text-sm">
            {scanResult?.poi && <div><div className="text-yellow-300 font-bold">Target: {scanResult.poi.label}</div><div className="text-xs text-gray-300">{scanResult.poi.desc}</div></div>}
            {scanResult?.life && <div><div className="text-[#00ff9d] font-bold">Bio-sign: {scanResult.life.species}</div><div className="text-xs text-gray-300">Threat: {scanResult.life.threat}</div></div>}
            {scanResult?.resource && <div><div className="text-gray-400 font-bold">Mineral: {scanResult.resource.type}</div><div className="text-xs text-gray-500">Value: ${scanResult.resource.value}</div></div>}
          </div>
        </div>
      </div>

      {isPanic && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-red-600 bg-red-900/90 text-red-500 px-10 py-6 text-4xl font-bold uppercase animate-flash pointer-events-none z-50 text-center">
          WARNING: {warningMsg}
        </div>
      )}
    </div>
  );
}