# WeatherSight - Advanced Weather Data Analysis Platform

A comprehensive web application for searching, analyzing, and visualizing historical and forecasted weather data. Built as a capstone project for Software Engineering degree at Braude College.

## 🌟 Features

### Core Functionality
- **Location-Based Search**: Search weather data by city name or coordinates with autocomplete suggestions
- **Parameter-Based Search**: Find locations matching specific weather criteria (temperature, precipitation, wind speed, etc.)
- **Advanced Search**: Customize queries with multiple parameters and date ranges
- **Interactive Visualizations**: View temperature trends, precipitation, wind patterns, and solar radiation
- **Saved Searches**: Save and reuse frequent searches for quick access
- **Results Workspace**: Manage and review past search results

### Weather Parameters
- Temperature (average, minimum, maximum)
- Precipitation (rainfall)
- Snowfall
- Solar Radiation (J/m²)
- Wind Speed (magnitude from U/V components)
- Historical and forecast data for 2025

### User Experience
- Responsive design for desktop and mobile
- Dark/light mode support
- Real-time autocomplete for location search
- Interactive charts and maps
- Tiered access system (Basic, Standard, Professional, Enterprise)

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm or yarn package manager
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Final_project/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   
   That's it! The `.env.example` file already contains the working Supabase credentials for the WeatherSight database. All users can use the same database for searching weather data.
   
   > **Note**: These are read-only credentials safe for public use. They allow anyone to query the weather database but don't provide admin access.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

> **💡 Quick Start Tip**: The database is already populated with 12,974 grid points and weather data for 2025. You can start searching immediately—no database setup required!

## 📁 Project Structure

```
frontend/
├── app/                      # Next.js 14 App Router pages
│   ├── (admin)/             # Admin routes
│   ├── (app)/               # Main application routes
│   │   ├── dashboard/       # User dashboard
│   │   ├── search/          # Search pages
│   │   │   ├── page.tsx             # Location search
│   │   │   ├── parameters/page.tsx  # Parameter-based search
│   │   │   └── advanced/page.tsx    # Advanced search
│   │   ├── results/         # Results workspace
│   │   ├── saved-searches/  # Saved searches management
│   │   └── alerts/          # Weather alerts
│   ├── (auth)/              # Authentication pages
│   ├── (marketing)/         # Marketing/landing pages
│   ├── api/                 # API routes
│   │   ├── weather/         # Weather data endpoints
│   │   ├── saved-searches/  # Saved searches CRUD
│   │   └── usage/           # Query usage tracking
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── auth/                # Authentication components
│   ├── layout/              # Layout components (header, footer, nav)
│   ├── shared/              # Shared/reusable components
│   └── ui/                  # UI primitives (shadcn/ui)
├── context/                 # React context providers
│   └── AuthContext.tsx      # Authentication context
├── hooks/                   # Custom React hooks
│   ├── useTier.tsx          # Subscription tier logic
│   └── useThemePersist.ts   # Theme persistence
├── lib/                     # Utility libraries
│   ├── api.ts               # API client functions
│   ├── format.ts            # Formatting utilities
│   ├── geocoding.ts         # Geocoding service
│   ├── supabase.ts          # Supabase client
│   ├── tiers.ts             # Subscription tier definitions
│   ├── weatherGeoService.ts # Weather data service with KD-tree
│   ├── resultsStorageService.ts  # Local storage for results
│   └── savedSearchesService.ts   # Saved searches service
├── migrations/              # Database migrations
├── public/                  # Static assets
├── scripts/                 # Data seeding scripts
├── styles/                  # Global styles
└── types/                   # TypeScript type definitions
```

## 🗄️ Database Schema

### Main Tables
- **weather_forecasts**: Historical and forecast weather data
  - Columns: grid_index, day_of_year, avg_temperature, max_temperature, min_temperature, precipitation_sum, snowfall_amount, solar_radiation, wind_speed_u_max, wind_speed_v_max
  
- **weather_grid**: Geographic grid points
  - Columns: grid_index, latitude, longitude
  
- **users**: User accounts and subscription information
  - Columns: id, email, subscription_tier, query_usage_count, last_usage_reset
  
- **saved_searches**: User's saved searches
  - Columns: id, user_id, name, location, lat, lon, day_of_year, created_at

## 🔧 Key Technologies

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality UI components
- **Recharts**: Data visualization library
- **date-fns**: Date manipulation library
- **Lucide React**: Icon library

### Backend/Services
- **Supabase**: PostgreSQL database, authentication, and storage
- **KD-Tree**: Spatial indexing for fast nearest-neighbor searches
- **Geocoding API**: Location search and autocomplete

### Data Processing
- **Node.js scripts**: For data transformation and seeding
- **CSV parsing**: Weather data import from CSV files

## 🎯 Key Features Explained

### Location Search with KD-Tree
The application uses a KD-tree (k-dimensional tree) data structure for efficient spatial queries. When you search for weather at a specific location:
1. Coordinates are converted to 3D Cartesian space
2. KD-tree finds the nearest grid point in O(log n) time
3. Weather data for that grid point is retrieved from the database

### Parameter-Based Search
Users can search for locations matching specific weather criteria:
- Set minimum/maximum thresholds for any parameter
- Specify date ranges
- System queries all grid points meeting the criteria
- Results are returned with full weather data

### Subscription Tiers
The application implements a tiered access system:
- **Basic**: 5 queries/day, 7-day horizon, 10 saved searches
- **Standard**: 25 queries/day, 14-day horizon, 25 saved searches
- **Professional**: 100 queries/day, 30-day horizon, 100 saved searches, PDF exports
- **Enterprise**: Unlimited queries, 60-day horizon, unlimited searches, alerts

## 🧪 Testing

### Manual Testing Checklist
- [ ] Location search (single day)
- [ ] Location search (date range)
- [ ] Parameter-based search with multiple criteria
- [ ] Save a search
- [ ] Load saved search from sidebar
- [ ] View result from Results Workspace
- [ ] Toggle between light/dark mode
- [ ] Test on mobile viewport
- [ ] Check for console errors

### Running Tests
```bash
npm test          # Run unit tests
npm run test:e2e  # Run end-to-end tests (if configured)
```

## 📝 Environment Variables

| Variable | Description | Required | Safe to Publish? |
|----------|-------------|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (read-only) | Yes | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (NOT in repo) | Only for seeding | ❌ NEVER |

> **🔒 Security Note**: The anon key in `.env.example` is safe to publish because the database has Row Level Security (RLS) policies that make weather data **read-only**. See [SECURITY.md](./SECURITY.md) for details.

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

### Build for Production
```bash
npm run build
npm start
```

## 🤝 Contributing

This is an academic project. For grading purposes only.

## 📄 License

Academic project - Braude College of Engineering, Software Engineering Department

## 👥 Authors

WeatherSight Team - Braude College Final Project 2025

## 📚 Documentation

For more detailed information about the system architecture and design decisions, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [Project Presentation](../Capstone%20Project%20Phase%20A%2025-2-D-24%20(2).pdf) - Project proposal

## 🐛 Known Issues

- Mock authentication system (not production-ready)
- Query limits reset at midnight UTC
- Geocoding rate limits may apply

## 🔮 Future Enhancements

- Real authentication with Supabase Auth
- Weather alerts and notifications
- PDF export functionality
- Mobile app version
- Real-time weather updates
- Historical data comparison
- Machine learning predictions

---

**Note**: This project was developed as a capstone project for academic evaluation and demonstration purposes.
