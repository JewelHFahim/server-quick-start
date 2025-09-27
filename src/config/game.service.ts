import mongoose from "mongoose";
import { Types } from "mongoose";
import { BetModel, IBet } from "../api/bet/bet.model";
import { SettingsModel } from "../api/settings/settings.model";
import User from "../api/users/user.model";
import { RoundModel } from "../api/round/round.model";


/**
 * Place bet: atomic operation
 * - userId: string (ObjectId as string)
 * - roundId: string (ObjectId as string)
 * - box: string (must exist in settings.boxes)
 * - amount: number
 * - isBot: boolean
 *
 * Returns created Bet document (IBet)
 */
export const placeBet = async (
  userId: string,
  roundId: string,
  box: string,
  amount: number,
  isBot = false
): Promise<IBet> => {
  // basic validation
  if (!userId) throw new Error("Invalid userId");
  if (!roundId) throw new Error("Invalid roundId");
  if (!box) throw new Error("Invalid box");
  if (!amount || typeof amount !== "number") throw new Error("Invalid amount");

  // load settings
  const settings = await SettingsModel.findOne().exec();
  if (!settings) throw new Error("Game settings not configured");

  // validate box exists
  if (!Array.isArray(settings.boxes) || !settings.boxes.includes(box)) {
    throw new Error("Unknown box selection");
  }

  // validate bet amounts
  if (amount < settings.minBet) {
    throw new Error(`Minimum bet is ${settings.minBet}`);
  }
  if (amount > settings.maxBet) {
    throw new Error(`Maximum bet is ${settings.maxBet}`);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ensure round exists and is open
    const round = await RoundModel.findById(roundId).session(session);
    if (!round) throw new Error("Round not found");
    if (round.status !== "open") throw new Error("Betting for this round is closed");

    // if not a bot, check and decrement user balance
    if (!isBot) {
      const user = await User.findById(userId).session(session);
      if (!user) throw new Error("User not found");
      if (user.balance < amount) throw new Error("Insufficient balance");

      user.balance -= amount;
      await user.save({ session });
    }

    // create bet (status pending)
    const created = await BetModel.create(
      [
        {
          userId: new Types.ObjectId(userId),
          roundId: new Types.ObjectId(roundId),
          box,
          amount,
          isBot,
          // status & payout handled by round reveal logic
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // created is an array (create with session returns array)
    return created[0] as IBet;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};
