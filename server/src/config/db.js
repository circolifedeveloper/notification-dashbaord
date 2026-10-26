import mongoose from "mongoose";
import env from "./env.js";

export async function connectDb() {
    mongoose.set("strictQuery", true);
    await mongoose.connect(env.mongoUri, { dbName: env.dbName });
    console.log(`[MongoDB] Connected to database: ${env.dbName}`);
}
