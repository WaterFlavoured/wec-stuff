const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const app = express();

app.use(express.json());
app.use(cors());

const SIZE = 50;
let grid = [];


// Function to load CSV Files into a Grid Format.
function loadCSVGrid(filePath) {
    return new Promise((resolve, reject) => {
        const cells = [];

        // Opens the files as a stream, not all simultaneously.
        fs.createReadStream(filePath)
            // Piping it using csv() just parses the data into a CSV format and converts it to a JS object for us to read.
            .pipe(csv())
            .on('data', (row) => {
                const rows = Number(row.row);
                const columns = Number(row.col);

                // Pushing all guaranteed data in all files to all the sets.
                // Values that are in some and not in others have a query, adjusting the value to null if non-present.
                cells.push({
                    row: Number(rows),
                    col: Number(columns),
                    x_km: row.x_km ? Number(cellRow.x_km) : null,
                    y_km: row.y_km ? Number(cellRow.y_km) : null,
                    lat: row.lat ? Number(row.lat) : null,
                    lon: row.lon ? Number(row.lon) : null,
                    depth_m: row.depth_m ? Number (row.depth_m) : null,
                    pressure_atm: row.pressure_atm ? Number(row.pressure_atm) : null,
                    biome: row.biome ? row.biome : null,
                    temperature_c: row.temperature_c ? Number(row.temperature_c) : null,
                    light_intensity: row.light_intensity ? Number(row.light_intensity) : null,
                    terrain_roughness: row.terrain_roughness ? Number(row.terrain_roughness) : null,
                    
                    // Okay we don't know if we are using these all yet so these are here as filler.
                    // We may remove or add as time goes on for the layers/POIs.
                    corals: null,
                    currents: null,
                    hazards: [],
                    life: [],
                    poi: [],
                    resourcecs: [],
                });

                // The previous code just pushed all that data into an array for us to utilize easily.
            }).on('end', () => {
                // Creates the 2D array (50x50).
                const finalGrid = Array.from({ length: SIZE }, () => {
                    Array.from({ length: SIZE }, () => null)
                for (const cell of cells) {
                    const { row, col } = cell;
                    if (row >= 0 && row < SIZE && col >= 0 && col < size) {
                        finalGrid[row][col] = cell;
                    }
                }
                resolve(finalGrid);
                });
            })
    })
}

(async () => { grid = await loadCSVGrid(`data/cells.csv`) });

// Fetches all cells in the cells grid.
app.use(`/api/cells`, (req, res) => {
    res.json({
        width: grid[0]?.length || 0,
        height: grid.length,
        cells: grid,
    });
});

// Fetches a specific cell.
app.use(`/api/cells/:row/:col`, (req, res) => {
    const row = req.params.row;
    const col = req.params.col;
    const cell = grid[row]?.[col];

    if(!cell) return res.status(404).json({ message: "Cell Not Found." });
    res.json(cell);
});

// Static Loading.
app.use('/', express.static('client'));

app.use('/', (req, res) => {
    res.sendFile('index.html', { root: 'client' });
});

app.listen(port, () => {
    console.log('Listening on port ' + port);
});