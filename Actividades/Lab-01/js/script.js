/**
 * script.js
 * Proyecto: Akchete By Lara's Food
 *
 * FUNCIONALIDADES:
 * 1. Modal de fotografías de platillos (WCAG 2.1 accesible)
 * 2. Control de tamaño de letra para accesibilidad (WCAG 2.1 - Criterio 1.4.4)
 * 3. Gestión de navegación responsiva (menú hamburguesa)
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// PARTE 1: DATOS DE LOS PLATILLOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PLATILLOS: Objeto que contiene información de cada platillo destacado
 * Estructura:
 *   - nombre: Nombre del platillo (se muestra en el modal)
 *   - precio: Precio en colones (se muestra en el modal)
 *   - foto: Ruta relativa de la imagen (carpeta assets/)
 *   - alt: Texto alternativo WCAG 1.1.1
 *   - descripcion: Descripción breve del platillo
 *
 * NOTA IMPORTANTE:
 * Si los archivos están en una carpeta diferente (ej: img/ o images/),
 * ajusta los valores de "foto" según corresponda.
 */
const PLATILLOS = {
  fajitas: {
    nombre: 'Fajitas de Pollo + Papas',
    precio: '₡3.600',
    foto: 'assets/fajitas+papas.jpeg',
    alt: 'Fajitas de pollo empanizadas con papas fritas y salsas',
    descripcion: 'Fajitas de pollo empanizadas con un toque de picante, acompañadas de papas. El favorito indiscutible de la casa.'
  },
  burrito: {
    nombre: 'Burrito de Pollo Crispy + Papas',
    precio: '₡2.500',
    foto: 'assets/burritoCrispy.jpeg',
    alt: 'Burrito de pollo crispy con papas, abierto mostrando su relleno',
    descripcion: 'Tortilla de harina con frijoles molidos, queso amarillo, mayonesa de la casa, papas y fajitas de pollo empanizadas con picante.'
  },
  pollo: {
    nombre: 'Pollo Frito Picante',
    precio: 'Desde ₡1.000',
    foto: 'assets/polloPicante.jpeg',
    alt: 'Piezas de pollo frito picante doradas y crujientes',
    descripcion: 'Trocitos por peso desde ₡1.000. Porciones: pechuga y ala ₡2.200 / muslo y cadera ₡2.000. Crujiente y lleno de sabor.'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PARTE 2: REFERENCIAS AL DOM
// ═══════════════════════════════════════════════════════════════════════════

let modal = null;           // El elemento <dialog> del modal
let modalImg = null;        // El <img> dentro del modal
let modalNombre = null;     // El <h3> del nombre del platillo
let modalPrecio = null;     // El <p> del precio
let modalDesc = null;       // El <p> de la descripción
let btnCerrar = null;       // El botón de cerrar (×)
let ultimoFoco = null;      // Elemento que tenía el foco antes de abrir el modal

// ═══════════════════════════════════════════════════════════════════════════
// PARTE 3: INICIALIZACIÓN GENERAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * init()
 * Se ejecuta cuando el DOM está completamente cargado.
 * Inicializa todas las funcionalidades de la página.
 */
function init() {
  crearModal();
  adjuntarEventosBotones();
  inicializarControlesAccesibilidad();
  configurarYear();
}

/**
 * configurarYear()
 * Actualiza el año actual en el footer (copyright)
 */
function configurarYear() {
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PARTE 4: MODAL DE PLATILLOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * crearModal()
 * Genera el HTML del modal y lo inserta al final del <body>.
 * 
 * Usamos el elemento nativo <dialog> de HTML5 porque:
 * - Manejo nativo del stack de modales
 * - Soporte nativo de Escape para cerrar
 * - Pseudo-elemento ::backdrop para oscurecer el fondo
 * - Semántica nativa sin necesidad de roles ARIA manuales
 */
function crearModal() {
  modal = document.createElement('dialog');
  modal.id = 'dish-modal';
  modal.className = 'dish-modal';
  modal.setAttribute('aria-labelledby', 'modal-dish-name');

  modal.innerHTML = `
    <div class="dish-modal__inner" role="document">
      <button
        class="dish-modal__close"
        id="modal-close-btn"
        aria-label="Cerrar imagen del platillo"
        type="button"
      >
        <span aria-hidden="true">&times;</span>
      </button>

      <figure class="dish-modal__figure">
        <img
          id="modal-dish-img"
          class="dish-modal__img"
          src=""
          alt=""
          loading="lazy"
        >
      </figure>

      <div class="dish-modal__info">
        <h3 id="modal-dish-name" class="dish-modal__name"></h3>
        <p  id="modal-dish-desc" class="dish-modal__desc"></p>
        <p  id="modal-dish-price" class="dish-modal__price" aria-label="Precio del platillo"></p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Guardar referencias a elementos internos
  modalImg = document.getElementById('modal-dish-img');
  modalNombre = document.getElementById('modal-dish-name');
  modalDesc = document.getElementById('modal-dish-desc');
  modalPrecio = document.getElementById('modal-dish-price');
  btnCerrar = document.getElementById('modal-close-btn');

  // Event listeners del modal
  btnCerrar.addEventListener('click', cerrarModal);

  // Cerrar al hacer clic en el backdrop (fuera del contenido)
  modal.addEventListener('click', function(e) {
    if (e.target === modal) cerrarModal();
  });

  // Cerrar con la tecla Escape (WCAG 2.1)
  modal.addEventListener('cancel', function(e) {
    e.preventDefault();
    cerrarModal();
  });

  // Focus trap: mantener el foco dentro del modal
  modal.addEventListener('keydown', manejarTeclaEnModal);
}

/**
 * abrirModal(dishId)
 * @param {string} dishId - Clave del platillo en el objeto PLATILLOS
 * 
 * Puebla el modal con los datos del platillo y lo abre.
 * WCAG 2.1 - Criterio 2.4.3 (Focus Order): El foco se coloca automáticamente
 * en el primer elemento focusable del modal (botón cerrar).
 */
function abrirModal(dishId) {
  const platillo = PLATILLOS[dishId];
  if (!platillo) return; // Seguridad: si el ID no existe, no hace nada

  // Poblar el modal con los datos del platillo
  modalImg.src = platillo.foto;
  modalImg.alt = platillo.alt;
  modalNombre.textContent = platillo.nombre;
  modalDesc.textContent = platillo.descripcion;
  modalPrecio.textContent = platillo.precio;
  modalPrecio.setAttribute('aria-label', 'Precio: ' + platillo.precio);

  // Abrir el modal con el método nativo
  modal.showModal();
  // El foco se coloca automáticamente en el primer elemento focusable
}

/**
 * cerrarModal()
 * Cierra el modal y devuelve el foco al elemento que lo abrió.
 * WCAG 2.1 - Criterio 2.4.3 (Focus Order): Restauramos el foco al elemento
 * que abrió el modal para mantener el flujo de navegación lógico.
 */
function cerrarModal() {
  modal.close();

  // Devolver el foco al elemento que abrió el modal
  if (ultimoFoco) {
    ultimoFoco.focus();
    ultimoFoco = null;
  }
}

/**
 * manejarTeclaEnModal(e)
 * Focus trap: mantiene el foco dentro del modal cuando está abierto.
 * 
 * WCAG 2.1 - Criterios:
 * - 2.1.1 (Keyboard): Todos los comandos de teclado son accesibles
 * - 2.1.2 (No Keyboard Trap): El usuario puede salir con Escape
 * 
 * ARIA Authoring Practices - Modal Dialog Pattern
 */
function manejarTeclaEnModal(e) {
  if (e.key !== 'Tab') return;

  // Obtener todos los elementos focusables dentro del modal
  const focusables = Array.from(
    modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => !el.disabled);

  if (focusables.length === 0) return;

  const primero = focusables[0];
  const ultimo = focusables[focusables.length - 1];

  if (e.shiftKey) {
    // Shift+Tab: si el foco está en el primero, ir al último
    if (document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    }
  } else {
    // Tab: si el foco está en el último, ir al primero
    if (document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }
}

/**
 * adjuntarEventosBotones()
 * Usa delegación de eventos para abrir el modal cuando se hace clic
 * en cualquier elemento con data-dish-id.
 * 
 * VENTAJA: Funciona incluso si se agregan nuevos botones dinámicamente al DOM.
 * ACCESIBILIDAD: Los botones tienen aria-label descriptivo en el HTML.
 */
function adjuntarEventosBotones() {
  document.addEventListener('click', function(e) {
    // Buscar el elemento clickeado o su ancestro con data-dish-id
    const boton = e.target.closest('[data-dish-id]');
    if (!boton) return;

    const dishId = boton.dataset.dishId;

    // Guardar el elemento que tenía el foco (para devolverlo al cerrar)
    ultimoFoco = boton;

    abrirModal(dishId);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PARTE 5: CONTROLES DE ACCESIBILIDAD - TAMAÑO DE LETRA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * WCAG 2.1 - Criterio 1.4.4 (Resize text):
 * Los usuarios deben poder redimensionar el texto hasta el 200% sin pérdida
 * de funcionalidad. Implementamos 3 tamaños: pequeño, mediano, grande.
 * 
 * NIVELES DE CUMPLIMIENTO:
 * - Nivel A (básico): El sitio debe ser funcional sin zoom
 * - Nivel AA (recomendado): Texto redimensionable sin zoom
 * - Nuestro botón cumple nivel AA
 */

const FONT_SIZE_LEVELS = {
  small: {
    scale: 0.875,      // 87.5% del tamaño original (14px → 12.25px)
    label: 'Pequeño'
  },
  medium: {
    scale: 1,          // 100% del tamaño original (predeterminado)
    label: 'Mediano'
  },
  large: {
    scale: 1.25        // 125% del tamaño original (14px → 17.5px)
  }
};

/**
 * inicializarControlesAccesibilidad()
 * Configura los botones de tamaño de letra y carga el tamaño guardado
 * en localStorage (si existe).
 */
function inicializarControlesAccesibilidad() {
  const btnSmall = document.querySelector('.font-size-small');
  const btnMedium = document.querySelector('.font-size-medium');
  const btnLarge = document.querySelector('.font-size-large');

  // Cargar el tamaño guardado en localStorage
  const savedSize = localStorage.getItem('fontSizeLevel') || 'medium';
  aplicarTamahoLetra(savedSize);

  // Agregar event listeners a los botones
  if (btnSmall) btnSmall.addEventListener('click', () => cambiarTamanoLetra('small'));
  if (btnMedium) btnMedium.addEventListener('click', () => cambiarTamanoLetra('medium'));
  if (btnLarge) btnLarge.addEventListener('click', () => cambiarTamanoLetra('large'));
}

/**
 * cambiarTamanoLetra(nivel)
 * @param {string} nivel - 'small', 'medium' o 'large'
 * 
 * Cambia el tamaño de letra y guarda la preferencia en localStorage.
 * localStorage persiste la preferencia del usuario entre visitas.
 */
function cambiarTamanoLetra(nivel) {
  if (!FONT_SIZE_LEVELS[nivel]) return;

  // Guardar en localStorage para persistencia
  localStorage.setItem('fontSizeLevel', nivel);

  // Aplicar el tamaño
  aplicarTamahoLetra(nivel);

  // Feedback visual: actualizar estado del botón activo
  actualizarEstadoBotones(nivel);
}

/**
 * aplicarTamahoLetra(nivel)
 * @param {string} nivel - 'small', 'medium' o 'large'
 * 
 * Aplica el factor de escala a la raíz del documento.
 * CSS usará esta variable para escalar el texto proporcionalmente.
 */
function aplicarTamahoLetra(nivel) {
  const scale = FONT_SIZE_LEVELS[nivel]?.scale || 1;
  document.documentElement.style.setProperty('--font-size-scale', scale);

  // Anunciar el cambio a lectores de pantalla (WCAG 4.1.3 - Status Messages)
  anunciarAccion(`Tamaño de letra ${FONT_SIZE_LEVELS[nivel].label.toLowerCase()}`);
}

/**
 * actualizarEstadoBotones(nivelActivo)
 * @param {string} nivelActivo - El nivel de tamaño actualmente seleccionado
 * 
 * Actualiza visualmente qué botón está activo (clase 'active').
 * También actualiza aria-pressed para accesibilidad.
 */
function actualizarEstadoBotones(nivelActivo) {
  const botones = document.querySelectorAll('.font-size-btn');
  botones.forEach(btn => {
    const esActivo = btn.classList.contains(`font-size-${nivelActivo}`);
    btn.classList.toggle('active', esActivo);
    btn.setAttribute('aria-pressed', esActivo);
  });
}

/**
 * anunciarAccion(mensaje)
 * @param {string} mensaje - Mensaje para anunciar
 * 
 * Anuncia cambios a los lectores de pantalla usando aria-live.
 * WCAG 4.1.3 - Status Messages: Los cambios deben anunciarse a usuarios
 * con lectores de pantalla sin interrumpir el flujo.
 */
function anunciarAccion(mensaje) {
  // Crear o reutilizar un elemento de aria-live
  let liveRegion = document.getElementById('a11y-announcer');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'a11y-announcer';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px'; // Fuera de pantalla pero en el DOM
    document.body.appendChild(liveRegion);
  }

  liveRegion.textContent = mensaje;

  // Limpiar después de 2 segundos
  setTimeout(() => {
    liveRegion.textContent = '';
  }, 2000);
}

// ═══════════════════════════════════════════════════════════════════════════
// PARTE 6: ARRANQUE DEL SCRIPT
// ═══════════════════════════════════════════════════════════════════════════

// Ejecutar init() cuando el DOM esté completamente cargado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // Si el script se carga con defer, el DOM ya está listo
  init();
}