// ==========================================
// TIENDAS.JS - Gestión de Tiendas (Orquestador Principal)
// ==========================================
// Este archivo solo inicializa los modales.
// Cada modal tiene su propia lógica en:
// - modals/crea.js
// - modals/ver.js
// - modals/edita.js
// - modals/elimina.js
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar todos los modales
    if (typeof inicializarModalCrear === 'function') {
        inicializarModalCrear();
    }
    if (typeof inicializarModalVer === 'function') {
        inicializarModalVer();
    }
    if (typeof inicializarModalEditar === 'function') {
        inicializarModalEditar();
    }
    if (typeof inicializarModalEliminar === 'function') {
        inicializarModalEliminar();
    }
});

