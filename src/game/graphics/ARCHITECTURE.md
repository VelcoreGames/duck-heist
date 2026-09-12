# Duck Heist — Chibi Graphics Engine

Objetivo: migrar el juego a una estética chibi pixel-art como la referencia aprobada sin reescribir gameplay, IA, física, hitboxes, progresión ni generación procedural.

## Principios

1. **Pixel-perfect primero.** Toda imagen de sprites usa `imageSmoothingEnabled = false`, pivotes enteros y snapping de posición al píxel lógico.
2. **Gameplay separado del render.** El motor gráfico consume estado; no altera colisiones, IA, velocidad, daño ni reglas.
3. **Sprites chibi por capas.** Cuerpo, ropa, cara, cabello, lentes, accesorios y arma pueden compartir la misma animación y pivote.
4. **Y-sort real.** Los elementos se ordenan por capa y por `sortY` para permitir pasar delante/detrás de muebles y personajes.
5. **Iluminación estilizada.** El compositor soporta luz radial, ambientación por piso, tint y vignette sin convertir el juego en un renderer realista.
6. **Migración incremental.** `processLegacyFrame` permite mantener escenas antiguas mientras cada familia visual se reemplaza por renderables nuevos.

## Pipeline

`background -> floor -> floor fx -> props back -> shadows -> actors -> props front -> projectiles -> fx -> lighting -> overlay`

Cada comando tiene capa, `sortY`, orden secundario y función de dibujo. Esto evita que el orden de llamadas en `render.ts` determine accidentalmente la profundidad visual.

## Personajes chibi

Convención de atlas por capa:

`<layer>/<state>/<direction>/<frame>`

Ejemplos:

- `body/idle/down/0`
- `hair/walk/left/2`
- `glasses/shoot/right/1`
- `weapon/dash/up/0`

Estados base:

- idle
- walk
- shoot
- dash
- hurt
- down

Direcciones base:

- down
- up
- left
- right

Cada frame puede definir `pivotX`, `pivotY` y sockets como `hand`, `muzzle`, `head` o `shadow`.

## Proporción visual objetivo

La referencia se interpreta como personajes de cabeza dominante, cuerpo compacto y silueta legible. La base recomendada es un sprite lógico aproximado de 28–40 px de alto con hitbox independiente y más pequeña. El sprite puede sobresalir ampliamente de la hitbox sin modificar movimiento ni combate.

## Escenario

Cada piso tendrá un `RoomMaterialTheme` propio. El renderer no debe limitarse a cambiar hue; debe permitir materiales diferentes: mosaico, metal, madera, muros, molduras, alfombras, bóvedas, oro y elementos especiales.

La profundidad se divide entre props traseros y delanteros. Un escritorio, mostrador, sofá, planta o columna puede tener una zona de base para colisión y otra zona visual que ocluye parcialmente al personaje.

## Sombras

Sombras de contacto independientes de la hitbox. El motor incorpora `drawBlobShadow` como base para actores y objetos. Los sprites finales pueden usar sombras más específicas si lo requieren.

## Iluminación

`ChibiGraphicsEngine` mantiene una superficie de escena y otra de luz. Soporta:

- oscuridad ambiente
- tint por piso
- luces radiales
- screen compositing
- vignette

La iluminación se utiliza como capa estética y nunca modifica el estado lógico.

## Migración

Fase A — motor y compositor.
Fase B — protagonista chibi.
Fase C — NPCs y enemigos comunes.
Fase D — jefes/subjefes.
Fase E — props y arquitectura de salas.
Fase F — efectos, UI y pulido final.

El renderer estable actual no se reemplaza hasta que la fuente recupere paridad completa con el release público.
