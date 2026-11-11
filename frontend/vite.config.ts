import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// En desarrollo Vite redirige /api al gateway: no hace falta CORS.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": process.env.GATEWAY_URL ?? "http://localhost:8000",
    },
  },
});
