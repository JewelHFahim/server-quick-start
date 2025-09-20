import jwt, { JwtPayload } from "jsonwebtoken";


// GENERATE ACCESS TOKEN
export const generateAccessToken = (userId: string, role: string): string => {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  if (!secret) throw new Error("JWT_ACCESS_SECRET not defined");
  return jwt.sign({ id: userId, role }, secret, { expiresIn: "15m" });
};

export const verifyAccessToken = (token: string): JwtPayload | string => {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  if (!secret) throw new Error("JWT_ACCESS_SECRET not defined");
  return jwt.verify(token, secret);
};

// GENERATE REFRESH TOKEN
export const generateRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET as string;
  if (!secret) throw new Error("JWT_REFRESH_SECRET not defined");
  return jwt.sign({ id: userId }, secret, { expiresIn: "7d" });
};

export const verifyRefreshToken = (token: string): JwtPayload | string => {
  const secret = process.env.JWT_REFRESH_SECRET as string;
  if (!secret) throw new Error("JWT_REFRESH_SECRET not defined");
  return jwt.verify(token, secret);
};
