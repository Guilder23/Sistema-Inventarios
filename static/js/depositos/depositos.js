// ==========================================
// DEPOSITOS.JS - Gestión de Depósitos (Orquestador Principal)
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

    // Inicializar funcionalidad de filtros y búsqueda
    inicializarFiltros();
});

// ==========================================
// FUNCIONALIDAD DE FILTROS Y BÚSQUEDA
// ==========================================

function inicializarFiltros() {
    const buscarInput = document.getElementById('buscarDeposito');
    const filtroEstado = document.getElementById('filtroEstado');
    const filtroTienda = document.getElementById('filtroTienda');

    // Función para aplicar filtros
    function aplicarFiltros() {
        const urlParams = new URLSearchParams();
        
        const buscar = buscarInput.value.trim();
        const estado = filtroEstado.value;
        const tienda = filtroTienda.value;

        if (buscar) urlParams.append('buscar', buscar);
        if (estado) urlParams.append('estado', estado);
        if (tienda) urlParams.append('tienda', tienda);

        const queryString = urlParams.toString();
        const newUrl = queryString ? `?${queryString}` : window.location.pathname;
        
        window.location.href = newUrl;
    }

    // Evento de búsqueda (Enter o después de pausar escritura)
    let timeoutId;
    if (buscarInput) {
        buscarInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                aplicarFiltros();
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    aplicarFiltros();
                }, 800); // Esperar 800ms después de que el usuario deje de escribir
            }
        });
    }

    // Eventos de cambio en los selectores
    if (filtroEstado) {
        filtroEstado.addEventListener('change', aplicarFiltros);
    }

    if (filtroTienda) {
        filtroTienda.addEventListener('change', aplicarFiltros);
    }
}
