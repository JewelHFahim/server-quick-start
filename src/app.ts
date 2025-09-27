import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import routes from "./core/routes/routes";
import { connectDB } from "./config/db.config";
import cookieParser from "cookie-parser";
import path from "path";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(helmet());

app.use(cookieParser());

// 🔹 Logger
app.use(morgan("dev"));

// 🔹 MongoDB
connectDB();

// 🔹 Local folder
app.use("/uploads", express.static(path.join(__dirname, "../storage")));

// app.get("/", (req, res) => {
//   res.send("Test Server Runnig Successfully");
// });

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});


// 🔹 Routes
app.use("/api/v1", routes);

export default app;
