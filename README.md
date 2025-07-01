# Workflow Analyzer - Manufacturing Process Mining & Analytics Platform

A comprehensive workflow analytics and process mining web application designed for manufacturing environments. Built with React, TypeScript, Express, and advanced AI capabilities including ProcessGPT for intelligent analysis.

## 🏭 Dataset Overview

### IoT-Enriched Manufacturing Event Log

This application analyzes data from an **IoT-enriched event log** generated in a [physical smart factory model](https://iot.uni-trier.de) at the University of Trier. The dataset represents real manufacturing processes with comprehensive IoT sensor integration.

#### Dataset Background & Academic Context

The dataset was created using the DataStream/SensorStream XES extension and represents actual manufacturing processes executed in a smart factory environment. This is a research-grade dataset used in academic process mining studies.

**Citation**:

- _L. Malburg, J. Grüger, R. Bergmann, Dataset: An IoT-Enriched Event Log for Process Mining in Smart Factories (2022)._ https://doi.org/10.6084/m9.figshare.20130794
- Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.en)

#### Data Structure & Complexity

**Event-Based Logging Architecture:**

- Each manufacturing activity generates multiple lifecycle events: `scheduled` → `start` → `complete`
- Events capture both temporal and state information with IoT sensor data integration
- Complex failure descriptions include nested JSON with equipment URLs, sensor states, and condition descriptions

**Key Manufacturing Stations:**

- **HBW (High Bay Warehouse)**: `/hbw/unload`, `/hbw/store` - Automated storage and retrieval
- **VGR (Vacuum Gripper Robot)**: `/vgr/pick_up_and_transport` - Material handling and transport
- **OV (Oven)**: `/ov/burn` - High-temperature processing operations
- **Other stations**: Various specialized manufacturing operations

**Critical Data Columns:**

| Column                              | Description                         | Example                            |
| ----------------------------------- | ----------------------------------- | ---------------------------------- |
| `case_id`                           | Unique workpiece journey identifier | `WF_101_0`, `WF_122_9`             |
| `activity`                          | Manufacturing station/operation     | `/hbw/unload`, `/ov/burn`          |
| `lifecycle_transition`              | Event phase                         | `scheduled`, `start`, `complete`   |
| `lifecycle_state`                   | Execution status                    | `inProgress`, `success`, `failure` |
| `timestamp`                         | Event occurrence time               | `2022-02-27T09:15:25.744Z`         |
| `processing_time_s`                 | Actual execution duration           | `32.5` (seconds)                   |
| `planned_operation_time`            | Expected duration                   | `0 days 00:00:32`                  |
| `unsatisfied_condition_description` | Detailed failure information        | JSON with sensor data, URLs        |
| `current_task`                      | Contextual task information         | Equipment-specific details         |
| `org_resource`                      | Equipment identifier                | `vgr_2`, `hbw_1`, `ov_1`           |

**Data Complexity Challenges:**

- **Multi-level Temporal Data**: Reconstructing complete activities from lifecycle events
- **Failure Analysis**: Parsing complex JSON failure descriptions with IoT sensor data
- **Process Flow Reconstruction**: Linking sequential activities across manufacturing stations
- **Anomaly Detection**: Statistical analysis of processing time deviations from planned operations
- **Cross-Case Pattern Analysis**: Identifying systemic issues across multiple workpiece journeys

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern web browser with JavaScript enabled

### Installation & Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd xceleratepro-ops-workflow-analysis-with-agent
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:

   ```bash
   # AI Configuration
   OPENAI_API_KEY=your_openai_api_key_here

   # Database Configuration (SQLite used by default)
   DATABASE_URL=./local-database.sqlite

   # Server Configuration
   PORT=5000
   ```

4. **Import Dataset**

   - Place your manufacturing dataset CSV in the `attached_assets/` folder
   - The application will automatically detect and import the data on first run

5. **Start the Application**

   ```bash
   npm run dev
   ```

6. **Access the Dashboard**
   Open your browser to `http://localhost:3000`

---

## 📊 Features & Usage Guide

### 1. 🏠 Main Dashboard

**Purpose**: Central hub for manufacturing analytics with real-time metrics and visualizations.

**How to Use:**

- View key performance indicators: average processing time, total anomalies, case counts
- Monitor real-time anomaly alerts and processing status
- Access quick navigation to all analysis tools

**Implementation Details:**

- **Components**: `KeyMetrics`, `TopBar`, `Sidebar`
- **Data Sources**: Real-time aggregation from SQLite database using Drizzle ORM
- **Performance**: Cached metrics with 30-second refresh intervals
- **Responsive Design**: Tailwind CSS with mobile-first approach

---

### 2. 📈 Process Visualization

#### Sankey Diagrams

**Purpose**: Visualize process flows and identify bottlenecks through flow-based representations.

**How to Use:**

- Navigate to the Sankey Diagram tab
- Select specific cases or view aggregated flows
- Hover over flows to see detailed metrics
- Click flows to drill down into specific transitions

**Implementation Details:**

- **Library**: Plotly.js with React integration
- **Data Processing**: Aggregates activity transitions with timing and volume metrics
- **Algorithm**: Constructs flow networks from sequential activity data
- **Interactivity**: Custom event handlers for drill-down analysis
- **Performance**: Lazy loading for large datasets (>1000 cases)

#### Process Maps

**Purpose**: Node-based visualization of manufacturing workflows with timing and failure analysis.

**How to Use:**

- Access through Process Map tab
- Filter by equipment, time range, or case status
- Color coding indicates processing efficiency (green=optimal, red=problematic)
- Node sizes represent activity frequency

**Implementation Details:**

- **Rendering**: D3.js force-directed graph layout
- **Data Structure**: Nodes (activities) and edges (transitions) with weighted metrics
- **Anomaly Detection**: Statistical outlier identification using IQR method
- **Real-time Updates**: WebSocket integration for live process monitoring

#### Timeline Analysis

**Purpose**: Temporal analysis of manufacturing processes with failure pattern identification.

**How to Use:**

- Select Timeline Analysis tab
- Choose hourly, daily, or weekly views
- Identify peak failure periods and processing delays
- Export timeline data for external analysis

**Implementation Details:**

- **Charting**: Recharts library with custom temporal aggregation
- **Time Series Processing**: Moment.js for timezone handling and date manipulations
- **Pattern Detection**: Rolling window analysis for trend identification
- **Data Aggregation**: Efficient SQL queries with temporal grouping

---

### 3. 🔍 Advanced Analytics

#### Anomaly Detection

**Purpose**: Automatic identification of processing anomalies and unusual patterns.

**How to Use:**

- Access Anomaly Detection tab
- View automatically detected anomalies with severity scoring
- Filter by equipment type, time period, or anomaly category
- Export anomaly reports for root cause analysis

**Implementation Details:**

- **Algorithm**: Isolation Forest and statistical IQR-based detection
- **Features**: Processing time, equipment usage patterns, failure frequencies
- **Threshold Management**: Dynamic thresholds based on historical data
- **Real-time Processing**: Streaming anomaly detection for new events
- **Scoring**: Confidence intervals and severity classifications

```typescript
// Anomaly Detection Algorithm
export class AnomalyDetector {
  static detectProcessingTimeAnomalies(activities: ProcessActivity[]) {
    const processingTimes = activities.map((a) => a.actualDurationS);
    const q1 = this.percentile(processingTimes, 25);
    const q3 = this.percentile(processingTimes, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return activities.filter(
      (a) => a.actualDurationS < lowerBound || a.actualDurationS > upperBound
    );
  }
}
```

#### Bottleneck Analysis

**Purpose**: Identify process constraints and optimization opportunities.

**How to Use:**

- Navigate to Bottleneck Analysis
- View equipment utilization rates and average processing times
- Identify queuing delays and resource constraints
- Generate optimization recommendations

**Implementation Details:**

- **Metrics Calculation**: Queuing theory applications for wait time analysis
- **Resource Utilization**: Equipment efficiency and capacity analysis
- **Critical Path**: Longest path analysis through manufacturing network
- **Optimization Suggestions**: Rule-based recommendations engine

#### Case Clustering

**Purpose**: Group similar manufacturing cases for pattern analysis and process optimization.

**How to Use:**

- Access Case Clustering tab
- Select clustering parameters (activity patterns, timing, failure types)
- View cluster visualizations and characteristics
- Export cluster analysis for process improvement

**Implementation Details:**

- **Algorithm**: K-means clustering with custom distance metrics
- **Feature Engineering**: Activity sequence encoding, timing vectors, failure fingerprints
- **Dimensionality Reduction**: PCA for visualization of high-dimensional clusters
- **Validation**: Silhouette analysis for optimal cluster count determination

---

### 4. 🔍 Case Comparison

**Purpose**: Detailed side-by-side analysis of specific manufacturing cases.

**How to Use:**

1. Select two cases from the dropdown menus
2. Click "Generate Detailed Comparison Report"
3. Analyze metrics comparison (activities, duration, failures, anomalies)
4. Review activity sequences and identify differences
5. Examine Sankey diagrams for flow comparison
6. Study process maps for workflow variations

**Implementation Details:**

- **Data Fetching**: Real-time API calls to `/api/process/compare`
- **Metrics Calculation**:

  ```typescript
  // Unique Activities: Set-based counting
  const uniqueActivities = new Set(activities.map((a) => a.activity)).size;

  // Common vs Unique Activities Analysis
  const caseAActivities = new Set(caseA.activities.map((a) => a.activity));
  const caseBActivities = new Set(caseB.activities.map((a) => a.activity));
  const commonActivities = [...caseAActivities].filter((a) =>
    caseBActivities.has(a)
  );
  ```

- **Visualization Components**: Integrated Sankey diagrams and process maps
- **Performance**: Memoized calculations and lazy loading for large cases

---

### 5. 🔍 Semantic Search

**Purpose**: Natural language search through failure descriptions and process context.

**How to Use:**

1. Enter search terms related to failures, equipment, or processes
2. Search through "unsatisfaction condition description" and "current task" columns
3. Click "View Details" to see comprehensive activity information
4. Filter results by field type or equipment

**Implementation Details:**

- **Search Backend**: SQL LIKE queries with full-text search capabilities
- **API Endpoint**: `/api/search/text` with real-time response
- **Data Sources**:
  - `processEvents.unsatisfiedConditionDescription`
  - `processEvents.currentTask`
  - `processActivities.failureDescription`
- **Result Formatting**: Detailed modal views with comprehensive activity metadata
- **Performance**: Indexed database queries with query optimization

```typescript
// Search Implementation
app.post("/api/search/text", async (req, res) => {
  const { query, limit = 20 } = req.body;
  const searchTerm = `%${query.trim()}%`;

  const eventResults = await db
    .select({
      // ... comprehensive field selection
    })
    .from(processEvents)
    .where(
      or(
        ilike(processEvents.unsatisfiedConditionDescription, searchTerm),
        ilike(processEvents.currentTask, searchTerm)
      )
    );
});
```

---

### 6. 🤖 ProcessGPT - AI Assistant

**Purpose**: Conversational AI for natural language process analysis and insights.

**How to Use:**

1. Type questions in plain English about your manufacturing processes
2. Examples:
   - "What are the most common causes of failure?"
   - "Compare case WF_101_0 and WF_102_0"
   - "Which equipment has the longest processing times?"
   - "Show me failure patterns in the last 100 cases"
3. Receive detailed analysis with charts, metrics, and recommendations
4. Follow up with clarifying questions for deeper insights

**Implementation Details:**

#### AI Architecture

- **Base Model**: GPT-4 with manufacturing domain fine-tuning
- **Local AI Fallback**: Gemma 2B model for offline operation
- **RAG Enhancement**: Retrieval-Augmented Generation with knowledge base

#### RAG (Retrieval-Augmented Generation) System

```typescript
class RAGService {
  // Knowledge base with 26 Q&A pairs across 7 categories:
  // - Failure Analysis & Diagnosis
  // - Delay & Timing Issues
  // - Anomaly Detection
  // - Trend & Pattern Mining
  // - Root Cause & Correlation
  // - Maintenance & Recommendations
  // - Targeted Case Queries

  static async enhanceLocalAnalysis(query: string, localResponse: string) {
    const similarExamples = await this.findSimilarExamples(query);
    return this.applyRAGEnhancement(localResponse, similarExamples);
  }
}
```

#### Function Calling Architecture

- **Structured Analysis**: Automatic data extraction and metric calculation
- **Query Classification**: Intent recognition for optimal analysis type
- **Data Integration**: Real-time database queries with formatted responses
- **Visualization Generation**: Automatic chart and graph creation

#### Advanced Features

- **Multi-turn Conversations**: Context retention across queries
- **Failure Pattern Recognition**: Deep analysis of failure descriptions
- **Temporal Analysis**: Time-based pattern identification
- **Equipment-Specific Insights**: Resource-focused analysis and recommendations

---

### 7. 🔧 Data Management

#### Filtering & Scope Configuration

**Purpose**: Control data scope for focused analysis and performance optimization.

**How to Use:**

- **Time-based filtering**: Select date ranges for historical analysis
- **Count-based limits**: Restrict dataset size for faster processing
- **Equipment filtering**: Focus on specific manufacturing resources
- **Status filtering**: Analyze only successful, failed, or anomalous cases

**Implementation Details:**

- **Backend Processing**: Dynamic SQL query generation with WHERE clauses
- **Caching Strategy**: Redis-based result caching for frequently accessed filters
- **Query Optimization**: Database indexing on filter columns for performance
- **Real-time Updates**: Reactive filtering with immediate UI updates

#### Data Import & Export

**Purpose**: Flexible data management for various manufacturing datasets.

**How to Use:**

- Import: Upload CSV files through the web interface
- Export: Download filtered results, analysis reports, and visualizations
- Batch Processing: Handle large datasets with progress indicators

**Implementation Details:**

- **File Processing**: Stream-based CSV parsing for memory efficiency
- **Data Validation**: Schema validation and error reporting
- **Progress Tracking**: Real-time import status with WebSocket updates
- **Export Formats**: CSV, JSON, and PDF report generation

---

## 🏗️ Technical Architecture

### Frontend Architecture

#### Component Structure

```
client/src/
├── components/
│   ├── ui/                     # Reusable UI components (shadcn/ui)
│   └── dashboard/              # Feature-specific components
│       ├── ai-assistant.tsx    # ProcessGPT interface
│       ├── process-map.tsx     # D3.js process visualization
│       ├── sankey-diagram.tsx  # Plotly.js flow diagrams
│       ├── semantic-search.tsx # Search interface
│       ├── case-comparison.tsx # Comparative analysis
│       └── ...
├── hooks/
│   ├── use-dashboard-data.ts   # Data fetching and state management
│   └── use-toast.ts           # Notification system
├── lib/
│   ├── api.ts                 # API client configuration
│   ├── queryClient.ts         # React Query setup
│   └── utils.ts               # Utility functions
└── pages/
    └── dashboard.tsx          # Main application layout
```

#### State Management

- **React Query (TanStack Query)**: Server state management with caching
- **React useState/useEffect**: Local component state
- **Custom Hooks**: Reusable state logic for data fetching and UI interactions

#### Performance Optimizations

- **Lazy Loading**: Component-based code splitting
- **Memoization**: React.memo and useMemo for expensive calculations
- **Virtual Scrolling**: For large datasets in tables and lists
- **Progressive Loading**: Incremental data loading with pagination

### Backend Architecture

#### Server Structure

```
server/
├── services/
│   ├── ai-analyst.ts          # Core AI analysis engine
│   ├── ai-service-factory.ts  # AI service coordination
│   ├── local-ai-service.ts    # Local AI model integration
│   ├── rag-service.ts         # RAG knowledge management
│   ├── anomaly-detector.ts    # Statistical anomaly detection
│   ├── failure-analyzer.ts    # Failure pattern analysis
│   ├── semantic-search.ts     # Search functionality
│   ├── timing-analyzer.ts     # Temporal analysis
│   ├── trend-analyzer.ts      # Pattern identification
│   └── xes-parser.ts          # XES file processing
├── routes.ts                  # API route definitions
├── index.ts                   # Express server setup
├── db.ts                      # Database configuration
└── storage.ts                 # File storage management
```

#### Database Schema

```typescript
// Core tables using Drizzle ORM
export const processEvents = sqliteTable("process_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: text("case_id").notNull(),
  activity: text("activity").notNull(),
  timestamp: text("timestamp").notNull(),
  lifecycleTransition: text("lifecycle_transition"),
  lifecycleState: text("lifecycle_state"),
  orgResource: text("org_resource"),
  unsatisfiedConditionDescription: text("unsatisfied_condition_description"),
  currentTask: text("current_task"),
  processingTimeS: real("processing_time_s"),
  isAnomaly: integer("is_anomaly").default(0),
  // ... additional fields
});

export const processActivities = sqliteTable("process_activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: text("case_id").notNull(),
  activity: text("activity").notNull(),
  scheduledTime: text("scheduled_time"),
  startTime: text("start_time"),
  completeTime: text("complete_time"),
  actualDurationS: real("actual_duration_s"),
  plannedDurationS: real("planned_duration_s"),
  orgResource: text("org_resource"),
  failureDescription: text("failure_description"),
  isAnomaly: integer("is_anomaly").default(0),
  // ... additional fields
});
```

#### API Architecture

- **RESTful Design**: Consistent endpoint patterns and HTTP methods
- **Request/Response Schemas**: Zod validation for type safety
- **Error Handling**: Comprehensive error responses with proper HTTP status codes
- **Rate Limiting**: API call limiting for AI services
- **Caching**: Response caching for expensive analytical queries

### AI Integration

#### Local AI Setup

- **Model**: Gemma 2B-3B parameter model for offline operation
- **Performance**: Optimized for manufacturing domain queries
- **Fallback Strategy**: Graceful degradation when OpenAI API unavailable
- **Resource Management**: Efficient memory usage and model loading

#### OpenAI Integration

- **GPT-4 Integration**: Advanced reasoning for complex manufacturing queries
- **Function Calling**: Structured data analysis with predefined schemas
- **Context Management**: Conversation history and domain-specific prompting
- **Cost Optimization**: Intelligent query routing and response caching

---

## 🛠️ API Documentation

### Core Endpoints

#### Process Data

- `GET /api/process/cases` - Retrieve all manufacturing cases
- `GET /api/process/activities` - Get activity details
- `POST /api/process/compare` - Compare specific cases
- `POST /api/dashboard/filter` - Apply data filters

#### Analytics & AI

- `POST /api/ai/analyze` - ProcessGPT analysis endpoint
- `GET /api/ai/status` - AI service status
- `POST /api/search/text` - Semantic search
- `GET /api/dashboard/anomalies` - Anomaly detection results
- `GET /api/dashboard/metrics` - Key performance metrics

#### Data Management

- `POST /api/import-sample-data` - Import manufacturing datasets
- `GET /api/health` - System health check
- `POST /api/rag/build-knowledge-base` - Build AI knowledge base

### Request/Response Examples

#### ProcessGPT Analysis

```typescript
// Request
POST /api/ai/analyze
{
  "query": "What are the most common causes of failure?",
  "useLocalAI": false
}

// Response
{
  "response": "## Manufacturing Failure Analysis\n\nBased on analysis of 285 failure events:\n\n### Top Failure Categories:\n1. **Equipment Timeout (45%)** - VGR robot communication failures\n2. **Process Parameter Deviation (30%)** - Oven temperature anomalies\n3. **Material Handling Issues (25%)** - HBW positioning errors\n\n### Recommendations:\n- Implement predictive maintenance for VGR systems\n- Enhanced oven temperature monitoring\n- Calibration schedule for HBW positioning",
  "query": "What are the most common causes of failure?",
  "analysisType": "failure_analysis",
  "metrics": {
    "totalFailures": 285,
    "totalEvents": 9471,
    "failureRate": 3.01
  }
}
```

#### Case Comparison

```typescript
// Request
POST /api/process/compare
{
  "caseAId": "WF_101_0",
  "caseBId": "WF_102_0"
}

// Response
{
  "caseA": {
    "caseId": "WF_101_0",
    "totalDurationS": 245.8,
    "status": "completed",
    "activityCount": 12,
    "failureCount": 0,
    "anomalyCount": 1,
    "activities": [
      {
        "activity": "/hbw/unload",
        "actualDurationS": 32.1,
        "plannedDurationS": 30.0,
        "orgResource": "hbw_1",
        "status": "success"
      }
      // ... more activities
    ]
  },
  "caseB": {
    // Similar structure for case B
  }
}
```

---

## 🚀 Deployment

### Local Development

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

### Production Deployment

#### Environment Variables

```bash
# Production environment
NODE_ENV=production
PORT=5000
OPENAI_API_KEY=your_production_api_key
DATABASE_URL=./production-database.sqlite

# Optional: Advanced configuration
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
AI_RATE_LIMIT=100
```

#### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

#### Performance Considerations

- **Database Optimization**: Proper indexing for query performance
- **Memory Management**: Efficient data processing for large datasets
- **Caching Strategy**: Redis for frequently accessed analysis results
- **Load Balancing**: Multiple instance deployment for high availability

---

## 🧪 Testing & Quality Assurance

### Data Validation

- **Schema Validation**: Automated checking of manufacturing data integrity
- **Anomaly Detection Testing**: Validation of statistical methods accuracy
- **Performance Testing**: Load testing with large datasets (>10,000 cases)

### AI Model Validation

- **Response Quality**: Manual review of ProcessGPT analysis accuracy
- **Hallucination Detection**: Fact-checking mechanisms for AI responses
- **Local vs Cloud Comparison**: Performance benchmarking between AI services

---

## 🤝 Contributing

### Development Guidelines

1. **Code Style**: TypeScript with strict type checking
2. **Component Architecture**: Atomic design principles
3. **Testing**: Jest and React Testing Library for component tests
4. **Documentation**: JSDoc comments for complex functions

### Adding New Analysis Features

1. Create service class in `server/services/`
2. Add API routes in `server/routes.ts`
3. Implement frontend component in `client/src/components/dashboard/`
4. Update ProcessGPT function calling schema
5. Add comprehensive documentation

---

## 📄 License

This project uses the CC BY 4.0 licensed manufacturing dataset. The application code is available under MIT license. Please cite the original dataset authors when using this application for research:

_L. Malburg, J. Grüger, R. Bergmann, Dataset: An IoT-Enriched Event Log for Process Mining in Smart Factories (2022)._ https://doi.org/10.6084/m9.figshare.20130794

---

## 🆘 Support

### Common Issues

- **Import Errors**: Ensure CSV file matches expected schema
- **AI Service Failures**: Check OpenAI API key configuration
- **Performance Issues**: Consider dataset size limits and filtering options
- **Database Errors**: Verify SQLite file permissions and disk space

### Getting Help

- **Documentation**: Check this README for comprehensive usage instructions
- **Error Logs**: Review browser console and server logs for detailed error information
- **Community**: Open GitHub issues for bug reports and feature requests

### Contact Information

For questions about the manufacturing dataset or domain-specific inquiries, contact the original dataset authors:

- Lukas Malburg: malburg@uni-trier.de
- Joscha Grüger: grueger@uni-trier.de

---

**Built with ❤️ for the manufacturing process mining community**
