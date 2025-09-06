import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("❌ Failed to load MONGO_URI from .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    if (error instanceof Error) {
      console.error("❌ MongoDB connection error:", error.message);
      throw new Error(`MongoDB connection error: ${error.message}`);
    } else {
      console.error("❌ Unknown error connecting to the database:", error);
      throw new Error("Unknown MongoDB connection error");
    }
  }
};
