import jwt, { JwtPayload } from "jsonwebtoken";


// GENERATE ACCESS TOKEN
export const generateAccessToken = (userId: string): string => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("❌ JWT_ACCESS_SECRET not defined");
  return jwt.sign({ id: userId, role: "admin" }, secret, { expiresIn: "15m" });
};

export const verifyAccessToken = (token: string): JwtPayload | string => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("❌ JWT_ACCESS_SECRET not defined");
  return jwt.verify(token, secret);
};

// GENERATE REFRESH TOKEN
export const generateRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("❌ JWT_REFRESH_SECRET not defined");
  return jwt.sign({ id: userId }, secret, { expiresIn: "7d" });
};

export const verifyRefreshToken = (token: string): JwtPayload | string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("❌ JWT_REFRESH_SECRET not defined");
  return jwt.verify(token, secret);
};
