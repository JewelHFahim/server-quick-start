import express from "express";
import {
  handleDeleteAllUsers,
  handleDeleteUserById,
  handleDeleteUsersBulk,
  handleGetAllUsers,
  handleUpdateUser,
} from "./user.controller";
import { upload } from "../../config/multer";
import { authenticate, authorization } from "../../core/middleware/auth.middleware";
import { Roles } from "../../constants/roles";

const router = express.Router();

router.get("/", authenticate, handleGetAllUsers);
// router.get("/", authenticate, authorization(Roles.ADMIN), handleGetAllUsers);
router.patch("/update/:userId", upload.single("image"), handleUpdateUser);
router.delete("/delete/all", handleDeleteAllUsers);
router.delete("/delete", handleDeleteUsersBulk);
router.delete("/delete/:userId", handleDeleteUserById);

export default router;
