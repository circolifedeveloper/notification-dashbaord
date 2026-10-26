import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    return {
        plugins: [react(), tailwindcss()],
        server: {
            port: 5173,
            proxy: {
                "/api": {
                    target: env.VITE_API_PROXY || "http://localhost:5050",
                    changeOrigin: true,
                },
                "/circolife-api": {
                    target: env.VITE_CIRCOLIFE_API_PROXY || "http://localhost:1515",
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/circolife-api/, ""),
                },
            },
        },
    };
});
