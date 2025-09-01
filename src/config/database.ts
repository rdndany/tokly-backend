import mongoose from "mongoose";
import { getLogger } from "log4js";
import config from ".";

const connectDatabase = async () => {
  const logger = getLogger("database");
  try {
    console.log("🔌 Attempting to connect to MongoDB...");
    console.log("📍 Connection string:", config.database.mongoURI);

    await mongoose.connect(config.database.mongoURI);

    console.log("✅ Database connected successfully!");
    logger.info("✅ Database connected!");
  } catch (error) {
    console.error("❌ Error connecting to database:", error);
    logger.error("❌ Error connecting to DB:", error);
    process.exit(1);
  }
};

export default connectDatabase;
