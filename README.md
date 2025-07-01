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

5. **AI Model Setup (Optional - for Local AI)**

   For local AI capabilities with ProcessGPT, download the pre-converted Gemma3-1B model:

   ```bash
   # Create models directory
   mkdir -p public/models

   # Download Gemma3-1B-IT model directly from Hugging Face
   # Visit: https://huggingface.co/litert-community/Gemma3-1B-IT/tree/main
   # Download gemma3-1b-it-int4.task (~555MB) to public/models/

   # Or use command line (requires accepting license on HuggingFace first):
   wget -O public/models/gemma3-1b-it-int4.task \
     "https://huggingface.co/litert-community/Gemma3-1B-IT/resolve/main/gemma3-1b-it-int4.task"
   ```

   **Supported Model Formats:**

   - `.task` files (recommended)
   - `.gguf` files
   - `.bin` files (legacy)

   **Model Requirements:**

   - Minimum 4GB RAM for 1B parameter models
   - 8GB+ RAM recommended for optimal performance
   - Models should be placed in `public/models/` directory

   **Note**: The application works fully without local models using OpenAI API. Local models provide offline capabilities and reduced API costs.

6. **Start the Application**

   ```bash
   npm run dev
   ```

7. **Access the Dashboard**
   Open your browser to `http://localhost:3000`

---

## 🤖 AI-Powered Analytics (ProcessGPT)

The application includes an advanced AI assistant called **ProcessGPT** for intelligent manufacturing process analysis.

### AI Service Options

#### 1. OpenAI Integration (Default)

- **Setup**: Add your OpenAI API key to `.env`
- **Features**: Full GPT-4 capabilities for complex analysis
- **Usage**: Requires internet connection and API costs
- **Best for**: Production environments, complex queries

#### 2. Local AI (Optional)

- **Setup**: Download compatible models to `public/models/`
- **Features**: Offline analysis with local language models
- **Usage**: No internet required, no API costs
- **Best for**: Privacy-sensitive environments, development

### AI Features

- **Failure Analysis**: Intelligent root cause analysis of manufacturing failures
- **Pattern Recognition**: Automated detection of process patterns and anomalies
- **Temporal Analysis**: Time-based trend analysis and prediction
- **Natural Language Queries**: Ask questions in plain English
- **RAG-Enhanced Responses**: Context-aware analysis using your process data

### Switching Between AI Services

The application automatically detects available models and allows switching:

1. **In the Dashboard**: Use the AI service toggle in the top navigation
2. **Manual Override**: Set `USE_LOCAL_AI=true` in `.env` to force local AI
3. **Fallback**: Automatically falls back to OpenAI if local models unavailable

### Model Selection & Architecture

#### Motivation for Local AI Deployment

To select an appropriate model architecture for local deployment and edge execution, it was essential to first clarify the motivation behind running the language model offline rather than through a cloud API like OpenAI's GPT.

The primary driver for local inference was **data security** — when using OpenAI's cloud-based endpoints, all input prompts and conversation data must be transmitted to external servers, which can pose privacy and compliance concerns for sensitive manufacturing or process data. Running the entire inference pipeline locally ensures that no data leaves the device.

To meet this requirement, the chosen language model had to be lightweight enough to run on edge devices (e.g., tablets, low-end desktops) without significant latency or memory constraints. Practically, this means targeting model sizes around 1 GB or less, which is feasible for small LLMs that have been quantized and optimized for edge inference.

#### 📦 Role of MediaPipe and Model Formats

Google AI Edge's MediaPipe GenAI tools play a critical role here:

**First**, MediaPipe's converter supports transforming the raw model checkpoint (e.g., a `.safetensors` file from Hugging Face) into a TensorFlow Lite (`.tflite`) format.

- `.tflite` is an efficient, compressed neural network format designed for mobile and embedded inference.

**Then**, MediaPipe's bundler wraps the `.tflite` model and its tokenizer into a `.task` file.

- A `.task` file is a self-contained package used by MediaPipe's LLM Inference API. It includes the model weights, tokenizer, special tokens, and inference metadata. This makes it easy to deploy an LLM like an "offline version of OpenAI"— without re-training or building custom preprocessing pipelines from scratch.

#### 🧩 WASM (WebAssembly) Execution

To run the `.task` model in a web browser, we use WebAssembly (WASM). WASM is a low-level, portable binary instruction format that allows high-performance code to run inside the browser sandbox at near-native speed. MediaPipe's LLM Inference WASM runtime loads the `.task` file in the browser and executes the model directly on the user's device — with no server calls required. This is key for delivering secure, offline, cross-platform inference.

#### ✅ Model Selection Journey

**1️⃣ Initial Candidate — Gemma-2B**
I first tested the `gemma-2b` model checkpoint. After converting it to `.tflite` and bundling it into `.task` format with MediaPipe's tools, I verified its inference performance and text generation quality. However, I realized that `gemma-2b` is a base model, not instruction-tuned — meaning it's not fine-tuned for conversational or question-answering tasks, making it poorly suited for a chatbot context.

**2️⃣ Next Attempt — Gemma-2B-IT**
Next, I switched to `gemma-2b-it`, the instruction-tuned variant designed for chat-like tasks. However, after compressing the model to `.tflite` and bundling it into `.task`, I found that this specific version could not be run locally in the browser using the WASM backend — MediaPipe's converter and runtime did not yet fully support this model for client-side WebAssembly inference.

**3️⃣ Final Working Solution — Gemma-3-1B-IT**
This limitation led me to identify a better candidate: `gemma-3-1b-it` — a smaller (1B parameter) instruction-tuned Gemma 3 model, released with a prebuilt `.task` file compatible with MediaPipe's WASM runtime. Unlike the previous versions, `gemma-3-1b-it` has been optimized and quantized (e.g., int4) specifically for edge deployment. The `.task` bundle is directly available from Hugging Face under LiteRT Community, so no manual conversion is needed.

By deploying this `.task` file through MediaPipe's LLM Inference WASM module, the chatbot now runs fully offline in the browser, achieving fast, private, instruction-tuned text generation without sending data to the cloud.

#### ✅ Key Takeaway

This process demonstrates how model size, format, tuning, and WASM compatibility must align when building secure, edge-friendly language applications. Using the `.tflite` + `.task` pipeline with MediaPipe's tooling ensures the final LLM is easy to deploy and requires minimal device resources, while WebAssembly delivers cross-platform, in-browser execution with near-native performance.

### Local AI Limitations & Capabilities

#### Parameter Scale Comparison

The local AI model (`gemma-3-1b-it`) operates with **1 billion parameters**, which is significantly smaller compared to OpenAI's GPT-4 with approximately **170+ billion parameters**. This substantial difference in model scale directly impacts the complexity of queries that can be effectively handled.

#### Model Capability Constraints

**✅ What Local AI Handles Well:**

- Single-step queries with direct data lookups
- Simple statistical analysis and aggregation
- Basic pattern recognition in manufacturing data
- Straightforward failure analysis and equipment metrics
- Standard reporting and data summarization

**❌ Complex Queries That Require OpenAI:**

- Multi-step reasoning requiring intermediate conclusions
- Complex root cause analysis involving multiple variables
- Advanced temporal pattern recognition across extended periods
- Sophisticated natural language understanding with nuanced context
- Deep analytical insights requiring domain expertise synthesis

#### Example Query Comparisons

**✅ Simple Query (Local AI Capable):**

```
"What is the average processing time for the oven station?"
```

- **Why it works**: Direct aggregation query requiring single database lookup and basic calculation

**❌ Complex Query (Requires OpenAI):**

```
"Analyze the correlation between morning shift failures and the subsequent impact on afternoon production efficiency, considering seasonal variations and equipment maintenance schedules over the past 6 months."
```

- **Why it fails locally**: Requires multi-step reasoning, complex correlation analysis, temporal pattern recognition, and integration of multiple data sources

**✅ Simple Query (Local AI Capable):**

```
"Which equipment has the highest failure rate?"
```

- **Why it works**: Simple counting and ranking operation

**❌ Complex Query (Requires OpenAI):**

```
"Given the current failure patterns, predict which equipment is most likely to fail next week and recommend preventive maintenance priorities based on production schedule impact and spare parts availability."
```

- **Why it fails locally**: Requires predictive modeling, multi-variable analysis, and strategic decision-making

#### Performance Recommendations

**Use Local AI When:**

- Data privacy is critical
- Internet connectivity is limited
- Simple reporting and metrics are sufficient
- Basic failure analysis meets requirements

**Use OpenAI When:**

- Complex analytical insights are needed
- Multi-step reasoning is required
- Advanced pattern recognition is essential
- Strategic recommendations and predictions are desired

### Model Management

**Recommended Models:**

- **Gemma 3 1B Instruct**: Best balance of performance and resource usage
- **Gemma 2B IT**: Higher capability, more resource intensive
- **Custom Models**: Any compatible .task, .gguf, or .bin format models

**Storage Location:**

```
public/models/
├── gemma3-1b-it.task      (recommended)
├── your-custom-model.gguf  (optional)
└── backup-model.bin        (optional)
```

**Troubleshooting:**

- **Model not detected**: Ensure files are in `public/models/` with correct extensions
- **Memory issues**: Use smaller models (1B parameters) or increase system RAM
- **Performance slow**: Check CPU usage; consider GPU acceleration for larger models

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

---

## 🧠 Understanding Local AI Limitations

### Parameter Memory & Context Constraints

The fundamental limitation of local AI models stems from their **parameter count**, which directly affects their "memory" and reasoning capabilities:

#### **Parameter Scale Comparison**

- **Gemma-3-1B (Local)**: ~1 billion parameters
- **OpenAI GPT-4 (Cloud)**: ~170 billion parameters

#### **Why Local AI "Forgets" Information**

**1. Limited Working Memory**

```
Local AI (1B parameters):
┌─────────────────────────────────────┐
│ Context Window: ~2,048 tokens       │
│ Working Memory: Limited             │
│ Multi-step Reasoning: Basic         │
└─────────────────────────────────────┘

OpenAI GPT-4 (170B parameters):
┌─────────────────────────────────────┐
│ Context Window: ~32,000 tokens      │
│ Working Memory: Extensive           │
│ Multi-step Reasoning: Advanced      │
└─────────────────────────────────────┘
```

**2. Information Retention Issues**

- **Token Limit**: Local AI can only "remember" ~2,000 words at once
- **Context Loss**: Longer conversations cause early information to be "forgotten"
- **No Persistent Memory**: Each query starts fresh without learning from previous interactions

**3. Reasoning Limitations**

- **Single-Step Processing**: Can handle direct questions but struggles with complex logic chains
- **Pattern Recognition**: Limited ability to connect distant data points
- **Inference Depth**: Cannot perform deep analytical reasoning across multiple data dimensions

#### **Query Capability Comparison**

| Query Type                    | Local AI (Gemma-3-1B) | OpenAI GPT-4 |
| ----------------------------- | --------------------- | ------------ |
| **Simple Data Retrieval**     | ✅ Excellent          | ✅ Excellent |
| **Basic Pattern Recognition** | ✅ Good               | ✅ Excellent |
| **Multi-step Analysis**       | ❌ Limited            | ✅ Excellent |
| **Complex Correlations**      | ❌ Poor               | ✅ Excellent |
| **Contextual Reasoning**      | ❌ Basic              | ✅ Advanced  |

#### **Examples of Query Limitations**

**✅ Local AI Can Handle:**

```
- "What is the most common failure type?"
- "Show me events from case WF_101_0"
- "Which activity takes the longest time?"
- "How many failures occurred today?"
```

**❌ Local AI Struggles With:**

```
- "Analyze the correlation between temperature fluctuations,
   timing delays, and subsequent failure patterns across
   multiple manufacturing lines, considering seasonal variations
   and equipment age factors"

- "Compare failure patterns from Q1 vs Q2, identify trending
   issues, predict potential future problems, and recommend
   specific maintenance schedules based on historical data"

- "Cross-reference equipment utilization rates with failure
   frequencies, factor in shift worker experience levels,
   and suggest optimal production scheduling to minimize risks"
```

#### **When to Use Each AI Service**

**🏠 Choose Local AI When:**

- Privacy is critical (no data leaves your network)
- Simple, direct questions
- Quick exploratory data analysis
- Offline/air-gapped environments
- Cost considerations (no API fees)

**☁️ Choose OpenAI When:**

- Complex multi-dimensional analysis needed
- Advanced pattern recognition required
- Strategic decision-making support
- Comprehensive reporting with deep insights
- Research and detailed investigations

---

## 📥 Complete Installation & Setup Guide

### System Requirements

**Minimum Hardware:**

- **CPU**: 4 cores, 2.0 GHz
- **RAM**: 8 GB (16 GB recommended for local AI)
- **Storage**: 5 GB free space
- **GPU**: Optional (improves local AI performance)

**Software Prerequisites:**

- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher
- **Git**: For cloning the repository

### Step 1: Environment Setup

#### Install Node.js

```bash
# Windows (using winget)
winget install OpenJS.NodeJS

# macOS (using Homebrew)
brew install node

# Linux (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.0.0 or higher
npm --version   # Should show v8.0.0 or higher
```

#### Install Git

```bash
# Windows
winget install Git.Git

# macOS
brew install git

# Linux
sudo apt-get install git
```

### Step 2: Project Installation

#### Clone and Setup Project

```bash
# Clone the repository
git clone https://github.com/your-username/xceleratepro-ops-workflow-analysis-with-agent.git
cd xceleratepro-ops-workflow-analysis-with-agent

# Install dependencies
npm install

# Install additional dependencies for AI features
npm install --save @tensorflow/tfjs @mediapipe/tasks-genai
```

#### Environment Configuration

```bash
# Create environment file
cp .env.example .env

# Edit .env file with your settings
# Windows
notepad .env

# macOS/Linux
nano .env
```

**Required Environment Variables:**

```bash
# Basic Configuration
NODE_ENV=development
PORT=5000

# OpenAI Configuration (for cloud AI)
OPENAI_API_KEY=your_openai_api_key_here

# Local AI Configuration (optional)
USE_LOCAL_AI=false
LOCAL_AI_MODEL_PATH=./public/models/

# Database Configuration
DATABASE_URL=./local-database.sqlite

# Optional Performance Settings
AI_RATE_LIMIT=50
LOG_LEVEL=info
```

### Step 3: Gemma3-1B-IT Model Download

#### Simple Download from Hugging Face

**Direct Download (Recommended)**

The model is pre-converted and ready to use from the LiteRT Community repository:

```bash
# Create models directory
mkdir -p public/models
cd public/models

# Download the optimized int4 quantized model (~555MB)
wget -O gemma3-1b-it-int4.task \
  "https://huggingface.co/litert-community/Gemma3-1B-IT/resolve/main/gemma3-1b-it-int4.task"

# Alternative: download using curl
curl -L -o gemma3-1b-it-int4.task \
  "https://huggingface.co/litert-community/Gemma3-1B-IT/resolve/main/gemma3-1b-it-int4.task"
```

**Manual Download**

1. Visit: [https://huggingface.co/litert-community/Gemma3-1B-IT/tree/main](https://huggingface.co/litert-community/Gemma3-1B-IT/tree/main)
2. Accept the Gemma license terms if prompted
3. Download `gemma3-1b-it-int4.task` (555MB) directly to your `public/models/` directory

**Alternative Model Sizes (from the same repository):**

- `gemma3-1b-it-int4.task` - 555MB (recommended, good balance of size/quality)
- `gemma3-1b-it-int8-web.task` - 1.01GB (higher quality, larger size)
- `Gemma3-1B-IT_seq128_q4_block128_ekv1280.task` - 676MB (alternative optimization)

#### Verify Model Installation

```bash
# Check model file exists and size
ls -lh public/models/gemma3-1b-it-int4.task

# Expected output:
# -rw-r--r-- 1 user user 555M date time gemma3-1b-it-int4.task

# The application will automatically detect the model on startup
```

### Step 4: Data Setup

#### Import Sample Dataset

```bash
# The sample dataset is included in attached_assets/
# Verify it exists
ls attached_assets/sample_data_*.csv

# Start the application
npm run dev

# Navigate to http://localhost:3000
# The dataset will be imported automatically on first load
```

#### Custom Dataset Setup

```bash
# Place your XES or CSV file in attached_assets/
cp your-dataset.csv attached_assets/

# Supported formats:
# - XES (XML Event Stream)
# - CSV with columns: case_id, activity, timestamp, resource, etc.
# - Manufacturing event logs with IoT sensor data
```

### Step 5: Verification & Testing

#### System Health Check

```bash
# Start the application
npm run dev

# Check all services are running
curl http://localhost:5000/api/health

# Expected response:
{
  "status": "healthy",
  "dataImported": true,
  "metrics": {
    "totalEvents": 9471,
    "totalCases": 123,
    "avgProcessingTime": 235.28
  }
}
```

#### AI Service Testing

```bash
# Test OpenAI connection
curl -X POST http://localhost:5000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"query": "Test query", "useLocalAI": false}'

# Test Local AI (if configured)
curl -X POST http://localhost:5000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"query": "Test query", "useLocalAI": true}'
```

### Step 6: Performance Optimization

#### Memory Optimization

```bash
# For large datasets, increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"
npm run dev

# Or permanently in package.json
"scripts": {
  "dev": "cross-env NODE_OPTIONS='--max-old-space-size=8192' tsx server/index.ts"
}
```

#### Database Optimization

```sql
-- Create indexes for better query performance
CREATE INDEX idx_events_case_id ON events(caseId);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_activity ON events(activity);
CREATE INDEX idx_events_anomaly ON events(isAnomaly);
```

### Troubleshooting Common Issues

#### Installation Problems

```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Permission issues (Linux/macOS)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) ./node_modules
```

#### Model Loading Issues

```bash
# Check model file integrity
file public/models/gemma3-1b-it.task
# Should show: "data"

# Verify file permissions
chmod 644 public/models/gemma3-1b-it.task

# Check disk space
df -h
```

#### Memory Issues with Local AI

```bash
# Monitor memory usage
# Windows
taskmgr

# macOS
Activity Monitor

# Linux
htop

# If out of memory, reduce model size or use cloud AI
```

#### Port Conflicts

```bash
# Check if port 5000 is in use
# Windows
netstat -ano | findstr :5000

# macOS/Linux
lsof -i :5000

# Kill conflicting process
# Windows
taskkill /PID <process_id> /F

# macOS/Linux
kill -9 <process_id>
```

### Advanced Configuration

#### Custom Model Integration

```javascript
// server/services/custom-ai-service.ts
export class CustomAIService {
  constructor(modelPath: string) {
    this.modelPath = modelPath;
  }

  async loadModel() {
    // Custom model loading logic
  }

  async generateResponse(query: string) {
    // Custom inference logic
  }
}
```

#### Production Deployment

```bash
# Build for production
npm run build

# Set production environment
export NODE_ENV=production
export PORT=80

# Start with PM2 process manager
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### SSL/HTTPS Configuration

```javascript
// server/index.ts
import https from "https";
import fs from "fs";

const options = {
  key: fs.readFileSync("path/to/private-key.pem"),
  cert: fs.readFileSync("path/to/certificate.pem"),
};

https.createServer(options, app).listen(443);
```

---

**Built with ❤️ for the manufacturing process mining community**
