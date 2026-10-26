import mongoose from "mongoose";

/**
 * Existing Circolife collections, accessed directly on the shared connection.
 * Only `dashboardusers` and `broadcasts` have Mongoose models in this project.
 */
const collection = (name) => {
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB is not connected");
    return db.collection(name);
};

export const usersCollection = () => collection("users");
export const customersCollection = () => collection("customers");
export const notificationsCollection = () => collection("notifications");
