import express from "express";
import { handleLogin, handleRegistration } from "./auth.controller";
import { upload } from "../../config/multer";

const router = express.Router();

router.post("/register", upload.single("image"), handleRegistration);
router.post("/login", handleLogin);

export default router;
