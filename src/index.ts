import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import projectRoutes from "./routes/projectRoutes";
import domainRoutes from "./routes/domainRoutes";
import connectDatabase from "./config/database";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(
  cors({
    origin: [
      "https://tokly-frontend.vercel.app",
      "http://localhost:3000",
      "https://tokly.io",
      "https://www.tokly.io",
      "https://tokly.vercel.app",
      "https://tokly-git-main-tokly.vercel.app",
      "https://tokly-tokly.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Welcome to Tokly Backend API",
    status: "Server is running successfully!",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.get("/api/status", (req: Request, res: Response) => {
  res.json({
    message: "API is working",
    version: "1.0.0",
  });
});

// Project routes
app.use("/api/projects", projectRoutes);

// Domain routes
app.use("/api/domains", domainRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: err.message,
  });
});

// 404 handler
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API endpoint: http://localhost:${PORT}/api/status`);

  // Connect to database
  try {
    await connectDatabase();
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }
});

export default app;
