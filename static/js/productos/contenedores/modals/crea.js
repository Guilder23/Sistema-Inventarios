(function() {
    'use strict';

    console.log('Crea.js: Archivo cargado');

    // Verificar jQuery disponibilidad
    const jQueryDisponible = typeof jQuery !== 'undefined' && typeof $ !== 'undefined';
    console.log('Crea.js: jQuery disponible?', jQueryDisponible);

    if (jQueryDisponible) {
        // Usar jQuery
        $(document).ready(function() {
            console.log('Crea.js: jQuery document.ready ejecutado');
            inicializarConJQuery();
        });
    } else {
        // Fallback a vanilla JavaScript
        console.log('Crea.js: jQuery NO disponible, usando vanilla JavaScript');
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', inicializarConVanillaJS);
        } else {
            inicializarConVanillaJS();
        }
    }

    function inicializarConJQuery() {
        // Abrir modal de crear
        $('#btnCrearContenedor').on('click', function(e) {
            console.log('Crea.js: Click en btnCrearContenedor (jQuery)');
            e.preventDefault();
            limpiarFormularioJQuery();
            $('#modalCrearContenedor').modal('show');
        });

        $('#modalCrearContenedor').on('hidden.bs.modal', function() {
            console.log('Crea.js: Modal cerrada');
            limpiarFormularioJQuery();
        });

        $(document).on('submit', '#formCrearContenedor', function(e) {
            console.log('Crea.js: Form submit detectado');
            if (!validarFormulario()) {
                console.log('Crea.js: Validación falló');
                e.preventDefault();
                return false;
            }
            console.log('Crea.js: Enviando formulario...');
        });
    }

    function inicializarConVanillaJS() {
        console.log('Crea.js: Inicializando con vanilla JavaScript');
        
        const btnCrear = document.getElementById('btnCrearContenedor');
        const modalCrear = document.getElementById('modalCrearContenedor');
        const formCrear = document.getElementById('formCrearContenedor');
        
        if (btnCrear) {
            btnCrear.addEventListener('click', function(e) {
                console.log('Crea.js: Click en btnCrearContenedor (vanilla)');
                e.preventDefault();
                limpiarFormularioVanilla();
                if (modalCrear) {
                    modalCrear.classList.add('show');
                    modalCrear.style.display = 'block';
                    document.body.classList.add('modal-open');
                }
            });
        } else {
            console.error('Crea.js: #btnCrearContenedor no encontrado');
        }

        if (formCrear) {
            formCrear.addEventListener('submit', function(e) {
                console.log('Crea.js: Form submit detectado (vanilla)');
                if (!validarFormulario()) {
                    e.preventDefault();
                    return false;
                }
            });
        }
    }

    function validarFormulario() {
        let nombre, proveedor;
        
        if (jQueryDisponible) {
            nombre = $('#nombre').val().trim();
            proveedor = $('#proveedor').val().trim();
        } else {
            const elemNombre = document.getElementById('nombre');
            const elemProveedor = document.getElementById('proveedor');
            nombre = elemNombre ? elemNombre.value.trim() : '';
            proveedor = elemProveedor ? elemProveedor.value.trim() : '';
        }

        console.log('Validando:', { nombre, proveedor });

        if (!nombre || !proveedor) {
            alert('Nombre y proveedor son requeridos');
            return false;
        }

        return true;
    }

    function limpiarFormularioJQuery() {
        const form = $('#formCrearContenedor')[0];
        if (form) {
            form.reset();
            $('#activo').prop('checked', true);
        }
    }

    function limpiarFormularioVanilla() {
        const form = document.getElementById('formCrearContenedor');
        const activo = document.getElementById('activo');
        if (form) {
            form.reset();
            if (activo) {
                activo.checked = true;
            }
        }
    }

})();
