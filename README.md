# Duck Heist · Velcore Games

Source deployment repository for DUCK HEIST: El Banco del Pan.

Este repositorio publica **todo velcoregames.com**: la página de Velcore Games y el juego. Hostinger lo compila (`npm run build`) y lo publica automáticamente cada vez que se sube un cambio a `main`.

## Qué hay en cada dirección

| Dirección | Qué es | Dónde se edita |
|---|---|---|
| `velcoregames.com/` | Página de Velcore Games (estudio, juegos, contacto) | `sitio/` |
| `velcoregames.com/duck-heist` | El juego Duck Heist | `src/` |
| `velcoregames.com/duck-heist-movil` | Página "en desarrollo" de Duck Heist Móvil | `src/RouteApp.tsx` |
| `velcoregames.com/eca` | Página "en desarrollo" de ECA | `src/RouteApp.tsx` |

`scripts/build-routes.mjs` arma el resultado: primero genera las rutas del juego y después copia todo `sitio/` a la raíz, de modo que la portada `/` es la página de Velcore Games.

## Página de Velcore Games (`sitio/`)

```
sitio/
  index.html    Página completa: HTML, CSS y JavaScript en un solo archivo
  media/        Logos de Velcore, capturas del juego, pato, favicon e imagen para redes
  robots.txt    Indicaciones para buscadores
  sitemap.xml   Mapa del sitio para Google
```

Es HTML estático: no pasa por Vite ni por Tailwind (`src/index.css` excluye `sitio/` y `dist/` con `@source not`). Cambiar la página no cambia el juego.

Reglas para editarla (personas e IAs):

1. **Edita `sitio/index.html` en su lugar.** No lo conviertas a React ni lo mezcles con `src/`.
2. **Bilingüe ES/EN.** Cada texto visible va en pares: `<span lang="es">Texto</span><span lang="en">Text</span>`. Si agregas texto, agrega las dos versiones.
3. **Modo oscuro y claro.** Usa las variables de `:root` (oscuro) y `:root[data-mode="light"]` (claro); no pongas colores fijos sueltos.
4. **Marca Velcore.** Sora (títulos), Roboto (texto), JetBrains Mono (etiquetas). Azul `#1e3dff` y el degradado `--grad`. El dorado (`--gold`) solo se usa en la sección de Duck Heist.
5. **Botones de jugar.** Los que llevan `data-game` toman la dirección de `GAME_URL` (al final del archivo). Los de WhatsApp usan `data-wa` con los mensajes de `MSG`.
6. **Imágenes** en `sitio/media/`, con rutas relativas (`media/archivo.webp`). Las capturas del juego son `dh-*.webp`; si el juego cambia mucho, conviene volver a tomarlas.
7. No inventes datos del juego (modos, enemigos, plataformas) que no existan en `src/`.

## Rutas del juego

No cambies las direcciones `/duck-heist`, `/duck-heist-movil` ni `/eca`: las cuentas de los jugadores (Supabase) solo funcionan en `https://velcoregames.com` y el correo de verificación regresa a `https://velcoregames.com/duck-heist`.

## Publicación

- Hostinger despliega `main` automáticamente (Node.js 22, `npm run build`, salida `dist/`).
- La acción de GitHub (`.github/workflows/build.yml`) también compila y guarda `dist/` en el repositorio.
- `dist/` es generado: no lo edites a mano.
