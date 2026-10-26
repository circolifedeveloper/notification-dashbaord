/**
 * Upserts the dummy dashboard logins from seed/dashboardusers.json into the `dashboardusers` collection.
 * Usage: npm run seed:demo
 */
import fs from "fs";
import mongoose from "mongoose";
import { connectDb } from "../src/config/db.js";
import DashboardUser from "../src/models/DashboardUser.js";

const file = new URL("../seed/dashboardusers.json", import.meta.url);
const users = JSON.parse(fs.readFileSync(file, "utf8"));

async function main() {
    await connectDb();
    for (const user of users) {
        const saved = await DashboardUser.findOneAndUpdate(
            { email: user.email },
            { $set: { name: user.name, role: user.role, isActive: user.isActive } },
            { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
        );
        console.log(`Dashboard user ready: ${saved.email} (${saved.role})`);
    }
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(error.message);
    await mongoose.disconnect();
    process.exit(1);
});
