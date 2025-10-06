import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import placesRouter from "./routes/places";
import markerRouter from "./routes/marker";
import chatRouter from "./routes/chat";
import authRouter from "./routes/auth";
import routeRouter from "./routes/route";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/places", placesRouter);
app.use("/api/marker", markerRouter);
app.use("/api/chat", chatRouter);
app.use("/api/auth", authRouter);
app.use("/api/route", routeRouter);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
