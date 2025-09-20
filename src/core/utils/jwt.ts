import jwt, { JwtPayload } from "jsonwebtoken";
import { Roles } from "../../constants/roles";

interface TokenPayload {
  id: string;
  role: Roles;
}

// GENERATE ACCESS TOKEN
export const generateAccessToken = (userId: string, role: Roles): string => {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  if (!secret) throw new Error("JWT_ACCESS_SECRET not defined");
  return jwt.sign({ id: userId, role }, secret, { expiresIn: "15m" });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  if (!secret) throw new Error("JWT_ACCESS_SECRET not defined");
  return jwt.verify(token, secret) as TokenPayload;
};

// GENERATE REFRESH TOKEN
export const generateRefreshToken = (userId: string, role: Roles): string => {
  const secret = process.env.JWT_REFRESH_SECRET as string;
  if (!secret) throw new Error("JWT_REFRESH_SECRET not defined");
  return jwt.sign({ id: userId, role }, secret, { expiresIn: "7d" });
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  const secret = process.env.JWT_REFRESH_SECRET as string;
  if (!secret) throw new Error("JWT_REFRESH_SECRET not defined");
  return jwt.verify(token, secret) as TokenPayload;
};
