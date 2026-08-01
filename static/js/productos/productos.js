/* ============================================================================
   PRODUCTOS.JS - Orquestador Principal
   ============================================================================ */

document.addEventListener('DOMContentLoaded', function() {
    restaurarFocoBuscadorSiCorresponde();
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

function marcarAutofocusBuscador() {
    try {
        sessionStorage.setItem('productos_autofocus_buscar', '1');
    } catch (e) {
        // noop
    }
}

function restaurarFocoBuscadorSiCorresponde() {
    const inputBuscar = document.getElementById('buscar');
    if (!inputBuscar) return;

    let debeEnfocar = false;
    try {
        debeEnfocar = sessionStorage.getItem('productos_autofocus_buscar') === '1';
    } catch (e) {
        debeEnfocar = false;
    }

    if (!debeEnfocar) return;

    // Limpiar flag antes de enfocar, para evitar loops
    try {
        sessionStorage.removeItem('productos_autofocus_buscar');
    } catch (e) {
        // noop
    }

    // Enfocar y poner cursor al final
    inputBuscar.focus();
    const valor = inputBuscar.value || '';
    inputBuscar.setSelectionRange(valor.length, valor.length);
}

/**
 * Búsqueda (server-side): "tiempo real" con debounce
 */
function inicializarBusquedaFrontend() {
    const inputBuscar = document.getElementById('buscar');
    const formFiltros = document.getElementById('formFiltrosProductos');
    
    if (inputBuscar && formFiltros) {
        let timeoutId;

        // Tiempo real: espera a que el usuario deje de escribir
        inputBuscar.addEventListener('input', function() {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                marcarAutofocusBuscador();
                formFiltros.submit();
            }, 900);
        });

        // Enter: submit inmediato
        inputBuscar.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(timeoutId);
                marcarAutofocusBuscador();
                formFiltros.submit();
            }
        });
    }
}

/**
 * Filtros (server-side): recarga al cambiar estado o contenedor
 */
function inicializarFiltrosFrontend() {
    const filtroEstado = document.getElementById('estado');
    const filtroContenedor = document.getElementById('contenedor_id');
    const formFiltros = document.getElementById('formFiltrosProductos');
    
    if (filtroEstado && formFiltros) {
        filtroEstado.addEventListener('change', () => {
            marcarAutofocusBuscador();
            formFiltros.submit();
        });
    }
    
    if (filtroContenedor && formFiltros) {
        filtroContenedor.addEventListener('change', () => {
            marcarAutofocusBuscador();
            formFiltros.submit();
        });
    }
}
