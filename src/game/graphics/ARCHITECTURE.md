# Duck Heist — Chibi Graphics Engine

Objetivo: migrar el juego a una estética chibi pixel-art como la referencia aprobada sin reescribir gameplay, IA, física, hitboxes, progresión ni generación procedural.

## Principios

1. **Pixel-perfect primero.** Sprites con `imageSmoothingEnabled = false`, pivotes enteros, cámara con pixel snap y presentación lógica independiente del escalado CSS.
2. **Gameplay separado del render.** El motor consume estado; no altera colisiones, IA, velocidad, daño ni reglas.
3. **Sprites chibi por capas.** Cuerpo, ropa, cara, cabello, lentes, accesorios y arma comparten animación y pivote.
4. **Profundidad real.** Actores y props que pueden ocluirse usan `RenderLayer.WORLD` y `sortY` en la base visual. Props siempre detrás o delante conservan sus capas específicas.
5. **Iluminación estilizada.** Luz radial, ambientación por piso, tint y vignette; las luces de mundo siguen correctamente cámara, zoom y shake.
6. **Migración incremental.** `processLegacyFrame` mantiene escenas antiguas mientras cada familia visual se reemplaza por renderables nuevos.
7. **Rendimiento medible.** Cada comando puede declarar bounds para culling y el renderer expone estadísticas por frame.

## Pipeline

`background -> floor -> floor fx -> props back -> shadows -> world y-sort -> props front -> projectiles -> fx -> lighting -> overlay`

`RenderLayer.WORLD` y `RenderLayer.ACTORS` comparten profundidad. Muebles, mostradores, columnas y personajes que deban cruzarse visualmente deben entrar en esa capa con `sortY` igual a la coordenada Y de su punto de apoyo, no a la parte superior del sprite.

Cada comando puede incluir:

- `sortY`
- `depthBias`
- `bounds` para culling
- `visible`
- `order` como desempate estable

## Cámara

`ChibiGraphicsEngine` expone `worldToScreen` y `screenToWorld`. La cámara soporta posición, zoom y shake. Con `pixelSnap` activo se redondea la traslación final para impedir shimmer subpíxel en sprites y tiles.

## Personajes chibi

Convención de atlas por capa:

`<layer>/<state>/<direction>/<frame>`

Ejemplos:

- `body/idle/down/0`
- `hair/walk/right/2`
- `glasses/shoot/up/1`
- `weapon/dash/right/0`

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
- right
- left opcional

Si no existe arte izquierdo, el motor reutiliza automáticamente la animación derecha en espejo. Esto reduce el coste del atlas sin impedir que un personaje especial tenga vistas izquierda/derecha únicas.

Cada frame puede definir `pivotX`, `pivotY` y sockets como `hand`, `muzzle`, `head` o `shadow`. Los sockets respetan mirroring, escala, bob y animación.

El hit-flash ya no se representa con una elipse aproximada: se compone sobre la silueta real del personaje en una superficie temporal para preservar pelo, lentes, arma y accesorios.

## Proporción visual objetivo

La referencia se interpreta como personajes de cabeza dominante, cuerpo compacto y silueta legible. La base recomendada es un sprite lógico de 32–48 px de alto, con hitbox independiente y bastante menor. El sprite puede sobresalir ampliamente de la hitbox sin modificar movimiento ni combate.

## Atlas y assets

`SpriteAtlas` valida al cargar:

- rectángulos positivos e enteros
- frames dentro de los límites de la imagen
- pivotes válidos
- sockets numéricos

`AtlasLibrary.preload` permite precargar familias completas antes de entrar a una run y evita cargas duplicadas concurrentes.

## Materiales de sala

`materials.ts` añade primitives pixel-art para construir la estética de la referencia sin depender de un único tileset rígido:

- pisos checker/grid/stone/metal/gold
- detalle determinista por seed
- panelería de pared
- alfombras con borde dorado
- molduras y bordes de latón

Cada piso usa `RoomMaterialTheme` con materiales, patrón, tamaño de mosaico, panelería, color/radio de luz y perfil de composición propio. La identidad visual no se limita a cambiar hue.

## Sombras

Sombras de contacto independientes de la hitbox. `drawBlobShadow` es la base para actores y objetos; el arte final puede reemplazarla por sombras específicas cuando lo requiera.

## Iluminación

El motor mantiene una superficie de escena y otra de luz. Soporta:

- oscuridad ambiente
- tint por piso
- luces radiales
- luces world-space o screen-space
- `screen` compositing
- vignette
- intensidad global de iluminación

Las luces se transforman con cámara/zoom y se descartan cuando quedan fuera de viewport.

## Rendimiento

El render queue se ordena in-place y evita clonar el arreglo cada frame. Los comandos con `bounds` fuera de cámara se descartan antes de dibujar. `frameStats()` devuelve `submitted`, `drawn`, `culled` y `lights` para poder perfilar salas pesadas durante la migración.

## Migración

Fase A — motor y compositor. **Lista.**
Fase B — protagonista chibi.
Fase C — NPCs y enemigos comunes.
Fase D — jefes/subjefes.
Fase E — props y arquitectura de salas.
Fase F — efectos, UI y pulido final.

El renderer estable actual no se reemplaza hasta que la fuente recupere paridad completa con el release público.
