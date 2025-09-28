import { Roles } from "../../constants/roles";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../core/utils/jwt";
import User from "../users/user.model";

export const createToken = async ( userId: string, role: Roles) => {
  const accessToken = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken(userId, role);

  // const user = await User.findById(userId);
  const user = await User.findById(userId._id).lean();

  if (user) {
    user.refreshToken.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await user.save();
  }

  return { accessToken, refreshToken };
};
