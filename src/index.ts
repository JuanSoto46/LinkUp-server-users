/**
 * Bootstraps Express API for Sprint 1.
 * Provides Auth, Users CRUD and Meetings endpoints.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import meetingsRoutes from "./routes/meetings.js";
import oauthRoutes from "./routes/oauth.js";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? true }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/oauth", oauthRoutes);
app.use("/api/meetings", meetingsRoutes);

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API listening on :${port}`));
