import jwt, { JwtPayload } from "jsonwebtoken";

export const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("❌ JWT_SECRET not defined");
  return jwt.sign({ id: userId }, secret, { expiresIn: "7d" });
};

export const verifyToken = (token: string): JwtPayload | string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("❌ JWT_SECRET not defined");
  return jwt.verify(token, secret);
};
