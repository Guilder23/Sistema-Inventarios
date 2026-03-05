document.addEventListener('DOMContentLoaded', function () {
    inicializarFiltrosDanados();
});

function inicializarFiltrosDanados() {
    const inputBuscar = document.getElementById('buscar');
    const selectEstado = document.getElementById('estado');

    if (inputBuscar) {
        inputBuscar.addEventListener('input', filtrarTablaDanados);
    }

    if (selectEstado) {
        selectEstado.addEventListener('change', filtrarTablaDanados);
    }
}

function filtrarTablaDanados() {
    const buscar = (document.getElementById('buscar')?.value || '').toLowerCase().trim();
    const estado = document.getElementById('estado')?.value || '';

    const filas = document.querySelectorAll('#tablaDevoluciones tbody tr');

    filas.forEach((fila) => {
        if (fila.querySelector('td[colspan]')) return;

        const textoFila = fila.textContent.toLowerCase();
        const estadoTexto = (fila.children[6]?.textContent || '').toLowerCase();

        let mostrar = true;

        if (buscar && !textoFila.includes(buscar)) {
            mostrar = false;
        }

        if (estado && !estadoTexto.includes(estado)) {
            mostrar = false;
        }

        fila.style.display = mostrar ? '' : 'none';
    });
}
