import express from 'express';
import { handleGetAllUsers, handleLogin, handleRegistration, handleUpdateUser } from './auth.controller';
import { upload } from '../../config/multer';

const router = express.Router();

router.post("/register", upload.single("image"), handleRegistration);
router.post("/login", handleLogin);
router.get("/users", handleGetAllUsers);
router.patch("/users/update/:userId", upload.single("image"), handleUpdateUser);

export default router;