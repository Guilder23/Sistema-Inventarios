document.addEventListener('DOMContentLoaded', function() {
    restaurarFocoBuscadorSiCorresponde();
    inicializarBusquedaTiempoReal();
    inicializarFiltroEstado();

    if (typeof inicializarModalCrearPedido === 'function') {
        inicializarModalCrearPedido();
    }

    if (typeof inicializarModalVerPedido === 'function') {
        inicializarModalVerPedido();
    }
});

function marcarAutofocusBuscador() {
    try {
        sessionStorage.setItem('pedidos_autofocus_buscar', '1');
    } catch (e) {
        // noop
    }
}

function restaurarFocoBuscadorSiCorresponde() {
    const inputBuscar = document.getElementById('buscar');
    if (!inputBuscar) return;

    let debeEnfocar = false;
    try {
        debeEnfocar = sessionStorage.getItem('pedidos_autofocus_buscar') === '1';
    } catch (e) {
        debeEnfocar = false;
    }

    if (!debeEnfocar) return;

    try {
        sessionStorage.removeItem('pedidos_autofocus_buscar');
    } catch (e) {
        // noop
    }

    inputBuscar.focus();
    const valor = inputBuscar.value || '';
    inputBuscar.setSelectionRange(valor.length, valor.length);
}

function inicializarBusquedaTiempoReal() {
    const inputBuscar = document.getElementById('buscar');
    const form = document.getElementById('formFiltrosPedidos');
    if (!inputBuscar || !form) return;

    let timeoutId;

    inputBuscar.addEventListener('input', function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            marcarAutofocusBuscador();
            form.submit();
        }, 500);
    });

    inputBuscar.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(timeoutId);
            marcarAutofocusBuscador();
            form.submit();
        }
    });
}

function inicializarFiltroEstado() {
    const filtroEstado = document.getElementById('estado');
    const form = document.getElementById('formFiltrosPedidos');
    if (!filtroEstado || !form) return;

    filtroEstado.addEventListener('change', function() {
        marcarAutofocusBuscador();
        form.submit();
    });
}
