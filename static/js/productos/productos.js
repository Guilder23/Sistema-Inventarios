/* ============================================================================
   PRODUCTOS.JS - Orquestador Principal
   ============================================================================ */

document.addEventListener('DOMContentLoaded', function() {
    inicializarBusquedaFrontend();
    inicializarFiltrosFrontend();
    
    // Inicializar modales
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
    if (typeof inicializarModalEditarPrecio === 'function') {
        inicializarModalEditarPrecio();
    }
});

/**
 * Búsqueda en tiempo real (frontend)
 */
function inicializarBusquedaFrontend() {
    const inputBuscar = document.getElementById('buscar');
    
    if (inputBuscar) {
        let timeoutId;
        inputBuscar.addEventListener('input', function() {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                aplicarFiltrosFrontend();
            }, 200);
        });
    }
}

/**
 * Filtros automáticos (frontend)
 */
function inicializarFiltrosFrontend() {
    const filtroEstado = document.getElementById('estado');
    
    if (filtroEstado) {
        filtroEstado.addEventListener('change', () => aplicarFiltrosFrontend());
    }
}

/**
 * Aplica filtros y búsqueda en el frontend
 */
function aplicarFiltrosFrontend() {
    const buscar = (document.getElementById('buscar')?.value || '').toLowerCase().trim();
    const estado = document.getElementById('estado')?.value || '';
    
    const filas = document.querySelectorAll('.tabla-productos tbody tr');
    let contadorVisible = 0;
    
    filas.forEach(fila => {
        if (fila.querySelector('td[colspan]')) {
            return;
        }
        
        const textoFila = fila.textContent.toLowerCase();
        const estadoFila = fila.querySelector('.badge-estado-activo, .badge-estado-inactivo');
        
        let mostrar = true;
        
        if (buscar && !textoFila.includes(buscar)) {
            mostrar = false;
        }
        
        if (estado && estadoFila) {
            if (estado === 'activo' && !estadoFila.classList.contains('badge-estado-activo')) {
                mostrar = false;
            }
            if (estado === 'inactivo' && !estadoFila.classList.contains('badge-estado-inactivo')) {
                mostrar = false;
            }
        }
        
        fila.style.display = mostrar ? '' : 'none';
        if (mostrar) contadorVisible++;
    });
    
    // Mostrar mensaje si no hay resultados
    if (contadorVisible === 0) {
        let tabla = document.querySelector('.tabla-productos tbody');
        if (!tabla.querySelector('.sin-resultados')) {
            tabla.innerHTML = '<tr class="sin-resultados"><td colspan="8" class="text-center py-4"><i class="fas fa-search fa-3x text-muted mb-2"></i><p class="text-muted">No hay productos que coincidan con tu búsqueda</p></td></tr>';
        }
    }
}
