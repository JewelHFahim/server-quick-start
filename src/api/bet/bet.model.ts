import { Schema, model, Document, Types } from "mongoose";

export interface IBet extends Document {
  userId: Types.ObjectId;
  roundId: Types.ObjectId;
  box: string;
  amount: number;
  isBot: boolean;
  win?: boolean;
  payout?: number;
  createdAt: Date;
}

const BetSchema = new Schema<IBet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    roundId: { type: Schema.Types.ObjectId, ref: "Round", required: true },
    box: { type: String, required: true },
    amount: { type: Number, required: true },
    isBot: { type: Boolean, default: false },
    win: { type: Boolean, default: null },
    payout: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const BetModel = model<IBet>("Bet", BetSchema);
