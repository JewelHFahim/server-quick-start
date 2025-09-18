import express from "express";
import authRoutes from "../../api/auth/auth.routes";
import userRoutes from "../../api/users/user.routes";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);

export default router;
