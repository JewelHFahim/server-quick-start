import { Schema, model, Document } from "mongoose";

export interface ISettings extends Document {
  roundDuration: number;     // seconds
  minBet: number;
  maxBet: number;
  boxes: string[];           // e.g. ["fruit1", ..., "5x", "15x"]
  winRatios: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const defaultBoxes = [
  "fruit1",
  "fruit2",
  "fruit3",
  "fruit4",
  "fruit5",
  "fruit6",
  "fruit7",
  "fruit8",
  "5x",
  "15x"
];

const SettingsSchema = new Schema<ISettings>(
  {
    roundDuration: { type: Number, required: true, default: 30 },
    minBet: { type: Number, required: true, default: 10 },
    maxBet: { type: Number, required: true, default: 10000 },
    boxes: { type: [String], required: true, default: defaultBoxes },
    winRatios: {
      type: Schema.Types.Mixed,
      required: false,
      default: {
        // example defaults (admin can override)
        fruit: 0.7,
        "5x": 0.2,
        "15x": 0.1
      }
    }
  },
  { timestamps: true }
);

export const SettingsModel = model<ISettings>("Settings", SettingsSchema);
