/* ============================================================================
   ALMACENES.JS - Orquestador Principal
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
    
    const filas = document.querySelectorAll('.tabla-almacenes tbody tr');
    let contadorVisible = 0;
    
    filas.forEach(fila => {
        const textoFila = fila.textContent.toLowerCase();
        const estadoFila = fila.querySelector('.badge-success, .badge-danger');
        
        let mostrar = true;
        
        if (buscar && !textoFila.includes(buscar)) {
            mostrar = false;
        }
        
        if (estado && estadoFila) {
            if (estado === 'activo' && !estadoFila.classList.contains('badge-success')) {
                mostrar = false;
            }
            if (estado === 'inactivo' && !estadoFila.classList.contains('badge-danger')) {
                mostrar = false;
            }
        }
        
        fila.style.display = mostrar ? '' : 'none';
        if (mostrar) contadorVisible++;
    });
    
    mostrarMensajeSinResultados(contadorVisible, buscar, estado);
}

/**
 * Mostrar mensaje cuando no hay resultados
 */
function mostrarMensajeSinResultados(cantidad, buscar, estado) {
    let mensajeAnterior = document.querySelector('.mensaje-sin-resultados');
    if (mensajeAnterior) {
        mensajeAnterior.remove();
    }
    
    if (cantidad > 0) return;
    
    let mensaje = 'No se encontraron almacenes';
    const filtros = [];
    
    if (buscar) {
        filtros.push('que coincidan con "' + buscar + '"');
    }
    if (estado) {
        filtros.push('con estado "' + estado + '"');
    }
    
    if (filtros.length > 0) {
        mensaje += ' ' + filtros.join(' y ');
    }
    
    const tbody = document.querySelector('.tabla-almacenes tbody');
    if (tbody) {
        const tr = document.createElement('tr');
        tr.className = 'mensaje-sin-resultados';
        tr.innerHTML = '<td colspan="7" style="text-align: center; padding: 20px; color: #999;">📭 ' + mensaje + '</td>';
        tbody.appendChild(tr);
    }
}
