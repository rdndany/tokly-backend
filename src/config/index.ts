import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  port: process.env.PORT || 8000,
  nodeEnv: process.env.NODE_ENV || "development",

  // CORS configuration
  corsOrigins: [
    "https://tokly-frontend.vercel.app",
    "http://localhost:3000",
    "https://tokly.io",
    "https://www.tokly.io",
    // Allow all tokly.io subdomains
    "*.tokly.io",
    ...(process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : []),
  ],

  // API configuration
  apiVersion: "1.0.0",
  apiPrefix: "/api",

  // Project configuration
  project: {
    maxNameLength: 50,

    allowedEmojis: ["🚀", "🌙", "🐸", "⭐", "🔥", "💎", "🎯", "🌟", "💫", "🎨"],
    defaultEmoji: "🚀",
  },

  // Vercel configuration
  vercel: {
    apiToken: process.env.VERCEL_API_TOKEN || "RtLY1bEThJjjw88DRS5AEBKU",
    projectId: process.env.VERCEL_PROJECT_ID || "tokly-frontend",
    apiUrl: "https://api.vercel.com",
  },

  // Database configuration
  database: {
    mongoURI: process.env.MONGODB_URI || "mongodb://localhost:27017/tokly",
  },

  // Clerk configuration
  clerk: {
    secretKey: process.env.CLERK_SECRET_KEY || "",
    webhookSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET || "",
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || "",
  },

  // Rate limiting (if needed in future)
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
};

export default config;
