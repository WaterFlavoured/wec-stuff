const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const cors = require('cors');

const app = express();
// node.js port, we have a proxy set up so client can reach backend.
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Grid configs for all the csv files.
const ABYSS_CONFIG = {
    GRID_SIZE: 50,
    DATA_DIR: path.join(__dirname, 'data')
};

let WORLD_GRID = [];

// Creates a blank grid to superpose other things on.
const createEmptyGrid = () => {
    const grid = [];
    for (let r = 0; r < ABYSS_CONFIG.GRID_SIZE; r++) {
        grid[r] = [];
        for (let c = 0; c < ABYSS_CONFIG.GRID_SIZE; c++) {
            grid[r][c] = {
                row: r, col: c,
                biome: 'plain',
                depth: 0, pressure: 0,
                hazard: null, poi: null, life: null, resource: null
            };
        }
    }
    return grid;
};

// Parses the CSV files into readable content, and pushes said content into an array.
const parseCSV = (filename) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const filePath = path.join(ABYSS_CONFIG.DATA_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            console.warn(`[Abyss] Warning: Data file missing: ${filename}`);
            resolve([]);
            return;
        }

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (err) => {
                console.error(`[Abyss] Error reading ${filename}:`, err);
                // Resolve empty on error to keep server alive
                resolve([]); 
            });
    });
};

// Main Loader: Merges all CSV data into the Grid
async function initializeAbyssWorld() {
    console.log("🌊 [Abyss] Booting Submersible Systems...");
    WORLD_GRID = createEmptyGrid();

    try {
        // Load all data files in parallel
        const [cells, hazards, pois, life, resources] = await Promise.all([
            parseCSV('cells.csv'),
            parseCSV('hazards.csv'),
            parseCSV('poi.csv'),
            parseCSV('life.csv'),
            parseCSV('resources.csv')
        ]);

        // 1. Map Base Cell Data (Depth, Biome)
        cells.forEach(c => {
            const r = parseInt(c.row);
            const col = parseInt(c.col);
            if (WORLD_GRID[r]?.[col]) {
                WORLD_GRID[r][col].depth = parseFloat(c.depth_m);
                WORLD_GRID[r][col].biome = c.biome;
                WORLD_GRID[r][col].pressure = parseFloat(c.pressure_atm);
            }
        });

        // 2. Map Hazards
        hazards.forEach(h => {
            const r = parseInt(h.row), c = parseInt(h.col);
            if (WORLD_GRID[r]?.[c]) {
                WORLD_GRID[r][c].hazard = { type: h.type, severity: h.severity, notes: h.notes };
            }
        });

        // 3. Map POIs (Wrecks)
        pois.forEach(p => {
            const r = parseInt(p.row), c = parseInt(p.col);
            if (WORLD_GRID[r]?.[c]) {
                WORLD_GRID[r][c].poi = { id: p.id, label: p.label, desc: p.description };
            }
        });

        // 4. Map Life
        life.forEach(l => {
            const r = parseInt(l.row), c = parseInt(l.col);
            if (WORLD_GRID[r]?.[c]) {
                WORLD_GRID[r][c].life = { species: l.species, threat: parseInt(l.threat_level) };
            }
        });

        // 5. Map Resources
        resources.forEach(res => {
            const r = parseInt(res.row), c = parseInt(res.col);
            if (WORLD_GRID[r]?.[c]) {
                WORLD_GRID[r][c].resource = { type: res.type, value: res.economic_value };
            }
        });

        console.log("✅ [Abyss] World Generation Complete.");
    } catch (err) {
        console.error("❌ [Abyss] Initialization Failed:", err);
    }
}

// --- 3. API ROUTES ---

// Game State Endpoint
app.get('/api/gamestate', (req, res) => {
    res.json({
        grid: WORLD_GRID,
        metadata: {
            rows: ABYSS_CONFIG.GRID_SIZE,
            cols: ABYSS_CONFIG.GRID_SIZE
        }
    });
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});


// --- 4. SERVER STARTUP ---
// We wait for the game world to initialize before opening the port
initializeAbyssWorld().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
});