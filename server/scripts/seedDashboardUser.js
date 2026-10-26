/**
 * Create or update a dashboard login.
 * Usage: node scripts/seedDashboardUser.js --email you@example.com --name "Your Name" --role superAdmin
 */
import mongoose from "mongoose";
import { connectDb } from "../src/config/db.js";
import DashboardUser from "../src/models/DashboardUser.js";
import { DASHBOARD_ROLES } from "../src/constants.js";

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i].startsWith("--")) {
            args[argv[i].slice(2)] = argv[i + 1];
            i += 1;
        }
    }
    return args;
}

async function main() {
    const { email, name, role = DASHBOARD_ROLES.SUPER_ADMIN, active = "true" } = parseArgs(process.argv.slice(2));

    if (!email || !name) {
        console.error('Usage: node scripts/seedDashboardUser.js --email you@example.com --name "Your Name" --role superAdmin|admin');
        process.exit(1);
    }
    if (!Object.values(DASHBOARD_ROLES).includes(role)) {
        console.error(`role must be one of: ${Object.values(DASHBOARD_ROLES).join(", ")}`);
        process.exit(1);
    }

    await connectDb();
    const user = await DashboardUser.findOneAndUpdate(
        { email: email.trim().toLowerCase() },
        { $set: { name: name.trim(), role, isActive: active !== "false" } },
        { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
    );
    console.log(`Dashboard user ready: ${user.email} (${user.role}, active: ${user.isActive})`);
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(error.message);
    await mongoose.disconnect();
    process.exit(1);
});
