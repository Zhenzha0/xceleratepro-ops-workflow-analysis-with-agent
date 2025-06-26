# ProcessGPT - AI-Powered Manufacturing Analytics Platform

## Overview

ProcessGPT is a comprehensive process mining and workflow analytics platform designed specifically for manufacturing environments. It combines real-time data processing with AI-powered insights to help optimize manufacturing workflows, detect anomalies, and improve operational efficiency.

## Key Features

- **Real-time Analytics**: Live metrics and KPI tracking
- **AI-Powered Insights**: ProcessGPT assistant for natural language queries
- **Anomaly Detection**: Automatic identification of process deviations
- **Process Visualization**: Interactive Sankey diagrams and process maps
- **Case Comparison**: Side-by-side analysis of workflow instances
- **Complete Data Privacy**: Local AI deployment options available

## Current Deployment Options

### Cloud Deployment (Current)
- Running on Replit with OpenAI integration
- Real-time dashboard with 301 manufacturing cases
- 25+ AI analysis capabilities for manufacturing insights

### Local Deployment with Phi-2 AI
For complete data privacy and offline operation, follow these guides:

1. **[PHI2_DOWNLOAD_GUIDE.md](PHI2_DOWNLOAD_GUIDE.md)** - Download Phi-2 model from MediaPipe AI Edge
2. **[COMPLETE_LOCAL_DEPLOYMENT.md](COMPLETE_LOCAL_DEPLOYMENT.md)** - Deploy entire ProcessGPT locally
3. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Verification checklist for successful setup

## Architecture

- **Frontend**: React 18 with TypeScript, Vite, shadcn/ui components
- **Backend**: Node.js with Express, TypeScript, Drizzle ORM
- **Database**: PostgreSQL with manufacturing process data
- **AI Services**: OpenAI GPT-4o (cloud) or Phi-2 MediaPipe (local)

## Manufacturing Data Analysis

ProcessGPT analyzes real manufacturing data including:
- 301 complete workflow cases
- 9,471 individual process events  
- 342 detected anomalies
- Equipment performance metrics
- Failure pattern analysis
- Root cause investigations

## Getting Started

### Quick Start (Cloud)
The application is currently running and accessible through the Replit interface.

### Local Installation
Follow the guides in order:
1. Download Phi-2 model (1.5-2GB .task bundle)
2. Set up local PostgreSQL database
3. Deploy ProcessGPT application
4. Import manufacturing data
5. Configure Phi-2 integration

## Support

All deployment guides include comprehensive troubleshooting sections and step-by-step verification commands to ensure successful setup.