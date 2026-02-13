/* ============================================================================
   USUARIOS.JS - Orquestador Principal
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
    const filtroRol = document.getElementById('rol');
    
    if (filtroEstado) {
        filtroEstado.addEventListener('change', () => aplicarFiltrosFrontend());
    }
    
    if (filtroRol) {
        filtroRol.addEventListener('change', () => aplicarFiltrosFrontend());
    }
}

/**
 * Aplica filtros y búsqueda en el frontend
 */
function aplicarFiltrosFrontend() {
    const buscar = (document.getElementById('buscar')?.value || '').toLowerCase().trim();
    const estado = document.getElementById('estado')?.value || '';
    const rol = document.getElementById('rol')?.value || '';
    
    const filas = document.querySelectorAll('.tabla-usuarios tbody tr');
    let contadorVisible = 0;
    
    filas.forEach(fila => {
        if (fila.querySelector('td[colspan]')) {
            return;
        }
        
        const textoFila = fila.textContent.toLowerCase();
        const estadoFila = fila.querySelector('.badge-estado-activo, .badge-estado-inactivo');
        const rolBadge = fila.querySelector('.badge-rol');
        
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
        
        if (rol && rolBadge) {
            const rolEnBadge = rolBadge.getAttribute('data-rol') || '';
            if (rolEnBadge !== rol) {
                mostrar = false;
            }
        }
        
        fila.style.display = mostrar ? '' : 'none';
        if (mostrar) contadorVisible++;
    });
    
    mostrarMensajeSinResultados(contadorVisible, buscar, estado, rol);
}

/**
 * Actualiza el contador de usuarios visibles
 */
function actualizarContador(cantidad) {
    const contadorElement = document.querySelector('.card-title .badge');
    if (contadorElement) {
        contadorElement.textContent = cantidad;
    }
}

/**
 * Muestra un mensaje cuando no hay resultados
 */
function mostrarMensajeSinResultados(cantidad, buscar, estado, rol) {
    const tbody = document.querySelector('.tabla-usuarios tbody');
    if (!tbody) return;
    
    const mensajeAnterior = tbody.querySelector('.mensaje-sin-resultados');
    if (mensajeAnterior) {
        mensajeAnterior.remove();
    }
    
    if (cantidad > 0) return;
    
    let mensaje = 'No se encontraron usuarios';
    const filtros = [];
    
    if (buscar) {
        filtros.push(`que coincidan con "${buscar}"`);
    }
    if (estado) {
        filtros.push(`con estado "${estado}"`);
    }
    if (rol) {
        const rolesMap = {
            'administrador': 'Administrador',
            'almacen': 'Almacén',
            'tienda': 'Tienda',
            'tienda_online': 'Tienda Virtual'
        };
        filtros.push(`con rol "${rolesMap[rol] || rol}"`);
    }
    
    if (filtros.length > 0) {
        mensaje += ' ' + filtros.join(' y ');
    }
    
    const filaMensaje = document.createElement('tr');
    filaMensaje.className = 'mensaje-sin-resultados';
    filaMensaje.innerHTML = `
        <td colspan="7" class="text-center py-4">
            <i class="fas fa-search fa-3x text-muted mb-2" style="display: block;"></i>
            <p class="text-muted mb-0"><strong>${mensaje}</strong></p>
            <p class="text-muted small">Intente con otros criterios de búsqueda</p>
        </td>
    `;
    
    tbody.appendChild(filaMensaje);
}