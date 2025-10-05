import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import placesRouter from "./routes/places";
import markerRouter from "./routes/marker";
import chatRouter from "./routes/chat";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/places", placesRouter);
app.use("/api/marker", markerRouter);
app.use("/api/chat", chatRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
