import express from "express";
import {
  handleDeleteAllUsers,
  handleDeleteUserById,
  handleDeleteUsersBulk,
  handleGetAllUsers,
  handleUpdateUser,
} from "./user.controller";
import { upload } from "../../config/multer";

const router = express.Router();

router.get("/", handleGetAllUsers);
router.patch("/update/:userId", upload.single("image"), handleUpdateUser);
router.delete("/delete/all", handleDeleteAllUsers);
router.delete("/delete", handleDeleteUsersBulk);
router.delete("/delete/:userId", handleDeleteUserById);

export default router;
