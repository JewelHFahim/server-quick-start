import { generateAccessToken } from "../../core/utils/jwt";
import { Request, Response } from "express";
import User from "../users/user.model";

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
    const { email, password, username, file } = req.body;
    console.log(req.file);

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
      return res.status(400).json({
        status: false,
        message: "Email and Password are must be required",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res
        .status(401)
        .json({ status: false, message: "User not found with this email" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(404).json({ status: false, messge: "Wrong password" });
    }

    // Generate token
    const token = generateAccessToken(user._id as string);

    // Remove sensitive fields
    // const { password: _, ...userData } = user.toObject();

    return res.status(201).json({
      status: true,
      message: "Login successful",
      // user: userData,
      token,
    });
  } catch (error) {
    console.error("Login failed", error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};

// git clone --branch bug-fix --single-branch https://github.com/quantumedgesoft/trendo-server.git
