import express from 'express';
import { handleGetAllUsers, handleLogin, handleRegistration } from './auth.controller';

const router = express.Router();

router.post("/register", handleRegistration);
router.post("/login", handleLogin);
router.get("/users", handleGetAllUsers);

export default router;