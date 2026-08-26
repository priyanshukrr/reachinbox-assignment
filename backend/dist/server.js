"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = __importDefault(require("./db/prisma"));
const email_routes_1 = __importDefault(require("./routes/email.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Email routes
app.use("/api/emails", email_routes_1.default);
// Root
app.get("/", (req, res) => {
    res.json({
        message: "ReachInbox Backend is running 🚀",
    });
});
// Database health
app.get("/health/db", async (req, res) => {
    try {
        await prisma_1.default.$queryRaw `SELECT 1`;
        res.status(200).json({
            status: "ok",
            database: "connected",
        });
    }
    catch (error) {
        console.error("Database health check failed:", error);
        res.status(500).json({
            status: "error",
            database: "disconnected",
        });
    }
});
// 404
app.use((req, res) => {
    res.status(404).json({
        error: "Route not found",
    });
});
const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
