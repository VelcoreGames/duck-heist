# Duck Heist — Art Bible v1

## Dirección oficial
Duck Heist usa un lenguaje visual **chibi premium pixel art** con tono **cute noir**: patos adorables con personalidad, materiales legibles, ambientes de banco/atraco y contraste suficiente para que gameplay, enemigos, proyectiles, pickups, puertas e interactuables sigan siendo claros.

## Referencia maestra
**Macro Pato** es el golden sample para personajes: silueta compacta, cabeza visualmente dominante, plumaje con volumen, outline oscuro controlado, sombras suaves, lectura fuerte a tamaño pequeño y rasgos memorables.

## Proporciones de personaje
- Cabeza/rostro/cabello: ~48% del volumen visual.
- Cuerpo: ~39%.
- Patas: ~13%.
- Hitboxes y estadísticas de gameplay no cambian por razones artísticas.

## Render y pixel art
- Nearest-neighbour / `imageSmoothingEnabled=false`.
- Outline exterior oscuro y limpio; detalles internos más suaves.
- Entre 2 y 4 tonos por material principal.
- Sombras diseñadas para volumen, no para ruido.
- Brillos contenidos en cristal, metal, cabello y superficies pulidas.

## Paleta base
- Ink: `#11151c`
- Ink soft: `#27313a`
- Cream: `#f4e7c5`
- Cream mid: `#dfc28d`
- Cream shade: `#bd9d6a`
- Beak: `#e99532`
- Gold: `#f4d03f`
- Security blue: `#5f8fae`
- Danger: `#d95555`
- Noir: `#091018`

Los seis pisos pueden tener identidades cromáticas distintas, pero deben respetar la misma familia de contraste, outline, sombreado y materiales.

## Mundo
- Fondos más detallados, pero nunca más importantes que el jugador o los enemigos.
- Luz cálida ligera en zonas de interés y bordes más fríos/oscuros para conservar el tono de atraco.
- Puertas, salidas y especiales deben ser inequívocos.
- La profundidad visual no puede desalinearse con colisiones.

## Props
- Siluetas claras, perspectiva coherente y sombra de base.
- Muebles altos pueden ocluir parcialmente al jugador si ya existe lógica de profundidad.
- Interactuables deben destacar sin depender únicamente de texto.

## Personajes y enemigos
- Todos comparten calidad de acabado, outline y volumen.
- La silueta debe comunicar identidad y rol antes que los detalles finos.
- Jefes y subjefes conservan estilo chibi, pero con mayor masa visual y contraste.

## UI y VFX
- UI pixel nítida y coherente con el mundo.
- VFX legibles, controlados y no hiperrealistas.
- Efectos nunca deben ocultar amenazas o navegación importante.

## Reglas de validación
Todo asset nuevo debe pasar estas preguntas:
1. ¿Se siente chibi premium?
2. ¿Pertenece al mismo universo que Macro Pato?
3. ¿Se lee claramente a escala de juego?
4. ¿Mantiene el tono cute noir?
5. ¿Preserva hitboxes y gameplay salvo cambio explícito?
6. ¿Tiene suficiente contraste con el fondo?
7. ¿Evita ruido visual innecesario?

## Regla maestra
**Primero se migra la capa visual; el gameplay se conserva salvo que un cambio funcional sea solicitado y validado de forma independiente.**
