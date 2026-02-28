document.addEventListener('DOMContentLoaded', function() {
    inicializarBusquedaPedidos();

    if (typeof inicializarModalCrearPedido === 'function') {
        inicializarModalCrearPedido();
    }

    if (typeof inicializarModalVerPedido === 'function') {
        inicializarModalVerPedido();
    }
});

function inicializarBusquedaPedidos() {
    const inputBuscar = document.getElementById('buscar');
    const filtroEstado = document.getElementById('estado');

    if (inputBuscar) {
        let timeoutId;
        inputBuscar.addEventListener('input', function() {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => aplicarFiltrosPedidos(), 200);
        });
    }

    if (filtroEstado) {
        filtroEstado.addEventListener('change', aplicarFiltrosPedidos);
    }
}

function aplicarFiltrosPedidos() {
    const buscar = (document.getElementById('buscar')?.value || '').toLowerCase().trim();
    const estado = document.getElementById('estado')?.value || '';

    const filas = document.querySelectorAll('.tabla-pedidos tbody tr');

    filas.forEach(fila => {
        if (fila.querySelector('td[colspan]')) {
            return;
        }

        const textoFila = fila.textContent.toLowerCase();
        const estadoFila = fila.dataset.estado || '';

        let mostrar = true;

        if (buscar && !textoFila.includes(buscar)) {
            mostrar = false;
        }

        if (estado && estado !== estadoFila) {
            mostrar = false;
        }

        fila.style.display = mostrar ? '' : 'none';
    });
}
