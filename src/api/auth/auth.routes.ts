import express from "express";
import { handleLogin, handleRefreshToken, handleRegistration } from "./auth.controller";
import { upload } from "../../config/multer";

const router = express.Router();

router.post("/register", upload.single("image"), handleRegistration);
router.post("/login", handleLogin);
router.post("/refresh", handleRefreshToken);

export default router;
