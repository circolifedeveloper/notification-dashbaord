import "dotenv/config";

const required = ["MONGO_URI", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const isProduction = process.env.NODE_ENV === "production";

const env = {
    port: Number(process.env.PORT) || 5050,
    isProduction,
    clientOrigins: (process.env.CLIENT_ORIGIN || "http://localhost:5173")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    mongoUri: process.env.MONGO_URI,
    dbName: process.env.DATABASENAME || "circolife",
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: "8h",
    cookieName: "nd_token",
    cookieMaxAgeMs: 8 * 60 * 60 * 1000,
    mailer: {
        host: process.env.MAILER_HOST || "smtp.zoho.in",
        port: Number(process.env.MAILER_PORT) || 465,
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASS,
        from: process.env.SMTP_USER || process.env.MAILER_USER,
    },
    rabbit: {
        url: buildRabbitUrl(),
        exchange: "notifications",
        queue: "inAppQueue",
        routingKey: "notification.inAppQueue",
    },
};

function buildRabbitUrl() {
    if (process.env.RABBITMQ_URL) return process.env.RABBITMQ_URL;
    const host = process.env.RABBITMQ_HOST;
    if (!host) return "";
    const user = process.env.RABBITMQ_USER;
    const password = process.env.RABBITMQ_PASSWORD;
    const credentials = user
        ? `${encodeURIComponent(user)}:${encodeURIComponent(password || "")}@`
        : "";
    return `amqp://${credentials}${host.replace(/^amqps?:\/\//, "")}`;
}

export default env;
