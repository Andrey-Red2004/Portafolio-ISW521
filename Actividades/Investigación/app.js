// VALIDACIÓN DE FORMULARIO: Bootstrap CSS + HTML5 + Mínimo JS
const formulario = document.getElementById('formulario');

formulario.addEventListener('submit', function(event) {
    event.preventDefault();
    
    if (!formulario.checkValidity()) {
        // Si hay errores, Bootstrap muestra estilos con esta clase
        formulario.classList.add('was-validated');
        return;
    }
    
    // Si es válido, mostrar toast
    mostrarToast('¡Formulario enviado correctamente!', 'success');
    formulario.reset();
    formulario.classList.remove('was-validated');
});

// TOAST: Usar componente Toast de Bootstrap
const btnToast = document.getElementById('btnToast');

btnToast.addEventListener('click', function() {
    mostrarToast('Este es un Toast de Bootstrap', 'info');
});

function mostrarToast(mensaje, tipo) {
    const toastHTML = `
        <div class="toast show" role="alert">
            <div class="toast-header">
                <i class="bi bi-info-circle-fill text-${tipo} me-2"></i>
                <strong class="me-auto">Notificación</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${mensaje}
            </div>
        </div>
    `;
    
    const toastContainer = document.getElementById('toastContainer');
    toastContainer.innerHTML = toastHTML;
    
    const toastElement = toastContainer.querySelector('.toast');
    const bsToast = new bootstrap.Toast(toastElement);
    bsToast.show();
}