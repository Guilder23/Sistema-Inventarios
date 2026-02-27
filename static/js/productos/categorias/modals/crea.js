(function() {
    'use strict';

    $(document).ready(function() {
        $('#modalCrearCategoria').on('hidden.bs.modal', function() {
            limpiarFormulario();
        });

        $(document).on('submit', '#formCrearCategoria', function(e) {
            if (!validarFormulario()) {
                e.preventDefault();
                return false;
            }
        });
    });

    function validarFormulario() {
        const nombre = $('#nombre').val().trim();

        if (!nombre) {
            alert('El nombre de la categoría es requerido');
            return false;
        }

        if (nombre.length < 2) {
            alert('El nombre debe tener al menos 2 caracteres');
            return false;
        }

        return true;
    }

    function limpiarFormulario() {
        const form = $('#formCrearCategoria')[0];
        if (form) {
            form.reset();
        }
    }
})();
