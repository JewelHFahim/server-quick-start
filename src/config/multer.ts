// // src/config/multer.ts
// import multer, { FileFilterCallback } from "multer";
// import path from "path";
// import { Request } from "express";
// import fs from "fs";

// // Ensure uploads directory exists
// const uploadDir = path.join(__dirname, "../../storage");
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// // Storage engine
// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => {
//     cb(null, uploadDir);
//   },

//   filename: (_req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     const ext = path.extname(file.originalname);
//     cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
//   },
// });

// // File filter (restrict to images only)
// const fileFilter = (
//   _req: Request,
//   file: Express.Multer.File,
//   cb: FileFilterCallback
// ) => {
//   const allowed = /jpeg|jpg|png|gif|webp/;
//   const ext = path.extname(file.originalname).toLowerCase();
//   if (allowed.test(ext)) {
//     cb(null, true);
//   } else {
//     cb(new Error("Only image files are allowed!"));
//   }
// };

// // Multer instance
// export const upload = multer({
//   storage,
//   fileFilter,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
// });


// src/config/multer.ts
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary";

// Storage configuration for cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    return {
      folder: "bigo-app", // folder name in cloudinary
      format: 'jpg', // auto or specify: 'jpg', 'png'
      public_id: file.fieldname + "-" + Date.now(),
    };
  },
});

export const upload = multer({ storage });
