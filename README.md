# WeatherSight

WeatherSight is a full-stack web application for searching, analyzing, and visualizing long-range weather data.

The system supports location-based and parameter-based queries over large spatio-temporal datasets, with interactive charts and maps.  
Developed as a capstone project for a Software Engineering degree.

## 🔗 Live Demo
https://weathersight.vercel.app/

## Key Features
- Location-based weather search using spatial indexing (KD-tree)
- Parameter-based search (temperature, precipitation, wind, etc.)
- Interactive visualizations (charts & maps)
- Saved searches and results workspace
- Tier-based access logic (demo)

## Tech Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL)
- **Data & Algorithms**: KD-tree spatial search, geocoding
- **Visualization**: Recharts, Leaflet

## Getting Started
```bash
npm install
npm run dev
