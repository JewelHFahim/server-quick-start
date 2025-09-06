import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import routes from "./core/routes/routes";
import { connectDB } from "./config/db.config";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(helmet());

// 🔹 Logger
app.use(morgan("dev"));

// 🔹 MongoDB
connectDB();

app.get("/", (req, res) => {
  res.send("Test Server Runnig Successfully");
});

// 🔹 Routes
app.use("/api/v1", routes);

export default app;
