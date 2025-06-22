# Process Mining Dashboard

## Overview

This is a full-stack process mining application designed to analyze manufacturing workflows and provide real-time insights into process efficiency. The application combines modern web technologies with AI-powered analytics to help users understand bottlenecks, detect anomalies, and compare process cases in industrial settings.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon serverless)
- **API Design**: RESTful endpoints with proper error handling
- **File Processing**: CSV parsing for process event data import

### Development Environment
- **Platform**: Replit with Node.js 20 runtime
- **Database**: PostgreSQL 16 module
- **Development Server**: Hot module replacement via Vite
- **Build Process**: ESBuild for server bundling, Vite for client bundling

## Key Components

### Data Models
The application handles three primary data entities:
- **Process Events**: Individual process steps with timestamps, resources, and metadata
- **Process Activities**: Aggregated activity data with duration and status information
- **Process Cases**: Complete workflow instances from start to finish

### AI Services
- **AI Analyst**: OpenAI GPT-4o integration for natural language process analysis
- **Anomaly Detection**: Statistical analysis using IQR and Z-score methods
- **Semantic Search**: Vector embeddings for failure description similarity matching

### Dashboard Features
- **Real-time Metrics**: Live KPI tracking with automatic refresh
- **Interactive Visualizations**: Charts and timeline views using Recharts
- **Anomaly Alerts**: Automatic detection and notification of process deviations
- **Case Comparison**: Side-by-side analysis of different process instances

## Data Flow

1. **Data Import**: CSV files containing process events are parsed and stored
2. **Processing**: Raw events are transformed into activities and case summaries
3. **Analysis**: AI services analyze patterns and detect anomalies
4. **Visualization**: Dashboard components fetch and display processed data
5. **Interaction**: Users can filter, search, and compare different aspects of the data

The application uses a pull-based data fetching strategy where components request data as needed, with intelligent caching and background updates.

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless for data persistence
- **AI Integration**: OpenAI API for natural language processing and embeddings
- **UI Components**: Radix UI primitives for accessible component foundation
- **Data Visualization**: Recharts for interactive charts and D3.js for custom visualizations

### Development Dependencies
- **TypeScript**: Full type safety across frontend and backend
- **ESLint/Prettier**: Code quality and formatting tools
- **Drizzle Kit**: Database schema management and migrations

## Deployment Strategy

### Development
- **Local Development**: `npm run dev` starts both frontend and backend with hot reload
- **Database**: Automatic connection to Neon PostgreSQL instance
- **Environment**: Replit provides integrated development environment

### Production
- **Build Process**: `npm run build` creates optimized client bundle and server build
- **Deployment**: Replit autoscale deployment with health checks
- **Static Assets**: Client files served from `/dist/public` directory
- **Database Migrations**: Drizzle Kit handles schema changes via `npm run db:push`

### Environment Configuration
- Database connection managed via `DATABASE_URL` environment variable
- OpenAI API key configured for AI services
- Production builds optimize for performance and bundle size

## Changelog

- June 22, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.