# ProcessGPT - Local AI Manufacturing Analytics

Complete process mining and workflow analytics platform with local Gemma-2B-IT integration for manufacturing data analysis.

## Features

- **Manufacturing Analytics Dashboard** with 301 real cases and 9,471 events
- **ProcessGPT AI Assistant** with 25+ analysis capabilities
- **Local AI Integration** using Gemma-2B-IT model for complete data privacy
- **Real-time Visualizations** with authentic manufacturing data
- **Anomaly Detection** with 170+ detected manufacturing anomalies
- **Case Comparison & Clustering** for workflow optimization
- **Failure Analysis** with root cause identification

## Quick Start

### Prerequisites
- Node.js 18+ or 20+ LTS
- Python 3.9 (recommended for MediaPipe compatibility)
- Docker Desktop
- 8GB RAM minimum
- 10GB free disk space

### Installation

1. **Clone Repository**
```bash
git clone https://github.com/YOUR_USERNAME/processgpt-local.git
cd processgpt-local
```

2. **Install Dependencies**
```bash
# Node.js packages
npm install

# Python AI packages
pip install torch>=2.0.0 transformers>=4.35.0 mediapipe>=0.10.0 numpy accelerate
```

3. **Setup Database**
```bash
docker run --name processgpt-db \
  -e POSTGRES_DB=processgpt \
  -e POSTGRES_USER=processgpt \
  -e POSTGRES_PASSWORD=processgpt123 \
  -p 5432:5432 \
  -d postgres:16
```

4. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your settings
```

5. **Download Gemma-2B-IT Model**
- Visit [AI Edge Model Garden](https://ai.google.dev/edge/models)
- Download "Gemma 2B IT" model (quantized 4-bit, ~3.1GB)
- Place as `models/gemma/gemma-2b-it.task`

6. **Initialize Database**
```bash
npm run db:push
npm run import-data
```

7. **Start Application**
```bash
npm run dev
```

Open http://localhost:5000 to access ProcessGPT.

## Local AI Setup

The application includes complete local AI integration:

- **Gemma-2B-IT**: Google's lightweight model for edge deployment
- **Complete Privacy**: No external API calls when using local mode
- **Fallback Support**: Automatic OpenAI fallback if local AI fails
- **Performance**: 2-5 second response times with local model

## Project Structure

```
processgpt-local/
├── client/           # React frontend
├── server/           # Express backend
├── shared/           # TypeScript schemas
├── scripts/          # Setup and utility scripts
├── models/           # AI model storage
├── docs/             # Documentation
├── sample_data.csv   # Manufacturing dataset
└── README.md         # This file
```

## Manufacturing Data

Includes authentic manufacturing dataset:
- **301 Manufacturing Cases** from 2021
- **9,471 Process Events** with timestamps
- **170+ Anomalies** detected and classified
- **Real Failure Descriptions** with root cause analysis

## ProcessGPT Capabilities

Ask natural language questions about your manufacturing data:

- "What is our failure rate?"
- "Which activity fails most often?"
- "Show me anomaly patterns"
- "What causes delays in our process?"
- "Compare case WF_102_0 with WF_103_1"

## Development

Built with modern technologies:
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Drizzle ORM
- **Database**: PostgreSQL with authentic manufacturing data
- **AI**: Local Gemma-2B-IT via MediaPipe Python bridge
- **Visualization**: Recharts, D3.js, Plotly.js

## Documentation

- [Complete Deployment Guide](GITHUB_DEPLOYMENT_GUIDE.md)
- [Gemma Model Download Guide](GEMMA_2B_IT_DOWNLOAD_GUIDE.md) 
- [Technical Review](COMPREHENSIVE_TECHNICAL_REVIEW.md)
- [Deployment Summary](DEPLOYMENT_SUMMARY.md)

## License

MIT License - see LICENSE file for details.

## Support

For issues or questions, please check the troubleshooting sections in the deployment guides or create an issue in this repository.