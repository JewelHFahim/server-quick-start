import { Request, Response } from "express";
import User from "../users/user.model";
import { createToken } from "./auth.service";
import { verifyRefreshToken } from "../../core/utils/jwt";

async function generateUniqueId() {
  const prefix = "UID";
  const random = () => Math.floor(Math.random() * 1_000_000_000);

  let uniqueId = `${prefix}${random()}`;
  let user = await User.findOne({ uniqueId: uniqueId });

  while (user) {
    uniqueId = `${prefix}${random()}`;
    user = await User.findOne({ uniqueId: uniqueId });
  }
  return uniqueId;
}

// Registration
export const handleRegistration = async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !username || !password) {
      return res.status(404).json({
        status: false,
        message: "email, username & password must be required",
      });
    }

    const existUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existUser) {
      return res.status(404).json({
        status: false,
        message: "This Email or Username already in used",
      });
    }

    // Multer-storage-cloudinary attaches file info
    const files = req.file as Express.Multer.File & { path: string };

    const newUser = new User({
      email,
      username,
      password,
      uniqueId: await generateUniqueId(),
      date: new Date().toLocaleDateString("en-us", { timeZone: "Asia/Dhaka" }),
    });

    //  imamge

    if (req.file) {
      newUser.image = files.path;
    }

    const user = await newUser.save();

    return res.status(200).json({
      status: true,

      message: "User registered successfully",
      user,
    });
  } catch (error) {
    console.error("Failed to signup", error);
    return res
      .status(500)
      .json({ status: false, message: "Somthing went wrong, try again later" });
  }
};

// Login user
export const handleLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: false, message: "Email and Password are must be required" });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ status: false, message: "User not found with this email" });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(404).json({ status: false, messge: "Wrong password" });
    }

    // Generate token
    const { accessToken, refreshToken } = await createToken( user._id.toString(), "admin");

    res.cookie( "refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60
    })

    return res.status(201).json({
      status: true,
      message: "Login successful",
      accessToken,
    });
  } catch (error) {
    console.error("Login failed", error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};

// Handle Refresh token
// export const handleRefreshToken = async (req: Request, res: Response)  => {
//   try {
//      const token = req.cookies.refreshToken;
     
//    if(!token){
//     return res.status(401).json({ status: false, message: "No refresh token" })
//    }

//    const decoded = verifyRefreshToken(token) as { id: string };

//   if (!decoded?.id) {
//     return res.status(403).json({ status: false, message: "Invalid refresh token" });
//   }

//    const user = await User.findById(decoded?.id);

//   if(!user){
//     return res.status(401).json({ status: false, message: "User not found" })
//    }

//    const storedToken = user.refreshToken.find(t => t.token === token);

//   if(!storedToken){
//     return res.status(401).json({ status: false, message: "Token revoked" })
//    }

//    user.refreshToken = user.refreshToken.filter((t)=> t.token !== token);

//    const { accessToken, refreshToken } = await createToken( user._id.toString(), user.role );

//    await User.findByIdAndUpdate(user._id,{
//     $pull: { refreshToken: { token } }, // remove old token
//     $push: {
//        token: refreshToken, 
//        expiresAt: new Date( Date.now() + 7 * 24 * 60 * 60 * 1000 )
//     }
//    })

//    res.cookie("refreshToken", refreshToken, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "strict",
//     maxAge: 7 * 24 * 60 * 60 * 1000
//    });

//    return res.status(201).json({ status: true, refreshToken})
//   } catch (error) {
//     console.log("Internal server error", error);
//     return res.status(500).json({ status: false, message: "Token refresh failed", error });
//   }
// }


// export const handleRefreshToken = async (req: Request, res: Response) => {
//   try {
//     const token = req.cookies?.refreshToken;

//     if (!token) {
//       return res.status(401).json({ status: false, message: "No refresh token" });
//     }

//     const decoded = verifyRefreshToken(token) as { id: string };
//     if (!decoded?.id) {
//       return res.status(403).json({ status: false, message: "Invalid refresh token" });
//     }

//     const user = await User.findById(decoded.id);
//     if (!user) {
//       return res.status(401).json({ status: false, message: "User not found" });
//     }

//     // Validate existing token
//     const storedToken = user.refreshToken.find((t) => t.token === token);
//     if (!storedToken) {
//       return res.status(401).json({ status: false, message: "Token revoked" });
//     }

//     // Create new tokens
//     const { accessToken, refreshToken } = await createToken(user._id.toString(), user.role);

//     // Remove old refresh token
//     await User.findByIdAndUpdate(user._id, {
//       $pull: { refreshToken: { token } },
//     });

//     // Add new refresh token
//     await User.findByIdAndUpdate(user._id, {
//       $push: {
//         refreshToken: {
//           token: refreshToken,
//           expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//         },
//       },
//     });

//     // Set cookie with new refresh token
//     res.cookie("refreshToken", refreshToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//     });

//     return res.status(200).json({
//       status: true,
//       accessToken,
//     });
//   } catch (error) {
//     console.error("Internal server error (refresh token)", error);
//     return res.status(500).json({ status: false, message: "Token refresh failed" });
//   }
// };

export const handleRefreshToken = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ status: false, message: "No refresh token" });
    }

    const decoded = verifyRefreshToken(token) as { id: string };
    if (!decoded?.id) {
      return res.status(403).json({ status: false, message: "Invalid refresh token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ status: false, message: "User not found" });
    }

    // Validate existing token
    const storedToken = user.refreshToken.find((t) => t.token === token);
    if (!storedToken) {
      return res.status(401).json({ status: false, message: "Token revoked" });
    }

    // Generate new tokens
    const { accessToken, refreshToken } = await createToken(user._id.toString(), user.role);

    // Replace all old refresh tokens with just the new one
    await User.findByIdAndUpdate(user._id, {
      $set: {
        refreshToken: [
          {
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    });

    // Send cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      status: true,
      accessToken,
    });
  } catch (error) {
    console.error("Internal server error (refresh token)", error);
    return res.status(500).json({ status: false, message: "Token refresh failed" });
  }
};



// git clone --branch bug-fix --single-branch https://github.com/quantumedgesoft/trendo-server.git
