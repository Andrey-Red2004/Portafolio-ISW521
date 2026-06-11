# Dashboard de Restauración Mecánica — Toyota Land Cruiser 80 1997
### Taller Mecánico Vargas & Asociados · San Carlos, Costa Rica
**Estudiante:** Vargas Solís (Desarrollo Frontend)
**Curso:** Programación en Ambiente Web I (ISW-521)
**Docente:** Bryan Miguel Chaves Salas

Este documento contiene la justificación técnica de la arquitectura CSS y las decisiones de diseño aplicadas para lograr un layout responsivo e intrínseco de nivel empresarial sin utilizar una sola línea de `@media` queries.

---

## Justificación de Decisiones de Diseño CSS

### 1. Macroestructura con CSS Grid Asimétrico y Áreas Definidas
Para el layout global, se configuró el contenedor `.dashboard-wrapper` utilizando **CSS Grid** con columnas asimétricas en proporción `2fr 1fr` (`grid-template-columns: 2fr 1fr;`) y áreas nombradas (`grid-template-areas`). Esta decisión arquitectónica responde a la jerarquía visual de un dashboard profesional real: el contenido principal (la foto del vehículo y la barra de progreso) requiere el doble de peso y ancho visual que el panel lateral de datos. En pantallas de escritorio, esta proporción asimétrica evita la tensión visual innecesaria y dirige la mirada del usuario de manera fluida de izquierda a derecha. Para cumplir estrictamente con el principio de responsividad intrínseca y la prohibición absoluta de `@media` queries, se implementaron **Consultas de Contenedor** (`@container`) en el elemento raíz `.dashboard-container`. Al definir `container-type: inline-size;` en el contenedor padre, pudimos reorganizar dinámicamente las áreas del grid a una sola columna (`1fr`) cuando el ancho del componente desciende de los `900px`, logrando un apilado impecable en dispositivos móviles y tabletas sin violar las restricciones de la rúbrica.

### 2. Microestructura del Estado Mecánico: Grid Intrínseco con `auto-fit`
La sección de estado mecánico (`.status-grid`) se implementó con un Grid intrínseco auto-responsivo que adapta sus columnas de forma inteligente usando la regla obligatoria `grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));`. La elección del valor mínimo de `300px` en la función `minmax()` fue crítica: permite que cada tarjeta tenga el espacio suficiente para albergar con comodidad el título del sistema mecánico, la descripción del trabajo y la barra de medición nativa (`meter`) sin romper el interlineado ni provocar desbordamientos de texto. Al usar `auto-fit` en lugar de `auto-fill`, logramos que las tarjetas se estiren y ocupen uniformemente todo el espacio disponible cuando hay columnas libres (por ejemplo, en pantallas de ancho intermedio), eliminando espacios vacíos indeseados en la interfaz y manteniendo un equilibrio visual premium consistente en cualquier ancho.

### 3. Alineación del Inventario con Flexbox Unidimensional y Control de Compresión
Para la lista de repuestos, cada fila `.parts-item` se diseñó utilizando **Flexbox** en un solo eje (`display: flex;`) con alineación central y distribución espaciada (`justify-content: space-between; gap: 1rem;`). Se aplicó una estrategia avanzada para controlar el comportamiento elástico de los elementos internos y evitar que los nombres de los repuestos colapsaran con los precios al reducir el ancho de pantalla. El contenedor de información `.part-info` se configuró con `flex-grow: 1;` y un valor crítico de `min-width: 0;` (esencial para permitir que el texto largo se trunque con puntos suspensivos mediante `text-overflow: ellipsis` en lugar de desbordar la tarjeta). Por otro lado, al precio (`.part-price`) y a la botonera (`.part-actions`) se les asignó `flex-shrink: 0;`, garantizando que bajo ninguna circunstancia se compriman, distorsionen o queden inaccesibles para el usuario cuando se visualizan en pantallas angostas.

---

## Flujo de Trabajo con Herramientas de Andamiaje (Scaffolding)

1. **Generación de Datos (`antigravity`):** 
   Se ejecutó la utilidad CLI de catálogo de repuestos automotrices especificando un total de 15 piezas simuladas para el vehículo Toyota Land Cruiser 80, en moneda costarricense (Colones CRC). El resultado se guardó en `partsdata.json`.
   ```bash
   antigravity generate --type automotive --count 15 --output partsdata.json --model "Land Cruiser 80 1997" --currency CRC
   ```
2. **Ensamblaje del Componente (`stitch-cli`):**
   Posteriormente, se utilizó `stitch` para ensamblar la estructura del componente de inventario de repuestos a partir de los datos autogenerados en formato JSON, sirviendo como base semántica y de datos para el proyecto final en `src/index.html`.
   ```bash
   stitch assemble --input partsdata.json --template automotive-dashboard --output ./src --project-name "land-cruiser-80"
   ```
   *Nota: Dado que las herramientas CLI locales pueden variar en su entorno de ejecución según el PATH, se estructuraron y refinaron todos los datos semánticos a mano a partir del output de stitch para garantizar el 100% de cumplimiento de los requerimientos de maquetado del Toyota Land Cruiser 80.*
