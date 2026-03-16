/* ============================================================================
   VENDEDORES.JS - Orquestador Principal
   ============================================================================ */

document.addEventListener('DOMContentLoaded', function() {
    inicializarBusquedaFrontend();
    inicializarFiltrosFrontend();
    
    // Los modales se inicializan automáticamente en sus respectivos archivos
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
    const filtroUbicacion = document.getElementById('ubicacion_tipo');
    
    if (filtroEstado) {
        filtroEstado.addEventListener('change', () => aplicarFiltrosFrontend());
    }
    
    if (filtroUbicacion) {
        filtroUbicacion.addEventListener('change', () => aplicarFiltrosFrontend());
    }
}

/**
 * Aplica filtros y búsqueda en el frontend
 */
function aplicarFiltrosFrontend() {
    const buscar = (document.getElementById('buscar')?.value || '').toLowerCase().trim();
    const estado = document.getElementById('estado')?.value || '';
    const ubicacionTipo = document.getElementById('ubicacion_tipo')?.value || '';
    
    const filas = document.querySelectorAll('.tabla-vendedores tbody tr');
    let contadorVisible = 0;
    
    filas.forEach(fila => {
        if (fila.querySelector('td[colspan]')) {
            return;
        }
        
        const textoFila = fila.textContent.toLowerCase();
        const estadoFila = fila.querySelector('.badge-estado-activo, .badge-estado-inactivo, .badge-estado-suspendido');
        const tipoBadge = fila.querySelector('.badge-tipo');
        
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
            if (estado === 'suspendido' && !estadoFila.classList.contains('badge-estado-suspendido')) {
                mostrar = false;
            }
        }
        
        if (ubicacionTipo && tipoBadge) {
            const tipoEnBadge = tipoBadge.getAttribute('data-tipo') || '';
            if (ubicacionTipo === 'almacen' && tipoEnBadge !== 'Almacén') {
                mostrar = false;
            }
            if (ubicacionTipo === 'tienda' && tipoEnBadge !== 'Tienda') {
                mostrar = false;
            }
        }
        
        fila.style.display = mostrar ? '' : 'none';
        if (mostrar) contadorVisible++;
    });
    
    mostrarMensajeSinResultados(contadorVisible, buscar, estado, ubicacionTipo);
}

/**
 * Muestra un mensaje cuando no hay resultados
 */
function mostrarMensajeSinResultados(cantidad, buscar, estado, ubicacionTipo) {
    const tbody = document.querySelector('.tabla-vendedores tbody');
    if (!tbody) return;
    
    const mensajeAnterior = tbody.querySelector('.mensaje-sin-resultados');
    if (mensajeAnterior) {
        mensajeAnterior.remove();
    }
    
    if (cantidad > 0) return;
    
    let mensaje = 'No se encontraron vendedores';
    const filtros = [];
    
    if (buscar) {
        filtros.push(`que coincidan con "${buscar}"`);
    }
    if (estado) {
        filtros.push(`con estado "${estado}"`);
    }
    if (ubicacionTipo) {
        const tiposMap = {
            'almacen': 'Almacén',
            'tienda': 'Tienda'
        };
        filtros.push(`en ${tiposMap[ubicacionTipo] || ubicacionTipo}`);
    }
    
    if (filtros.length > 0) {
        mensaje += ' ' + filtros.join(' y ');
    }
    
    const filaMensaje = document.createElement('tr');
    filaMensaje.className = 'mensaje-sin-resultados';
    filaMensaje.innerHTML = `
        <td colspan="8" class="text-center py-4">
            <i class="fas fa-search fa-3x text-muted mb-2" style="display: block;"></i>
            <p class="text-muted mb-0"><strong>${mensaje}</strong></p>
            <p class="text-muted small">Intente con otros criterios de búsqueda</p>
        </td>
    `;
    
    tbody.appendChild(filaMensaje);
}
