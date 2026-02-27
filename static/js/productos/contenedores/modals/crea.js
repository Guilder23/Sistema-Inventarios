(function() {
    'use strict';

    $(document).ready(function() {
        $('#modalCrearContenedor').on('hidden.bs.modal', function() {
            limpiarFormulario();
        });

        $(document).on('submit', '#formCrearContenedor', function(e) {
            if (!validarFormulario()) {
                e.preventDefault();
                return false;
            }
        });
    });

    function validarFormulario() {
        const nombre = $('#nombre').val().trim();
        const proveedor = $('#proveedor').val().trim();
        const stock = $('#stock').val();

        if (!nombre || !proveedor) {
            alert('Nombre y proveedor son requeridos');
            return false;
        }

        if (!stock || parseInt(stock) < 0) {
            alert('El stock debe ser un número válido');
            return false;
        }

        return true;
    }

    function limpiarFormulario() {
        const form = $('#formCrearContenedor')[0];
        if (form) {
            form.reset();
        }
    }
})();
