import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import env from "./config/env.js";
import { apiLimiter, verifyOrigin } from "./middleware/security.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import metaRoutes from "./routes/metaRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import audienceRoutes from "./routes/audienceRoutes.js";
import broadcastRoutes from "./routes/broadcastRoutes.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(
    cors({
        origin(origin, callback) {
            if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
            callback(null, false);
        },
        credentials: true,
        methods: ["GET", "POST", "PATCH", "DELETE"],
    })
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ success: true, data: { status: "ok" } }));

app.use("/api", apiLimiter, verifyOrigin);
app.use("/api/auth", authRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/audience", audienceRoutes);
app.use("/api/broadcasts", broadcastRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
