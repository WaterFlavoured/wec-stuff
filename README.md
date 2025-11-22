# Deep Sea Exploration Game

An interactive underwater exploration experience with multiple chapters.

## Features

### Chapter 1: The Descent
A scrolling narrative experience that tells the story of descending into the deep ocean.

### Chapter 2: Venture the Abyss
An exploration game where you navigate a deep-sea grid, collecting minerals while avoiding hazards. Features:
- Resource collection (minerals)
- Hazard avoidance
- Points of interest discovery
- Hull integrity management

### Chapter 3: Explore Coral Reefs
A coral reef exploration and collection game based on real coral reef data. Features:
- **Coral Collection**: Collect coral samples from various grid locations
- **Data-Driven**: Uses `corals.csv` data with:
  - Coral cover percentage
  - Health index
  - Bleaching risk
  - Biodiversity index
- **Hazards**: Navigate around dangerous areas (thermal vents, acidic zones, trench walls)
- **Points of Interest**: Discover shipwrecks and geological formations
- **Goal**: Collect 30 coral samples while maintaining hull integrity
- **Educational**: Learn about coral health and reef biodiversity

## Installation

### Server Setup
```bash
cd server
npm install
npm start
```

### Client Setup
```bash
cd client
npm install
npm run dev
```

## Game Controls

- **Mouse Movement**: Navigate your submarine
- **Hover over cells**: Collect coral samples, discover POIs, and encounter hazards
- **Drag**: Pan the camera view

## Data Files

The game uses CSV data files located in `server/data/`:
- `corals.csv` - Coral reef data (Chapter 3)
- `hazards.csv` - Dangerous zones
- `poi.csv` - Points of interest
- `cells.csv` - Base grid data
- `life.csv` - Marine life
- `resources.csv` - Mineral resources

## Technologies Used

- **Frontend**: React, Vite, Framer Motion
- **Backend**: Node.js, Express
- **Data**: CSV parsing with csv-parser
