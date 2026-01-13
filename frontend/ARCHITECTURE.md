# WeatherSight - System Architecture

## Overview

WeatherSight is a full-stack web application designed to provide advanced weather data analysis and visualization capabilities. The system enables users to search for weather data by location or specific parameters, visualize trends, and save searches for future reference.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 14)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Search     │  │  Parameters  │  │   Results    │         │
│  │   Pages      │  │    Search    │  │  Workspace   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                   ┌────────▼─────────┐                          │
│                   │   API Routes     │                          │
│                   │  /api/weather/*  │                          │
│                   └────────┬─────────┘                          │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │    Supabase      │
                    │   PostgreSQL     │
                    │                  │
                    │ • weather_       │
                    │   forecasts      │
                    │ • weather_grid   │
                    │ • users          │
                    │ • saved_searches │
                    └──────────────────┘
```

## Technology Stack

### Frontend Layer
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Hooks (useState, useEffect, useContext)
- **Data Visualization**: Recharts
- **Maps**: Leaflet (via react-leaflet)
- **HTTP Client**: Native fetch API

### Backend/Database Layer
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Mock system (localStorage-based for demo)
- **Real-time**: Supabase subscriptions (not currently used)
- **Storage**: Browser localStorage for recent searches

### Data Processing
- **Spatial Indexing**: KD-tree for nearest-neighbor queries
- **Geocoding**: External geocoding service for location search

## Core Components

### 1. Data Model

#### Weather Forecasts Table
```sql
CREATE TABLE weather_forecasts (
  id BIGSERIAL PRIMARY KEY,
  grid_index INTEGER NOT NULL,
  day_of_year INTEGER NOT NULL CHECK (day_of_year BETWEEN 1 AND 365),
  avg_temperature FLOAT,
  max_temperature FLOAT,
  min_temperature FLOAT,
  precipitation_sum FLOAT,
  snowfall_amount FLOAT,
  solar_radiation FLOAT,
  wind_speed_u_max FLOAT,
  wind_speed_v_max FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_grid_day ON weather_forecasts(grid_index, day_of_year);
CREATE INDEX idx_day ON weather_forecasts(day_of_year);
CREATE INDEX idx_temp ON weather_forecasts(avg_temperature);
```

#### Weather Grid Table
```sql
CREATE TABLE weather_grid (
  grid_index INTEGER PRIMARY KEY,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lat_lon ON weather_grid(latitude, longitude);
```

### 2. Search System

#### Location-Based Search
1. User enters location name (e.g., "Tel Aviv")
2. Geocoding service converts to coordinates (lat, lon)
3. KD-tree finds nearest grid point
4. Query weather_forecasts for that grid_index and date range
5. Return results with visualization data

**Performance Optimization**:
- KD-tree provides O(log n) spatial queries
- In-memory tree built on server startup
- Cached grid data reduces database queries

#### Parameter-Based Search
1. User specifies weather criteria (temp range, precipitation, etc.)
2. SQL query with multiple WHERE clauses
3. Filter results based on wind speed magnitude (calculated from U/V components)
4. Group by grid_index to get unique locations
5. Fetch coordinates from weather_grid
6. Return matching locations

**Query Example**:
```sql
SELECT 
  wf.grid_index,
  wf.day_of_year,
  wf.avg_temperature,
  wf.precipitation_sum,
  wf.wind_speed_u_max,
  wf.wind_speed_v_max
FROM weather_forecasts wf
WHERE 
  wf.day_of_year BETWEEN 100 AND 110
  AND wf.avg_temperature BETWEEN 15 AND 25
  AND wf.precipitation_sum < 10;
```

### 3. API Architecture

#### REST Endpoints

**Weather Query**
- `GET /api/weather/query?lat={lat}&lon={lon}&day={day}`
- Returns weather data for specific location and date

**Weather Forecast (Multi-day)**
- `GET /api/weather/forecast?lat={lat}&lon={lon}&startDate={start}&endDate={end}`
- Returns weather data for date range

**Parameter Search**
- `GET /api/weather/parameters?startDay={start}&endDay={end}&minTemp={min}&maxTemp={max}&...`
- Returns locations matching criteria

**Saved Searches**
- `GET /api/saved-searches` - List user's saved searches
- `POST /api/saved-searches` - Create new saved search
- `PATCH /api/saved-searches/{id}` - Mark search as used
- `DELETE /api/saved-searches/{id}` - Delete saved search

**Usage Tracking**
- `GET /api/usage` - Get user's current usage stats
- `POST /api/usage` - Increment usage counter

### 4. Authentication & Authorization

**Current Implementation (Demo)**:
- Mock authentication using localStorage
- User profile stored client-side
- Subscription tier determines feature access

**Tier-Based Access Control**:
```typescript
const tiers = {
  basic: {
    queriesPerDay: 5,
    horizonDays: 7,
    savedSearches: 10
  },
  professional: {
    queriesPerDay: 100,
    horizonDays: 30,
    savedSearches: 100
  },
  // ... other tiers
};
```

**Production Recommendations**:
- Implement Supabase Auth for real authentication
- Move tier checks to server-side API routes
- Use JWT tokens for secure API access
- Implement rate limiting middleware

### 5. State Management

#### Client-Side State
- **React Context**: Authentication state, theme preferences
- **Component State**: Form inputs, search results, loading states
- **Local Storage**: Recent searches, theme preference
- **URL State**: Search parameters for shareable links

#### Server-Side State
- **Database**: Persistent user data, saved searches
- **In-Memory**: KD-tree spatial index, grid data cache

### 6. Data Flow Examples

#### Example 1: Location Search Flow
```
User Input
  ↓
┌─────────────────────┐
│ Geocoding Service   │ → Convert "Tel Aviv" to (32.0853, 34.7818)
└─────────────────────┘
  ↓
┌─────────────────────┐
│ KD-Tree Search      │ → Find nearest grid point #12345
└─────────────────────┘
  ↓
┌─────────────────────┐
│ Database Query      │ → SELECT * FROM weather_forecasts 
└─────────────────────┘   WHERE grid_index = 12345 AND day_of_year = 45
  ↓
┌─────────────────────┐
│ Format & Display    │ → Render charts, cards, maps
└─────────────────────┘
```

#### Example 2: Save Search Flow
```
User Action
  ↓
┌─────────────────────┐
│ Validate Tier Limit │ → Check if user can save more searches
└─────────────────────┘
  ↓
┌─────────────────────┐
│ API POST Request    │ → POST /api/saved-searches
└─────────────────────┘
  ↓
┌─────────────────────┐
│ Database Insert     │ → INSERT INTO saved_searches
└─────────────────────┘
  ↓
┌─────────────────────┐
│ Update UI           │ → Add to saved searches list
└─────────────────────┘
```

## Performance Considerations

### Database Optimization
1. **Indexes**: Strategic indexes on frequently queried columns
2. **Batch Queries**: Fetch grid data in batches of 100 to avoid URL length limits
3. **Connection Pooling**: Supabase manages connection pools automatically

### Frontend Optimization
1. **Code Splitting**: Next.js automatically splits code by route
2. **Dynamic Imports**: Maps loaded dynamically to avoid SSR issues
3. **Memoization**: useMemo and useCallback to prevent unnecessary re-renders
4. **Debouncing**: Location autocomplete debounced to reduce API calls

### Spatial Query Optimization
- **KD-Tree**: O(log n) search complexity vs O(n) brute force
- **3D Cartesian Conversion**: Accurate spherical distance calculations
- **In-Memory Index**: Tree built once on server startup

**Performance Comparison**:
- Brute force: ~10-50ms for 10,000 grid points
- KD-tree: ~1-2ms for 10,000 grid points
- **Improvement**: 5-50x faster

## Security Considerations

### Current Implementation
⚠️ **Warning**: Current authentication is MOCK and NOT secure

### Production Recommendations
1. **Authentication**: Implement Supabase Auth with JWTs
2. **API Security**: 
   - Rate limiting per user/IP
   - Input validation and sanitization
   - SQL injection prevention (Supabase handles this)
3. **Data Access**: Row Level Security (RLS) policies in Supabase
4. **Environment Variables**: Store secrets in .env.local, never commit

## Scalability Considerations

### Current Scale
- Supports ~10,000-50,000 grid points
- Single database instance
- Client-side rendering

### Scaling Strategies
1. **Database**:
   - Partition weather_forecasts by date ranges
   - Read replicas for query distribution
   - Caching layer (Redis) for frequently accessed data

2. **Application**:
   - Serverless functions (Vercel/Netlify)
   - CDN for static assets
   - Service Worker for offline support

3. **Spatial Indexing**:
   - PostGIS extensions for native spatial queries
   - Geohashing for hierarchical spatial indexing
   - Distributed KD-tree across multiple servers

## Error Handling Strategy

### Frontend
- Try-catch blocks around API calls
- User-friendly error messages via toast notifications
- Fallback UI for failed data loads
- Loading states to prevent duplicate requests

### API Routes
- Structured error responses with HTTP status codes
- Detailed errors in development, generic in production
- Specific error codes (PGRST116 for no data found)
- Network failure detection and user feedback

## Testing Strategy

### Unit Tests (Recommended)
- Utility functions (formatters, validators)
- React hooks (useTier, useThemePersist)
- API route handlers

### Integration Tests
- Search flow end-to-end
- Save/load search functionality
- Tier limitation enforcement

### Manual Testing
- Cross-browser compatibility
- Mobile responsiveness
- Accessibility (keyboard navigation, screen readers)

## Deployment Architecture

### Development
```
localhost:3000 → Next.js Dev Server → Supabase (cloud)
```

### Production (Recommended: Vercel)
```
User Request
  ↓
Vercel Edge Network (CDN)
  ↓
Next.js Server (Serverless Functions)
  ↓
Supabase (PostgreSQL + API)
```

## Future Architecture Enhancements

1. **Microservices**: 
   - Separate geocoding service
   - Dedicated weather data ingestion service
   - Real-time alert notification service

2. **Caching Layer**:
   - Redis for frequently accessed queries
   - CDN for static weather maps
   - Browser cache for recent searches

3. **Real-Time Features**:
   - WebSocket connections for live weather updates
   - Push notifications for weather alerts
   - Collaborative search sessions

4. **Machine Learning**:
   - Weather pattern prediction
   - Anomaly detection
   - Personalized search recommendations

5. **Data Pipeline**:
   - Automated data ingestion from weather APIs
   - Data validation and quality checks
   - Historical data archival

## Monitoring & Observability

### Recommended Tools
- **Performance**: Vercel Analytics, Web Vitals
- **Errors**: Sentry for error tracking
- **Logs**: Supabase logs, Vercel function logs
- **Metrics**: Custom events for search patterns, user behavior

### Key Metrics to Track
- Query response times
- Search result accuracy
- User engagement (searches per session)
- Error rates by endpoint
- Database query performance

---

## Glossary

- **Grid Index**: Unique identifier for a geographic grid point
- **Day of Year**: Integer 1-365 representing the day within the year
- **KD-Tree**: K-dimensional tree, a space-partitioning data structure
- **Haversine Distance**: Formula to calculate distance between two points on a sphere
- **Wind Speed Magnitude**: sqrt(u² + v²) where u and v are wind components
- **Subscription Tier**: Access level determining query limits and features

---

**Last Updated**: January 2026  
**Document Version**: 1.0  
**Maintained by**: WeatherSight Team

