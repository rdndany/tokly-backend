import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import projectRoutes from "./routes/projectRoutes";
import domainRoutes from "./routes/domainRoutes";
import connectDatabase from "./config/database";
import { clerkMiddleware } from "@clerk/express";
import clerkWebhooks from "./webhooks/clerk.webhook";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow localhost for development
      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("https://localhost:")
      ) {
        return callback(null, true);
      }

      // Allow all tokly.io subdomains and main domain
      if (
        origin.endsWith(".tokly.io") ||
        origin === "https://tokly.io" ||
        origin === "https://www.tokly.io"
      ) {
        return callback(null, true);
      }

      // Allow Vercel deployments
      if (origin.includes("vercel.app")) {
        return callback(null, true);
      }

      // For any other origins, log them to see what's being blocked
      console.log("CORS blocked origin:", origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  })
);

// MIDDLEWARES
app.use(clerkMiddleware());

// Webhook route - MUST be before express.json() middleware to capture raw body
console.log("🔧 Registering webhook route...");
app.post(
  "/webhooks/clerk",
  express.raw({ type: "application/json", limit: "10mb" }),
  clerkWebhooks
);
console.log("✅ Webhook route registered: POST /webhooks/clerk");

// JSON parsing middleware for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
