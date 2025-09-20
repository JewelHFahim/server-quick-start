import {
  generateAccessToken,
  generateRefreshToken,
} from "../../core/utils/jwt";
import User from "../users/user.model";

export const createToken = async ( userId: string, role: string) => {
  const accessToken = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken(userId);

  const user = await User.findById(userId);
  if (user) {
    user.refreshToken.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await user.save();
  }

  return { accessToken, refreshToken };
};
