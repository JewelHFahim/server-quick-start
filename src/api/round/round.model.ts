import { Schema, model, Document } from "mongoose";

export type RoundStatus = "open" | "closed" | "completed";

export interface IRound extends Document {
  roundNumber: number;
  status: RoundStatus;
  winningBox?: string;
  startedAt: Date;
  closedAt?: Date;
  revealedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RoundSchema = new Schema<IRound>(
  {
    roundNumber: { type: Number, required: true }, // incremental ID for readability
    status: {
      type: String,
      enum: ["open", "closed", "completed"],
      default: "open",
      required: true,
    },
    winningBox: { type: String, default: null },
    startedAt: { type: Date, required: true, default: Date.now },
    closedAt: { type: Date, default: null },
    revealedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const RoundModel = model<IRound>("Round", RoundSchema);
