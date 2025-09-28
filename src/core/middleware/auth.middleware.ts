import { NextFunction, Request, Response } from "express";
import { Roles } from "../../constants/roles";
import { verifyAccessToken } from "../utils/jwt";
import jwt from "jsonwebtoken";


export interface AuthRequest extends Request {
  user?: TokenPayload;
}

interface TokenPayload {
  id: string;
  role: Roles;
}

export const authenticate = async ( req: AuthRequest, res: Response, next: NextFunction ) => {

  const token = req.headers.authorization?.split(" ")[1];
  if(!token) {
      return res.status(401).json({ status: false, message: "No token" })
  }

  try {
    const decoded = verifyAccessToken(token);

    console.log("Decoded token:", decoded);

    if(!decoded) {
        return res.status(401).json({ status: false, message: "Token not valid" })
    };
   
    // req.user = decoded;

    next();
  } catch (error) {
    console.error("Invalid or expired token", error);
    if( error instanceof jwt.TokenExpiredError){
        return res.status(401).json({ status: false, message: "Token expired" });
    }
     return res.status(403).json({ status: false, message: "Invalid token" });
  }
}


export const authorization = (...roles: Roles[]) => {
    return ( req: AuthRequest, res: Response, next: NextFunction )=> {
      console.log(req.user)
        if(!req.user){
            return res.status(401).json({ status: false, message: "Unauthorized" });
        }

        if(roles.includes(req.user.role)){
            
            return res.status(403).json({ status: false, message: "Forbidden" })
        }
        next();
    }
}