// Inventario (tienda/depósito): búsqueda en tiempo real + paginación server-side
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        restaurarFocoBuscadorSiCorresponde();
        inicializarBusquedaTiempoReal();
        inicializarFiltroEstado();

        // Inicializa el modal de ver producto si está disponible (reusado desde productos)
        if (typeof inicializarModalVer === 'function') {
            inicializarModalVer();
        }
    });

    function marcarAutofocusBuscador() {
        try {
            sessionStorage.setItem('inventario_autofocus_buscar', '1');
        } catch (e) {
            // noop
        }
    }

    function restaurarFocoBuscadorSiCorresponde() {
        const inputBuscar = document.getElementById('buscarInventario');
        if (!inputBuscar) return;

        let debeEnfocar = false;
        try {
            debeEnfocar = sessionStorage.getItem('inventario_autofocus_buscar') === '1';
        } catch (e) {
            debeEnfocar = false;
        }

        if (!debeEnfocar) return;

        try {
            sessionStorage.removeItem('inventario_autofocus_buscar');
        } catch (e) {
            // noop
        }

        inputBuscar.focus();
        const valor = inputBuscar.value || '';
        inputBuscar.setSelectionRange(valor.length, valor.length);
    }

    function inicializarBusquedaTiempoReal() {
        const inputBuscar = document.getElementById('buscarInventario');
        const form = document.getElementById('formFiltrosInventario');
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
        const selectEstado = document.getElementById('estadoInventario');
        const form = document.getElementById('formFiltrosInventario');
        if (!selectEstado || !form) return;

        selectEstado.addEventListener('change', function() {
            marcarAutofocusBuscador();
            form.submit();
        });
    }
})();
