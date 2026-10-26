import { createContext, useContext, useEffect, useState } from "react";
import { metaApi } from "../api/endpoints.js";

const EnumsContext = createContext(null);

const FALLBACK = {
    categories: ["Subscription", "Query", "Info", "General"],
    subCategories: ["Success", "Failure", "Warning", "Announcement", "Information", "Reminder"],
    targetRoles: ["superAdmin", "admin", "guest"],
    audienceModes: ["allCustomers", "customers", "roles", "customersAndRoles"],
    contentTypes: ["image", "button", "countdown"],
    statuses: ["pending", "approved", "rejected", "inProgress", "sent", "failed"],
    appScreens: ["referral", "request", "service", "subscription", "invoice", "analytics", "notification", "device"],
    defaultScreen: "notification",
    maxImages: 1,
    maxButtons: 2,
};

export function EnumsProvider({ children }) {
    const [enums, setEnums] = useState(FALLBACK);

    useEffect(() => {
        metaApi.enums().then(setEnums).catch(() => {});
    }, []);

    return <EnumsContext.Provider value={enums}>{children}</EnumsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEnums() {
    return useContext(EnumsContext) || FALLBACK;
}
