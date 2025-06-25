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
- **ProcessGPT (Legacy)**: Keyword-based query classification with hardcoded analysis patterns
- **Intelligent Analyst**: Advanced AI system that dynamically selects analysis capabilities based on natural language understanding
- **Anomaly Detection**: Statistical analysis using IQR and Z-score methods
- **Semantic Search**: Vector embeddings for failure description similarity matching

### AI Analysis Approaches

#### Legacy Approach (ProcessGPT)
- Uses keyword matching to classify queries (e.g., "anomaly" → anomaly_analysis)
- Predefined analysis types with hardcoded data gathering
- Limited to anticipated question patterns
- Rigid and not easily extensible

#### Intelligent Approach (IntelligentAnalyst)
- AI-powered capability selection based on natural language understanding
- Dynamic analysis pipeline that combines multiple analysis methods
- Extensible capability system that can handle new question types
- Two-stage AI process: capability selection → intelligent interpretation
- More robust error handling and fallback mechanisms

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

## How the Application Works

### Main Interface
The application has a sidebar navigation with different sections:
- **Dashboard**: Overview with key metrics, filters, and visualizations
- **Process Maps**: Visual process flow diagrams
- **Anomaly Detection**: Alerts and analysis of unusual process behavior
- **AI Assistant**: Chat interface for asking questions about your data
- **Semantic Search**: Search through process descriptions and failures
- **Timeline Analysis**: Time-based process execution patterns
- **Case Comparison**: Compare different manufacturing workflow runs
- **Data Filters**: Advanced filtering options
- **Export Data**: Export analysis results

### Key Features
1. **Real-time Analytics**: Live metrics showing process performance
2. **Anomaly Detection**: Automatic identification of process deviations
3. **AI-Powered Analysis**: Natural language queries about manufacturing data
4. **Interactive Visualizations**: Charts and process maps
5. **Case Comparison**: Side-by-side analysis of different workflow instances

### Data Sources
- Manufacturing process events from XES format CSV files
- Real-time metrics calculation and anomaly scoring
- AI-generated insights using OpenAI integration

## Local AI Integration

### Overview
Added support for running ProcessGPT locally using Gemma 2 model instead of OpenAI, maintaining all function calling capabilities while ensuring complete data privacy and offline operation.

### Implementation
- **AIServiceFactory**: Smart service selector that chooses between OpenAI and local Gemma 2 based on configuration
- **LocalAIService**: Complete reimplementation of AI analysis using local model with function calling simulation
- **Ollama Integration**: Uses Ollama to run Gemma 2:9b locally with proper prompt engineering
- **Fallback Support**: Automatic fallback between local and cloud AI if one fails

### Features
- Function calling simulation through structured prompts and response parsing
- All existing analysis capabilities preserved (failure analysis, temporal patterns, anomaly detection, etc.)
- Real-time switching between local and cloud AI via API endpoints
- Complete data privacy - no external API calls when using local mode
- Offline operation capability

### Setup Instructions
1. Run `bash scripts/setup-local-ai.sh` to install Ollama and download Gemma 2
2. Start Ollama service: `ollama serve`
3. Set environment variable: `USE_LOCAL_AI=true`
4. Restart application - ProcessGPT now runs locally

### Control Endpoints
- `POST /api/ai/switch-to-local` - Switch to local Gemma 2
- `POST /api/ai/switch-to-openai` - Switch to OpenAI GPT-4o
- `GET /api/health` - Shows current AI service status

## Changelog

- June 25, 2025. Added complete local AI integration with Gemma 2 support and function calling preservation
- June 22, 2025. Initial setup
- June 22, 2025. Fixed data import issues and implemented tab-based navigation
- June 22, 2025. Successfully imported manufacturing data with 282 cases and 170 anomalies detected
- June 22, 2025. Fixed Apply Filters button functionality and Timeline Analysis chart visualization
- June 22, 2025. Corrected anomaly detection to use historical analysis with IQR method instead of real-time monitoring
- June 22, 2025. Fixed all dashboard metrics: success rate (10%), anomaly count (170), and data scope configuration (301 cases)
- June 22, 2025. Implemented real bottleneck analysis in Process Maps tab showing actual manufacturing station data with full activity names
- June 22, 2025. Created case-specific process visualizations with proper network flow maps and Sankey diagrams using activity timing logic for connections
- June 22, 2025. Built interactive Sankey diagram with D3.js featuring clickable nodes/links, hover tooltips, detailed activity information panels, and color-coded station categories matching reference design quality
- June 22, 2025. Created case-specific Sankey diagram component with individual case selection, sequential activity flow visualization, and comprehensive activity analysis for single manufacturing cases
- June 22, 2025. Enhanced Sankey diagram to properly show loops, parallel paths, and multiple start/end points with self-loop visualization as curved arcs above nodes
- June 23, 2025. Improved case-specific Sankey diagram to use proper filled link paths, node heights that reflect flow volume, better centering and spacing, and clear external labels for better readability matching reference design
- June 23, 2025. Rebuilt Sankey diagram using Plotly.js for proper flow visualization with colored nodes and interactive features
- June 23, 2025. Fixed critical activity deduplication issue across all components - each activity now counted once instead of triple-counting from 3 event logs per activity
- June 23, 2025. Implemented proper timing-based activity linking in Sankey diagram - activities only connected when timing difference between complete/start times indicates actual workflow relationship (allowing -30 to +60 seconds for realistic transitions)
- June 23, 2025. Fixed dashboard metrics calculations: corrected bottleneck detection thresholds and success rate calculation bug caused by string concatenation in database count operations
- June 23, 2025. Enhanced Timeline Analysis with comprehensive Y-axis labeling showing all activities and severity-based anomaly classification: blue dots for normal activities, yellow diamonds for moderate anomalies (50-200% deviation), red diamonds for severe anomalies (>200% deviation)
- June 23, 2025. Enhanced Anomaly Details tab with expandable table view showing all case activities with anomalous activities highlighted in red, added current_task field to database schema for richer anomaly context, and improved anomaly detection accuracy to only highlight officially detected anomalies
- June 23, 2025. Implemented Case Clustering feature with advanced multi-dimensional pattern analysis including parallel activity detection, loop recognition, and resource utilization patterns for sophisticated manufacturing workflow grouping
- June 23, 2025. Enhanced clustering algorithm to move beyond simple linear sequences to capture true process complexity including concurrent operations, rework loops, and equipment patterns
- June 23, 2025. Rebranded AI Assistant to "ProcessGPT" - intelligent manufacturing analyst with enhanced branding and user interface improvements
- June 23, 2025. Enhanced ProcessGPT with advanced analysis integration: now leverages anomaly detection, semantic search, case clustering, and bottleneck analysis functions for much more powerful and accurate manufacturing insights
- June 23, 2025. Implemented filter-aware ProcessGPT: AI assistant now respects dashboard filters and only analyzes selected data subsets (equipment, time ranges, case IDs) for targeted insights with visual filter status indicator
- June 23, 2025. Fixed critical ProcessGPT data fabrication issue: AI was generating fake failure descriptions instead of analyzing real data. Dataset has 95 actual failures (lifecycle_state = 'failure') but no descriptions in unsatisfied_condition_description column. Created FailureAnalyzer that analyzes real failure patterns by HTTP status codes (401/418 errors) and equipment/activity combinations
- June 23, 2025. Successfully resolved CSV parsing issue preventing failure description import: rewrote CSV parser using proper csv-parser library to handle complex failure descriptions containing commas and JSON structures. All 95 failures now have authentic descriptions imported (42 High Bay Warehouse inventory issues, 53 equipment condition validation failures with detailed JSON condition checks)
- June 23, 2025. Enhanced ProcessGPT interface with dynamic visualization panel: widened chat from 384px to 600px, added contextual visualization panel on right side that automatically generates relevant charts (pie charts for failures, bar charts for performance, impact charts for bottlenecks) based on AI response content using Recharts library
- June 24, 2025. Fixed critical ProcessGPT failure analysis logic: ProcessGPT was incorrectly analyzing which activities fail most often instead of analyzing actual failure causes from unsatisfied_condition_description. Implemented EnhancedFailureAnalyzer that properly categorizes root causes (inventory management issues, network connectivity problems, sensor failures, RFID/NFC issues, equipment status problems) from real failure descriptions instead of just counting activity failures
- June 24, 2025. Enhanced ProcessGPT query classification with activity vs case distinction: implemented smart classification that detects "activity failure cause analysis" vs "case failure analysis" based on keywords like "cause", "activit", "case". Added comprehensive system prompts that clearly distinguish between activity-level (each failed activity counted separately) and case-level (each case counted once) analysis for accurate failure root cause insights
- June 24, 2025. Implemented nuanced ProcessGPT query understanding: ProcessGPT now distinguishes between "which activity has the most failures" (activity failure rate analysis showing /pm/punch_gill: 2.90% failure rate) vs "what causes failures" (root cause analysis showing sensor failures, inventory issues). Added activity failure rate analyzer that calculates failure percentages per activity type for precise manufacturing insights
- June 24, 2025. Fixed critical query classification reversal bug: ProcessGPT was giving opposite answers - "most common failures" showed activity rates instead of causes, "which activity fails most" showed causes instead of rates. Corrected classification logic with precise keyword detection and added debug logging for query classification accuracy
- June 24, 2025. Enhanced ProcessGPT visualizations to show comprehensive, accurately labeled charts: replaced hardcoded/random data with real manufacturing data, added detailed activity names and percentages to all chart labels, implemented separate visualizations for failure rates vs failure distribution, included comprehensive breakdown tables showing exact numbers and percentages for complete transparency
- June 24, 2025. Implemented comprehensive ProcessGPT enhancement supporting 25+ question types across 6 categories: failure analysis & diagnosis, delay & timing issues, anomaly detection, trend & pattern mining, root cause & correlation analysis, maintenance & recommendations, and targeted case queries. Added TimingAnalyzer, TrendAnalyzer, and CaseAnalyzer services with advanced SQL analytics for processing times, transition analysis, temporal patterns, upstream failure detection, maintenance recommendations, and case-specific investigations. ProcessGPT now handles sophisticated manufacturing queries with high accuracy while maintaining existing visualization and response formats
- June 24, 2025. Fixed ProcessGPT visualization synchronization: implemented intelligent chart generation that analyzes the actual question asked and ProcessGPT's response content to generate appropriate visualizations. Time-based questions now generate time-series charts, activity questions generate activity bar charts, maintenance questions generate priority charts. Added analysis methodology explanations showing variables considered and calculations made. Charts now accurately reflect ProcessGPT's analysis instead of showing placeholder data
- June 24, 2025. Fixed critical ProcessGPT visualization mismatch issues: anomaly temporal questions now properly generate anomaly time charts instead of failure charts, enhanced visualization detection to recognize "Visual Analysis" sections and generate appropriate charts for all statistical responses, implemented proper question-type routing with separate visualization logic for anomaly analysis vs failure analysis vs general statistical questions, added comprehensive chart type support including anomaly_time_chart, general_time_chart, and general_stats_bar for complete coverage of ProcessGPT responses
- June 24, 2025. Implemented automatic visual-query synchronization architecture following user's previous project pattern: backend now returns structured data with analysis_type fields, frontend automatically detects analysis types and creates matching visualizations with 500ms delay, replaced manual visualization logic with function-calling pattern that maps analysis types to specific chart creation functions (createFailureAnalysisCharts, createActivityFailureCharts, createTemporalAnalysisCharts, createAnomalyAnalysisCharts, createBottleneckAnalysisCharts), ensuring every ProcessGPT response with statistical data gets appropriate visualizations automatically without manual intervention
- June 24, 2025. Successfully fixed automatic visualization system: resolved analysis_type mapping mismatch between backend and frontend, visualizations now appear automatically in Live Insights panel when ProcessGPT provides statistical analysis, enhanced Live Insights panel with larger size (384px width), increased chart height (160px), and added expandable view with maximize button for detailed chart viewing in modal dialog
- June 24, 2025. Fixed temporal analysis visualization issues: added proper support for temporal_pattern_analysis analysis type mapping, enhanced temporal failure analysis to properly filter by lifecycle_state='failure' instead of all events, improved date/time handling to include both daily and hourly failure distributions across the multi-day dataset period, added proper React modal component for expandable chart viewing replacing broken HTML-based modal
- June 25, 2025. Verified all 25 ProcessGPT question types use custom analysis functions instead of OpenAI for data processing: temporal analysis executes direct SQL queries returning real failure data (191 failures, hour 10 peak with 46 failures), activity failure analysis calculates actual failure rates from database, failure cause analysis processes real failure descriptions, anomaly detection uses statistical algorithms on real data, bottleneck analysis calculates processing times from actual manufacturing events. ProcessGPT maintains AI intelligence for query understanding and response formatting while ensuring all numerical analysis comes from real database functions rather than AI fabrication
- June 25, 2025. Created complete local AI integration system with Google Colab + LocalTunnel setup: built AIServiceControl component for switching between OpenAI and local Gemma 2, added API endpoints for service configuration and status monitoring, implemented connection testing and health checks, created comprehensive setup guides for token-free LocalTunnel deployment. Users can now run ProcessGPT with private Gemma 2 model while maintaining all 25 analysis capabilities and complete data privacy
- June 25, 2025. Implemented Google Gemini integration as preferred alternative to complex tunnel setup: created GeminiService with full ProcessGPT capabilities, added Gemini API endpoints and UI controls, integrated with AIServiceFactory for seamless switching between OpenAI, Gemini, and local AI. Gemini provides production-ready AI without tunneling complexity while maintaining all database analysis functions and manufacturing insights
- June 25, 2025. Built complete True Local AI system using Ollama/LM Studio: implemented TrueLocalAIService for desktop local inference, added support for Llama 3.1, Gemma 2, and Phi-3 models running entirely offline, created local AI switching endpoints and connection testing, documented step-by-step setup guide for complete local operation with no external API dependencies. ProcessGPT now supports four AI options: OpenAI (cloud), Gemini (cloud), Colab tunneling (complex), and True Local (desktop offline)
- June 25, 2025. Documented Google AI Edge mobile app architecture: outlined conversion strategy from web app to React Native mobile app with Gemini Nano on-device inference, SQLite local database, and complete offline operation for industrial manufacturing environments. Architecture enables deployment to shop floor tablets and field technician devices while maintaining all ProcessGPT analysis capabilities
- June 25, 2025. Implemented Android Emulator AI Edge integration: created AndroidEmulatorAIService using Gemma-3n-E2B-it-int4 model from AI Edge Gallery, built bridge service for emulator communication, added Android Emulator AI control panel to ProcessGPT interface, configured automatic connection to http://10.0.2.2:8080 for seamless AI Edge Gallery integration. Model successfully downloaded (3.1GB) but encountered initialization errors due to emulator memory constraints. Recommended switching to Ollama desktop approach for more reliable local AI operation

## User Preferences

Preferred communication style: Simple, everyday language.