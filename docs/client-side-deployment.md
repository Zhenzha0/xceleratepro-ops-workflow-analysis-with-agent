# Client-Side Deployment Guide

## Overview
This application now runs completely in the browser using local AI models, eliminating the need for backend services in production.

## Deployment Architecture

### Static Website Deployment
The application can be deployed as a static website to any hosting service:

- **Netlify**: Drag and drop `dist/` folder
- **Vercel**: Connect Git repository with auto-builds  
- **GitHub Pages**: Serve from `gh-pages` branch
- **AWS S3**: Static website hosting
- **Any CDN**: Standard static file serving

### Build Process
```bash
# Development with live reload
npm run dev

# Production build  
npm run build

# Serve built files locally
npm run preview
```

### Model File Setup
1. Download Gemma-2B-IT model file (`.task` format)
2. Place at `public/models/gemma-2b-it.task`
3. Model will be served at `/models/gemma-2b-it.task` URL
4. Automatically loaded by MediaPipe WASM runtime

### Browser Requirements
- Modern browser with WebAssembly support
- Minimum 4GB RAM (for model loading)
- Network connection only for initial page load
- Works completely offline after initial load

### Performance Considerations
- Model file size: ~1.5GB (Gemma-2B-IT)
- Initial load time: 30-60 seconds (model download)
- Inference time: 1-5 seconds per query
- Memory usage: 2-3GB during inference

### Security Benefits
- No API keys required
- All data processing happens locally
- No external network calls during analysis
- Complete data privacy and compliance

### Development vs Production
- **Development**: Uses local dev server with hot reload
- **Production**: Static files served from CDN
- **Model Loading**: Same process in both environments
- **Data**: Manufacturing data can be embedded or loaded from JSON files

### Offline Capabilities
Once loaded, the application works completely offline:
- Manufacturing data analysis
- AI-powered insights generation
- Interactive visualizations
- Process mining calculations
- Anomaly detection algorithms

## Migration Benefits
- Zero backend infrastructure costs
- Instant global deployment via CDN
- Perfect data privacy compliance
- Scales automatically with CDN
- Works in air-gapped environments