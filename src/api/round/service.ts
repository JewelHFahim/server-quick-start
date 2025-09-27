import { BetModel } from "../bet/bet.model";
import { SettingsModel } from "../settings/settings.model";
import User from "../users/user.model";
import { RoundModel } from "./round.model";

let roundLoopRunning = false;

export const startRoundLoop = async (io: any) => {
  if (roundLoopRunning) return; // prevent duplicate loops
  roundLoopRunning = true;

  console.log("🎡 Round loop started");

  const runLoop = async () => {
    const settings = await SettingsModel.findOne();

    if (!settings) {
      console.error("⚠️ No settings found, cannot start round");
      return;
    }

    // 1. Start a new round
    const roundNumber = (await RoundModel.countDocuments()) + 1;
    let round = await RoundModel.create({
      roundNumber,
      status: "open",
      startedAt: new Date(),
      boxes: settings.boxes,
    });

    // Start round
    io.emit("round:start", {
      _id: round._id,
      roundNumber: round.roundNumber,
      status: round.status,
      boxes: settings.boxes,
    });

    console.log(`✅ Round ${round.roundNumber} started`);

    // 2. Keep betting open for duration
    await new Promise((res) => setTimeout(res, settings.roundDuration * 1000));

    // Close betting
    round.status = "closed";
    round.closedAt = new Date();
    await round.save();

    
    // Close round
    io.emit("round:closed", {
      _id: round._id,
      roundNumber: round.roundNumber,
      status: round.status,
      boxes: settings.boxes,
    });

    console.log(`⏸️ Round ${round.roundNumber} closed for betting`);

    // 3. Short reveal delay (e.g., 3 seconds)
    await new Promise((res) => setTimeout(res, 3000));

    // 4. Pick winning box
    const boxes = settings.boxes;
    const winningBox = boxes[Math.floor(Math.random() * boxes.length)];

    round.status = "completed";
    round.winningBox = winningBox;
    round.revealedAt = new Date();
    await round.save();

    console.log(`🏆 Round ${round.roundNumber} result: ${winningBox}`);

    // 5. Process payouts
    const bets = await BetModel.find({ roundId: round._id, box: winningBox });

    for (const bet of bets) {
      // calculate payout (example: 5x, 15x, or default multiplier)
      let multiplier = 2; // fallback
      if (bet.box === "5x") multiplier = 5;
      if (bet.box === "15x") multiplier = 15;

      const payout = bet.amount * multiplier;

      bet.win = true;
      bet.payout = payout;
      await bet.save();

      // credit user balance if not a bot
      if (!bet.isBot) {
        await User.findByIdAndUpdate(bet.userId, {
          $inc: { balance: payout },
        });
      }
    }

    io.emit("round:completed", {
      roundId: round._id,
      winningBox,
      bets,
    });

    console.log(`💰 Payouts processed for Round ${round.roundNumber}`);

    // 6. Start next round after short break (e.g., 2s)
    setTimeout(runLoop, 2000);
  };

  // start the first loop
  runLoop();
};
