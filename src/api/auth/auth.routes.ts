import express from 'express';
import { handleGetAllUsers, handleLogin, handleRegistration } from './auth.controller';
import { upload } from '../../config/multer';

const router = express.Router();

router.post("/register", upload.single("image"), handleRegistration);
router.post("/login", handleLogin);
router.get("/users", handleGetAllUsers);

export default router;