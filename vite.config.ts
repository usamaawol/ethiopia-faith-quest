import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
<<<<<<< HEAD
=======
import { componentTagger } from "lovable-tagger";
>>>>>>> origin/main

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
<<<<<<< HEAD
  plugins: [react()],
=======
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
>>>>>>> origin/main
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
