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

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Auth routes
app.use("/api/auth", authRoutes);

// Users routes
app.use("/api/users", usersRoutes);

// OAuth routes
app.use("/api/oauth", oauthRoutes);

// Meetings routes
app.use("/api/meetings", meetingsRoutes);

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API listening on :${port}`));
