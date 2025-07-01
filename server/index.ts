import express, { NextFunction, Response, type Request } from "express";
import { registerRoutes } from "./routes";
import { AIServiceFactory } from "./services/ai-service-factory";
import { log, serveStatic, setupVite } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize AI services (including RAG system for local AI)
  try {
    console.log('🤖 Initializing AI Service Factory...');
    await AIServiceFactory.initialize();
    console.log('✅ AI Service Factory initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize AI Service Factory:', error);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use a more reliable port configuration for local development
  const port = Number(process.env.PORT) || 5000;
  const host = process.env.NODE_ENV === "development" ? "127.0.0.1" : "0.0.0.0";
  
  server.listen(port, host, () => {
    log(`serving on http://${host}:${port}`);
  });
})();
