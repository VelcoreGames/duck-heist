# Duck Heist — Master de rediseño chibi

Estado: iniciado para v0.5.0

## Norte visual

Duck Heist se rediseña de forma integral hacia una estética chibi pixel-art premium. El objetivo no es superponer sprites nuevos sobre el juego anterior, sino lograr que personajes, escenarios, props, FX, materiales, iluminación y UI parezcan parte del mismo universo visual.

La referencia visual se traduce a estas reglas:

- Proporciones chibi con cabeza dominante y cuerpo compacto.
- Vista top-down / 3-4 con silueta legible en cuatro direcciones.
- Outline oscuro consistente y controlado.
- Pixel art nítido, sin filtrado borroso.
- Sombras de contacto suaves y claras.
- Materiales diferenciados: mate, metal, oro, vidrio, emissive y superficies pulidas.
- Escenarios bancarios más ricos, con profundidad y lectura clara del espacio jugable.
- Animación expresiva con anticipación, impacto, recuperación, recoil y motion secundario.
- La legibilidad de combate siempre tiene prioridad sobre el detalle decorativo.

## Protagonista — estándar visual

El protagonista es el ancla del nuevo estilo y debe ser el asset de mayor calidad del juego.

Dirección artística:

- Pato chibi crema/amarillo.
- Pico y patas naranjas.
- Cabeza grande y silueta compacta.
- Pelo negro desordenado como parte fuerte de la identidad.
- Lentes cuadrados visibles incluso en movimiento.
- Arma claramente separada del cuerpo para permitir recoil, aim y profundidad.
- Sombras y rim light discretos para separarlo del entorno.

Proporción objetivo dentro del frame de 64x64:

- Cabeza: aproximadamente 52-58% de la altura visual.
- Cuerpo: aproximadamente 28-32%.
- Patas/pies: aproximadamente 10-12%.
- El contenido visual no debe llenar el frame; debe quedar margen para recoil, bob, squash/stretch y accesorios.
- La hitbox de gameplay no debe crecer con el sprite. La representación visual y la colisión permanecen desacopladas.

## Estándar de animación del protagonista

El estándar mínimo de producción es de 104 frames por dirección y 416 frames direccionales base para el protagonista, antes de contar capas de outfit, pelo, lentes, accesorios o armas.

| Estado | Frames por dirección | Loop | Objetivo |
| --- | ---: | --- | --- |
| Idle | 12 | Sí | Respiración, blink, microgestos |
| Walk | 16 | Sí | Paso fluido y buen peso |
| Shoot | 12 | No | Anticipación, muzzle, recoil, recuperación |
| Dash | 16 | No | Entrada, velocidad, trail, salida |
| Hurt | 8 | No | Impacto corto y legible |
| Down | 20 | No | Caída y asentamiento final |
| Interact | 12 | No | Acción clara con objetos/NPC |
| Celebrate | 20 | Sí | Recompensa, victoria y personalidad |

Las cuatro direcciones deben existir de forma explícita. No se acepta depender de mirroring para el protagonista final porque pelo, lentes, arma y accesorios pueden ser asimétricos.

## Capas del personaje

Orden lógico de producción:

1. body
2. outfit
3. face
4. hair
5. glasses
6. headwear
7. accessory
8. weapon

Todas las capas deben compartir pivote de pies y convención de frame. El arma permanece separada cuando convenga para recoil, profundidad y aim.

## Escenarios

Todos los pisos comparten lenguaje visual, pero no deben verse iguales.

### Piso 1
Banco corporativo limpio. Materiales sencillos, blanco/gris/azul, señalética mínima, mobiliario sobrio.

### Piso 2
Más cálido y poblado. Madera, plantas y más mobiliario bancario.

### Piso 3
Lujo evidente. Latón, mármol/piedra, superficies pulidas y mejor iluminación.

### Piso 4
Seguridad y tecnología. Metal, zonas restringidas, puertas reforzadas y bóveda.

### Piso 5
Riqueza y presión visual. Oro más presente, arquitectura más pesada y contraste alto.

### Piso 6
Clímax. Banco exageradamente premium, oro, bóveda monumental, brillo controlado y composición más dramática.

## START

La sala START debe seguir siendo limpia para gameplay. El rediseño puede enriquecer piso, paredes, iluminación y decoración adosada al perímetro, pero no debe volver a llenar el centro con muebles u obstáculos que contradigan la sala despejada ya aprobada.

## Props

Cada prop debe definir:

- ground anchor
- bounds visuales
- bounds de colisión si aplica
- altura para Y-sort
- material
- sombra
- capa frontal/trasera para oclusión
- estado destruible si aplica

Los props no deben verse como iconos planos. Deben tener volumen visual, una cara superior/visible coherente con la cámara y sombreado integrado al mismo mundo.

## Enemigos

### Comunes
48 frames por dirección como objetivo base: idle 8, walk 12, shoot 10, dash 10, hurt 6, down 12.

### Élites
76 frames por dirección: idle 10, walk 14, shoot 12, dash 14, hurt 8, down 18.

### Bosses
Mayor presupuesto de animación y telegraphs claros. El estándar inicial suma 132 frames por dirección entre estados principales.

Los enemigos deben conservar lectura inmediata de peligro. El chibi no debe volverlos visualmente ambiguos.

## NPCs

Los NPC importantes deben respirar, parpadear y reaccionar. Idle 12, interact 12 y celebrate 16 son el estándar inicial. Tenderos, personal del banco y personajes de evento pueden añadir gestos exclusivos.

## FX

Los FX se rediseñan con el mismo lenguaje:

- muzzle flash pixel-art
- humo
- polvo
- migas
- chispas
- monedas
- glints de oro
- impacto de bala
- dash trail
- flash de daño
- efectos de recompensa

Los FX deben reforzar acciones, no cubrir la silueta del jugador.

## UI

La UI se migra después del vertical slice. Debe usar formas compactas, iconos pixel-art coherentes, jerarquía clara y menos apariencia de interfaz web. HUD, minimapa, vida, monedas, menús, dificultad, colección y mejoras deben sentirse parte del mismo juego.

## Vertical slice v0.5.0

El primer corte jugable del nuevo estilo debe incluir:

1. Protagonista chibi completo funcionando con el renderer nuevo.
2. Idle, walk, shoot, dash, hurt y down conectados al gameplay real.
3. START visualmente migrada sin reintroducir obstáculos centrales.
4. Una sala NORMAL completamente migrada.
5. Un enemigo común chibi completo.
6. Set inicial de props bancarios.
7. FX de disparo, impacto y dash.
8. HUD mínimo armonizado.
9. Validación de rendimiento High/Ultra y fallback de backend.

No se considera terminado el vertical slice si solamente hay mockups o sprites fuera del juego.

## Orden de migración total

1. Protagonista.
2. Primera NORMAL + START.
3. Primer enemigo común.
4. Props base.
5. FX base.
6. Resto de enemigos comunes.
7. Tienda / NPCs.
8. Tesoro / objetos / evento / cafetería / recompensa.
9. Camioneta.
10. Subjefes.
11. Jefes.
12. Pisos completos y variantes ambientales.
13. UI total.
14. Polish, optimización y revisión de consistencia.

## Reglas de producción

- No mezclar arte viejo y nuevo más tiempo del estrictamente necesario para migrar.
- No modificar hitboxes solo para acomodar sprites.
- No reducir el conteo de frames del protagonista para ahorrar tiempo sin una razón técnica medible.
- Mantener pivote de pies estable entre todos los frames.
- Mantener sockets consistentes para arma, manos, cabeza y muzzle.
- Las animaciones deben incluir anticipación y recuperación cuando la acción lo necesite.
- Todo asset final debe validarse dentro del juego real, no únicamente en una hoja de sprites.
- WebGPU es preferente; WebGL2 debe conservar paridad visual razonable como fallback.

## Criterio de aprobación visual

Un asset está aprobado cuando:

- se reconoce a escala de gameplay;
- conserva silueta chibi clara;
- no vibra por pivotes inconsistentes;
- funciona en las cuatro direcciones necesarias;
- respeta Y-sort y oclusión;
- mantiene pixel-perfect;
- no genera halos de alpha;
- materiales y sombras son coherentes;
- la animación se siente fluida a velocidad real;
- su hitbox sigue siendo justa para gameplay.

## Siguiente hito

Producir e integrar el protagonista chibi definitivo como primer asset completo de v0.5.0. El atlas final debe pasar `validateChibiAnimationCoverage()` antes de considerarse listo para integración.
