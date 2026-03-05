// ================================================================
// JAVASCRIPT MODAL - REGISTRAR DEVOLUCIÓN
// ================================================================

(function() {
    'use strict';

    function inicializarModalRegistrar() {
        // Cargar productos al abrir el modal
        $('#modalRegistrarDevolucion').on('show.bs.modal', function() {
            cargarProductos();
        });

        // Guardar devolución
        $(document).on('click', '#btnGuardarDevolucion', function() {
            if (!validarFormulario()) {
                return false;
            }

            const formData = {
                producto_id: $('#productoId').val(),
                cantidad: $('#cantidad').val(),
                comentario: $('#comentario').val()
            };

            $.ajax({
                url: '/devoluciones/registrar/',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(formData),
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        $('#modalRegistrarDevolucion').modal('hide');
                        location.reload();
                    }
                },
                error: function() {
                }
            });
        });

        // Limpiar al cerrar
        $('#modalRegistrarDevolucion').on('hidden.bs.modal', function() {
            limpiarFormulario();
        });
    }

    function cargarProductos() {
        const $select = $('#productoId');
        
        // Aquí puedes cargar dinámicamente desde una API
        // Por ahora, se cargará estáticamente desde el template
    }

    function validarFormulario() {
        const productoId = $('#productoId').val();
        const cantidad = $('#cantidad').val();

        if (!productoId) {
            return false;
        }

        if (!cantidad || parseInt(cantidad) <= 0) {
            return false;
        }

        return true;
    }

    function limpiarFormulario() {
        $('#formRegistrarDevolucion')[0].reset();
        $('#productoId').val('');
        $('#cantidad').val('');
        $('#comentario').val('');
    }

    window.inicializarModalRegistrar = inicializarModalRegistrar;

})();
