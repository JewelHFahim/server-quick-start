// src/scripts/seedSettings.ts
import mongoose from "mongoose";
import { SettingsModel } from "../api/settings/settings.model";
import dotenv from "dotenv";

dotenv.config();


const seed = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("❌ Failed to load MONGO_URI from .env");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  // await mongoose.connect(process.env.MONGO_URI);

  const existing = await SettingsModel.findOne();
  if (!existing) {
    await SettingsModel.create({
      roundDuration: 30, // seconds
      boxes: ["red", "blue", "green"], // valid bet options
      minBet: 10,
      maxBet: 1000,
    });
    console.log("✅ Settings seeded successfully");
  } else {
    console.log("⚠️ Settings already exist, skipping");
  }

  await mongoose.disconnect();
};

seed();
