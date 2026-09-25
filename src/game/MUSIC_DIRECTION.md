# Duck Heist — Dirección musical

Este documento fija la intención emocional y las reglas de implementación del score procedural.

## Principios

- Cada tipo de zona debe reconocerse por oído antes de mirar el HUD.
- Una zona distinta cambia lenguaje musical completo: pulso, armonía, timbre, densidad y fraseo.
- Dos salas consecutivas del mismo tipo comparten continuidad; no reinician la pieza.
- Las transiciones entre identidades distintas son crossfades solapados, sin huecos de silencio.
- La pausa es un estado musical propio y al reanudar se restaura exactamente la música de la sala.
- Mini/sub/jefes derivan su música de familia, rol y fase.
- Se evita que ruido filtrado o la misma batería sean la firma dominante de múltiples zonas.

## Identidades

| Estado / sala | Emoción | Lenguaje musical |
| --- | --- | --- |
| Menú | Planear el golpe; confianza traviesa | Bajo sincopado, motivo principal corto, armonía elegante |
| Pausa | Tiempo suspendido | Drones suaves, reloj melódico mínimo, sin beat de combate |
| Entrada | Infiltración / anticipación | Ostinato ascendente, graves contenidos, tensión creciente |
| Combate | El golpe está en marcha | Bajo sincopado, percusión irregular, llamada tipo sirena |
| Atraco sin fin | Persecución sostenida | Ostinato continuo, groove insistente, poca resolución |
| Tienda | Negociación clandestina | Lounge oscuro, bajo caminante, plucks discretos |
| Camioneta | Arsenal improvisado / garage | Pulsos industriales, graves mecánicos, golpes secos |
| Café | Refugio / respiración | Acordes cálidos, campanas suaves, ausencia de agresión |
| Evento | Incertidumbre narrativa | Silencios, drones, motivos incompletos |
| Desafío | Presión / contrarreloj | Pulso rígido, figuras cuadradas, métrica clara |
| Objetos | Curiosidad / descubrimiento | Frases ascendentes, timbres ligeros |
| Elección | Duda / comparación | Llamada y respuesta entre dos alturas |
| Tesoro | Recompensa / alivio | Armonía abierta, campanas, resolución ceremonial |
| Secreta | Misterio / bóveda | Graves amplios, campanas aisladas, espacio |
| Minijefe | Amenaza localizada | Familia + rol con densidad moderada |
| Subjefe | Escalada | Familia + rol con mayor peso y fase |
| Jefe | Confrontación principal | Familia + rol + fases, máxima identidad |

## Familias de jefes

- command: marcial y disciplinada.
- finance: fría, calculada, campanas y figuras medidas.
- wealth: brillante, ceremonial y ostentosa.
- bakery: orgánica, extraña y ligeramente cómica.
- tech: mecánica, pulsos cuadrados y patrones digitales.
- vault: grave, espacial y monumental.
- riot: frontal, pesada y percutiva.
- war: militar, agresiva y rítmica.

## Transiciones

- Misma identidad: continuidad absoluta.
- Zona distinta: crossfade solapado.
- Pausa: entra inmediatamente a su cama musical; al reanudar se restaura la identidad de la sala.
- Cambio de fase de jefe: nueva variante musical con mayor tempo/densidad.
- Victoria de encuentro: resolución hacia recompensa o estado de exploración.
