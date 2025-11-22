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

let grid = [];

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
            // Takes all data, and creates streams, reading 1 row at a time.
            .pipe(csv())
            // Each row gets pushed into the results arraay.
            .on('data', (data) => results.push(data))
            // At the end once all data was pushed, it resolves all the rows.
            .on('end', () => resolve(results))
            .on('error', (err) => {
                console.error(`[Abyss] Error reading ${filename}:`, err);
                resolve([]); 
            });
    });
};

// Main Loader: Merges all CSV data into the Grid
async function initializeAbyssWorld() {
    console.log("🌊 [Abyss] Booting Submersible Systems...");
    // Initialize empty grid for frontend to utilize.
    grid = createEmptyGrid();

    try {
        // Load all data files superposed on top of each other. This is seen in the Chapter 2 game.
        const [cells, hazards, pois, life, resources] = await Promise.all([
            parseCSV('cells.csv'),
            parseCSV('hazards.csv'),
            parseCSV('poi.csv'),
            parseCSV('life.csv'),
            parseCSV('resources.csv')
        ]);

        // Maps base cells.csv file.
        cells.forEach(c => {
            const r = parseInt(c.row);
            const col = parseInt(c.col);
            if (grid[r]?.[col]) {
                grid[r][col].depth = parseFloat(c.depth_m);
                grid[r][col].biome = c.biome;
                grid[r][col].pressure = parseFloat(c.pressure_atm);
            }
        });

        // Maps the hazards.csv file.
        hazards.forEach(h => {
            const r = parseInt(h.row), c = parseInt(h.col);
            if (grid[r]?.[c]) {
                grid[r][c].hazard = { type: h.type, severity: h.severity, notes: h.notes };
            }
        });

        // Maps the Points of Interests.
        pois.forEach(p => {
            const r = parseInt(p.row), c = parseInt(p.col);
            if (grid[r]?.[c]) {
                grid[r][c].poi = { id: p.id, label: p.label, desc: p.description };
            }
        });

        // Maps any living entities.
        life.forEach(l => {
            const r = parseInt(l.row), c = parseInt(l.col);
            if (grid[r]?.[c]) {
                grid[r][c].life = { species: l.species, threat: parseInt(l.threat_level) };
            }
        });

        // Maps any resources.
        resources.forEach(res => {
            const r = parseInt(res.row), c = parseInt(res.col);
            if (grid[r]?.[c]) {
                grid[r][c].resource = { type: res.type, value: res.economic_value };
            }
        });

        console.log("[Abyss] World Generation Complete.");
    } catch (err) {
        console.error("[Abyss] Initialization Failed:", err);
    }
}


// API uses the GET Header to fetch all csv contents and displays in Chapter 2.
app.get('/api/gamestate', (req, res) => {
    res.json({
        grid: grid,
        metadata: {
            rows: ABYSS_CONFIG.GRID_SIZE,
            cols: ABYSS_CONFIG.GRID_SIZE
        }
    });
});

// API endpoint for coral data (Chapter 3)
app.get('/api/corals', async (req, res) => {
    try {
        const corals = await parseCSV('corals.csv');
        const processedCorals = corals.map(c => ({
            row: parseInt(c.row),
            col: parseInt(c.col),
            coral_cover_pct: parseInt(c.coral_cover_pct),
            health_index: parseFloat(c.health_index),
            bleaching_risk: parseFloat(c.bleaching_risk),
            biodiversity_index: parseFloat(c.biodiversity_index)
        }));
        res.json(processedCorals);
    } catch (err) {
        console.error('[Abyss] Error fetching corals:', err);
        res.status(500).json({ error: 'Failed to fetch coral data' });
    }
});

// API endpoint for hazards (Chapter 3)
app.get('/api/hazards', async (req, res) => {
    try {
        const hazards = await parseCSV('hazards.csv');
        const processedHazards = hazards.map(h => ({
            row: parseInt(h.row),
            col: parseInt(h.col),
            type: h.type,
            severity: parseInt(h.severity),
            notes: h.notes
        }));
        res.json(processedHazards);
    } catch (err) {
        console.error('[Abyss] Error fetching hazards:', err);
        res.status(500).json({ error: 'Failed to fetch hazard data' });
    }
});

// API endpoint for POIs (Chapter 3)
app.get('/api/poi', async (req, res) => {
    try {
        const pois = await parseCSV('poi.csv');
        const processedPOIs = pois.map(p => ({
            id: p.id,
            row: parseInt(p.row),
            col: parseInt(p.col),
            category: p.category,
            label: p.label,
            description: p.description,
            research_value: parseInt(p.research_value)
        }));
        res.json(processedPOIs);
    } catch (err) {
        console.error('[Abyss] Error fetching POIs:', err);
        res.status(500).json({ error: 'Failed to fetch POI data' });
    }
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// We wait for the game world to initialize before opening the port
initializeAbyssWorld().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
});