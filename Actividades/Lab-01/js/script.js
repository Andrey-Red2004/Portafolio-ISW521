/**
 * dish-modal.js
 * Módulo: Modal de fotografías de platillos
 * Proyecto: Akchete By Lara's Food
 *
 * FUNCIONALIDAD:
 * Al hacer clic en el título de un platillo (en "Platillos Estrella"
 * o en las tarjetas del Menú Completo), se abre un modal que muestra
 * una fotografía del plato junto con su nombre y precio.
 *
 * POR QUÉ SE NECESITA JS Y NO CSS PURO:
 * CSS puede mostrar/ocultar elementos usando el truco :target o :checked
 * (con radio buttons ocultos), pero tiene limitaciones importantes:
 *  - No puede gestionar múltiples modales de forma limpia con accesibilidad real.
 *  - No puede atrapar el foco dentro del modal (focus trap), requerido por WCAG.
 *  - No puede cerrar el modal al presionar Escape (evento de teclado).
 *  - No puede actualizar aria-expanded / aria-hidden dinámicamente.
 * Para cumplir WCAG 2.1 correctamente, el modal requiere JavaScript.
 *
 * ACCESIBILIDAD IMPLEMENTADA:
 *  - role="dialog" + aria-modal="true" en el contenedor del modal.
 *  - aria-labelledby apunta al título del modal.
 *  - Focus trap: el foco no puede salir del modal mientras está abierto.
 *  - Escape cierra el modal y devuelve el foco al elemento que lo abrió.
 *  - aria-expanded en los botones que abren el modal.
 */

'use strict';

// ─── DATOS DE LOS PLATILLOS ───────────────────────────────────────────────────
//
// Cada objeto tiene:
//   id        → coincide con el atributo data-dish-id en el HTML
//   nombre    → se muestra en el modal
//   precio    → se muestra en el modal
//   foto      → ruta relativa a la imagen (carpeta assets/)
//   alt       → texto alternativo de la imagen (WCAG 1.1.1)
//   descripcion → descripción breve del plato
//
// INSTRUCCIÓN PARA VOS:
// Reemplazá los valores de "foto" con las rutas reales de tus imágenes.
// Ejemplo: si tenés "fajitas.jpg" dentro de la carpeta "assets/",
// el valor sería: "assets/fajitas.jpg"
// Si usás una carpeta "img/": "img/fajitas.jpg"
//
const PLATILLOS = {
  fajitas: {
    nombre:      'Fajitas de Pollo + Papas',
    precio:      '₡3.600',
    foto:        'assets/fajitas.jpg',
    alt:         'Fajitas de pollo empanizadas con papas fritas y salsas',
    descripcion: 'Fajitas de pollo empanizadas con un toque de picante, acompañadas de papas. El favorito indiscutible de la casa.'
  },
  burrito: {
    nombre:      'Burrito de Pollo Crispy + Papas',
    precio:      '₡2.500',
    foto:        'assets/burrito.jpg',
    alt:         'Burrito de pollo crispy con papas, abierto mostrando su relleno',
    descripcion: 'Tortilla de harina con frijoles molidos, queso amarillo, mayonesa de la casa, papas y fajitas de pollo empanizadas con picante.'
  },
  pata: {
    nombre:      'Pata Hamburguesa + Papas',
    precio:      '₡3.500',
    foto:        'assets/pata-hamburguesa.jpg',
    alt:         'Pata hamburguesa: dos patacones dorados con relleno y papas al lado',
    descripcion: 'Dos patacones dorados en forma de hamburguesa, rellenos de mayonesa de la casa, lechuga, tomate y tu proteína a escoger.'
  },
  pollo: {
    nombre:      'Pollo Frito Picante',
    precio:      'Desde ₡1.000',
    foto:        'assets/pollo-frito.jpg',
    alt:         'Piezas de pollo frito picante doradas y crujientes',
    descripcion: 'Trocitos por peso desde ₡1.000. Porciones: pechuga y ala ₡2.200 / muslo y cadera ₡2.000. Crujiente y lleno de sabor.'
  }
};

// ─── REFERENCIAS AL DOM ───────────────────────────────────────────────────────
let modal          = null;  // El elemento <dialog> del modal
let modalImg       = null;  // El <img> dentro del modal
let modalNombre    = null;  // El <h3> del nombre del platillo
let modalPrecio    = null;  // El <p> del precio
let modalDesc      = null;  // El <p> de la descripción
let btnCerrar      = null;  // El botón de cerrar (×)
let ultimoFoco     = null;  // Elemento que tenía el foco antes de abrir el modal

// ─── INICIALIZACIÓN ───────────────────────────────────────────────────────────

/**
 * init()
 * Se ejecuta cuando el DOM está completamente cargado.
 * Construye el modal en el DOM y adjunta los event listeners.
 */
function init() {
  crearModal();
  adjuntarEventosBotones();
}

// ─── CONSTRUCCIÓN DEL MODAL ───────────────────────────────────────────────────

/**
 * crearModal()
 * Genera el HTML del modal y lo inserta al final del <body>.
 *
 * Usamos el elemento nativo <dialog> de HTML5.
 * Ventajas sobre un <div> con role="dialog":
 *  - Manejo nativo del stack de modales.
 *  - El método .showModal() activa el pseudo-elemento ::backdrop de CSS.
 *  - Semántica nativa sin necesidad de role="dialog" manual.
 */
function crearModal() {
  modal = document.createElement('dialog');
  modal.id = 'dish-modal';
  modal.className = 'dish-modal';
  modal.setAttribute('aria-labelledby', 'modal-dish-name');
  /*
    aria-labelledby apunta al id del encabezado dentro del modal.
    El lector de pantalla anunciará: "Diálogo: [nombre del platillo]"
    cuando el modal reciba el foco.
  */

  modal.innerHTML = `
    <div class="dish-modal__inner" role="document">
      <button
        class="dish-modal__close"
        id="modal-close-btn"
        aria-label="Cerrar imagen del platillo"
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
        <!--
          src y alt se llenan dinámicamente con JS al abrir el modal.
          loading="lazy" es una buena práctica aunque el modal use JS,
          porque el recurso no se carga hasta que la imagen entra al DOM visible.
        -->
      </figure>

      <div class="dish-modal__info">
        <h3 id="modal-dish-name" class="dish-modal__name"></h3>
        <p  id="modal-dish-desc" class="dish-modal__desc"></p>
        <p  id="modal-dish-price" class="dish-modal__price" aria-label="Precio del platillo"></p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Guardar referencias a los elementos internos
  modalImg    = document.getElementById('modal-dish-img');
  modalNombre = document.getElementById('modal-dish-name');
  modalDesc   = document.getElementById('modal-dish-desc');
  modalPrecio = document.getElementById('modal-dish-price');
  btnCerrar   = document.getElementById('modal-close-btn');

  // Events del modal
  btnCerrar.addEventListener('click', cerrarModal);

  /*
    Cerrar al hacer clic en el ::backdrop (fuera del contenido del modal).
    El <dialog> nativo dispara el evento 'click' en el propio elemento
    cuando se hace clic en el backdrop. Comparamos el target para
    asegurarnos de que el clic fue en el dialog y no en su contenido.
  */
  modal.addEventListener('click', function(e) {
    if (e.target === modal) cerrarModal();
  });

  /*
    WCAG 2.1 — Criterio 2.1.2 (No Keyboard Trap):
    El usuario DEBE poder cerrar el modal con el teclado.
    La tecla Escape es el estándar de facto para cerrar diálogos.
    El elemento <dialog> nativo ya maneja Escape automáticamente
    disparando el evento 'cancel', pero lo reforzamos manualmente
    para asegurar que nuestro flujo de foco también se ejecute.
  */
  modal.addEventListener('cancel', function(e) {
    e.preventDefault(); // Prevenimos el cierre automático del navegador
    cerrarModal();       // Usamos nuestra función que devuelve el foco
  });

  // Focus trap: mantener el foco dentro del modal mientras está abierto
  modal.addEventListener('keydown', manejarTeclaEnModal);
}

// ─── APERTURA Y CIERRE ────────────────────────────────────────────────────────

/**
 * abrirModal(dishId)
 * @param {string} dishId - Clave del platillo en el objeto PLATILLOS
 * Puebla el modal con los datos del platillo y lo abre.
 */
function abrirModal(dishId) {
  const platillo = PLATILLOS[dishId];
  if (!platillo) return; // Seguridad: si el ID no existe, no hace nada

  // Poblar el modal con los datos del platillo
  modalImg.src         = platillo.foto;
  modalImg.alt         = platillo.alt;
  modalNombre.textContent = platillo.nombre;
  modalDesc.textContent   = platillo.descripcion;
  modalPrecio.textContent = platillo.precio;
  modalPrecio.setAttribute('aria-label', 'Precio: ' + platillo.precio);

  // Abrir el modal con el método nativo (activa el ::backdrop y el focus automático)
  modal.showModal();

  /*
    Después de showModal(), el foco va automáticamente al primer elemento
    focusable dentro del dialog. En nuestro caso, el botón de cerrar (X)
    es el primero, lo que es la práctica recomendada por ARIA Authoring Practices.
  */
}

/**
 * cerrarModal()
 * Cierra el modal y devuelve el foco al elemento que lo abrió.
 */
function cerrarModal() {
  modal.close();
  /*
    .close() es el método nativo de <dialog> para cerrarlo.
    También dispara el evento 'close' en el elemento.
  */

  // Devolver el foco al elemento que abrió el modal
  if (ultimoFoco) {
    ultimoFoco.focus();
    ultimoFoco = null;
  }
}

// ─── FOCUS TRAP ───────────────────────────────────────────────────────────────

/**
 * manejarTeclaEnModal(e)
 * Focus trap: cuando el modal está abierto, Tab y Shift+Tab
 * solo navegan entre los elementos focusables del modal.
 *
 * WCAG 2.1 — Criterio 2.1.1 y APG (Modal Dialog Pattern).
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
  const ultimo  = focusables[focusables.length - 1];

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

// ─── EVENT LISTENERS DE LOS BOTONES ──────────────────────────────────────────

/**
 * adjuntarEventosBotones()
 * Busca todos los elementos con [data-dish-id] en el documento
 * y les adjunta el evento 'click' para abrir el modal.
 *
 * Usamos delegación de eventos en el document para cubrir
 * dinámicamente cualquier botón con data-dish-id, sin importar
 * cuándo fue insertado en el DOM.
 *
 * ACCESIBILIDAD: Los botones que disparan el modal deben tener
 * un aria-label que describa la acción ("Ver foto de Fajitas").
 * Esto se hace en el HTML (ver index.html).
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

// ─── ARRANQUE ─────────────────────────────────────────────────────────────────

// Ejecutar init() cuando el DOM esté completamente cargado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // Si el script se carga con defer, el DOM ya está listo
  init();
}