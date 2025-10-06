import express, { type Request, type Response } from "express";
import { getAuth } from "../firebase";

const router = express.Router();

router.post("/verify", async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    return res.status(400).json({ error: "Missing ID token" });
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    return res.json({ uid: decoded.uid, email: decoded.email, roles: decoded.roles ?? [] });
  } catch (err) {
    console.error("Firebase auth verify failed", err);
    return res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
