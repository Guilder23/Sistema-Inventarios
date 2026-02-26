document.addEventListener('DOMContentLoaded', function() {
    inicializarBusquedaFrontend();
    inicializarFiltrosFrontend();
});

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

function inicializarFiltrosFrontend() {
    const filtroEstado = document.getElementById('estado');

    if (filtroEstado) {
        filtroEstado.addEventListener('change', () => aplicarFiltrosFrontend());
    }
}

function aplicarFiltrosFrontend() {
    const buscar = (document.getElementById('buscar')?.value || '').toLowerCase().trim();
    const estado = document.getElementById('estado')?.value || '';

    const filas = document.querySelectorAll('.tabla-contenedores tbody tr');
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

    mostrarMensajeSinResultados(contadorVisible, buscar, estado);
}

function mostrarMensajeSinResultados(cantidad, buscar, estado) {
    const tbody = document.querySelector('.tabla-contenedores tbody');
    if (!tbody) return;

    const mensajeAnterior = tbody.querySelector('.mensaje-sin-resultados');
    if (mensajeAnterior) {
        mensajeAnterior.remove();
    }

    if (cantidad > 0) return;

    let mensaje = 'No se encontraron contenedores';
    const filtros = [];

    if (buscar) {
        filtros.push(`que coincidan con "${buscar}"`);
    }
    if (estado) {
        filtros.push(`con estado "${estado}"`);
    }

    if (filtros.length > 0) {
        mensaje += ' ' + filtros.join(' y ');
    }

    const filaMensaje = document.createElement('tr');
    filaMensaje.className = 'mensaje-sin-resultados';
    filaMensaje.innerHTML = `
        <td colspan="6" class="text-center py-4">
            <i class="fas fa-search fa-3x text-muted mb-2" style="display: block;"></i>
            <p class="text-muted mb-0"><strong>${mensaje}</strong></p>
            <p class="text-muted small">Intente con otros criterios de búsqueda</p>
        </td>
    `;

    tbody.appendChild(filaMensaje);
}
