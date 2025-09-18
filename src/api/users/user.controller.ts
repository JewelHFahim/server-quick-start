import { Request, Response } from "express";
import User from "./user.model";

//Update User
export const handleUpdateUser = async (req: Request, res: Response) => {
  try {
    const { username, email } = req.body;
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ status: false, message: "Ops! Invalid details" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({
        status: false,
        message: "Ops! User not found, provide valid infos",
      });
    }

    user.username = username ? username?.trim() : user.username;
    user.email = email ? email?.trim() : user.email;

    // Multer-storage-cloudinary attaches file info
    if (req.file) {
      const file = req.file as Express.Multer.File;
      user.image = file.path;
    }

    await user.save();

    return res
      .status(201)
      .json({ status: true, message: "User update successfully", user });
  } catch (error) {
    console.error("Internal server error, updating user", error);
    return res
      .status(500)
      .json({ status: false, message: "Failed update user, try again later" });
  }
};

// Retrive all users
export const handleGetAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({}).select("-password");
    const totalCount = await User.countDocuments();

    return res.status(200).json({
      status: true,
      message: "Retrieved all users",
      totalCount,
      users,
    });
  } catch (error) {
    console.error("❌ Internal server error:", error);

    return res.status(500).json({
      status: false,
      message: "Server error, try again later",
      error: error instanceof Error ? error.message : error,
    });
  }
};

// Delete Single User
export const handleDeleteUserById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ status: false, message: "Ops! User ID is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: "Ops! user not found" });
    }

    await User.findByIdAndDelete(userId);

    return res
      .status(201)
      .json({ status: true, message: "User delete", userId });
  } catch (error) {
    console.error("❌ Internal server error:", error);

    return res.status(500).json({
      status: false,
      message: "Server error, try again later",
      error: error instanceof Error ? error.message : error,
    });
  }
};

// Delete Bulk User
export const handleDeleteUsersBulk = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res
        .status(400)
        .json({
          status: false,
          message: "Please provide an array of user IDs",
        });
    }

    const results = await User.deleteMany({ _id: { $in: userIds } });

    return res
      .status(201)
      .json({
        status: true,
        message: "User delete",
        count: results.deletedCount,
      });
  } catch (error) {
    console.error("❌ Internal server error:", error);

    return res.status(500).json({
      status: false,
      message: "Server error, try again later",
      error: error instanceof Error ? error.message : error,
    });
  }
};

// Delete All
export const handleDeleteAllUsers = async (_req: Request, res: Response) => {
  try {
    const result = await User.deleteMany({});

    return res.status(200).json({
      status: true,
      mesage: "All users deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Server error, try again later",
      error: error instanceof Error ? error.message : error,
    });
  }
};
