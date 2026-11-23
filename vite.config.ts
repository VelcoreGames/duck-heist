import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// En la web el juego se publica en archivos separados (/assets/*.js, *.css, fuentes)
// con nombre con huella: el CDN de Hostinger y el navegador los guardan, y la página
// HTML pesa unos pocos KB. Antes era un solo HTML de 1.4 MB que el CDN no guardaba.
// Para generar la versión de un solo archivo (distribución offline): VG_SINGLEFILE=1 npm run build
const singleFile = process.env.VG_SINGLEFILE === "1";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), ...(singleFile ? [viteSingleFile()] : [])],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
