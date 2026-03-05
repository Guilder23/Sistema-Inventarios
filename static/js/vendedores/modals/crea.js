// ================================================================
// MODAL CREAR VENDEDOR
// ================================================================

(function() {
    'use strict';
    
    function inicializarModalCrear() {
        // Cambio de tipo de ubicación (Almacén o Tienda)
        $(document).on('change', '#tipoUbicacion', function() {
            const tipoSeleccionado = $(this).val();
            mostrarOcultarUbicacion(tipoSeleccionado);
        });
        
        // Limpiar cuando se cierra el modal
        $('#modalCrearVendedor').on('hidden.bs.modal', function() {
            limpiarFormulario();
        });
        
        // Manejar submit del formulario
        $(document).on('submit', '#formCrearVendedor', function(e) {
            e.preventDefault();
            
            if (!validarFormulario()) {
                return false;
            }
            
            const formData = new FormData(this);
            
            $.ajax({
                url: '/vendedores/crear/',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        $('#modalCrearVendedor').modal('hide');
                        location.reload();
                    }
                },
                error: function(xhr, status, error) {
                }
            });
        });
    }
    
    function mostrarOcultarUbicacion(tipo) {
        const $grupoAlmacen = $('#grupoAlmacen');
        const $grupoTienda = $('#grupoTienda');
        const $selectAlmacen = $('#almacen');
        const $selectTienda = $('#tienda');
        
        // Limpiar valores
        $selectAlmacen.val('');
        $selectTienda.val('');
        
        // Ocultar todo por defecto
        $grupoAlmacen.hide();
        $grupoTienda.hide();
        $selectAlmacen.removeAttr('required');
        $selectTienda.removeAttr('required');
        
        // Mostrar según tipo
        if (tipo === 'almacen') {
            $grupoAlmacen.show();
            $selectAlmacen.attr('required', 'required');
        } else if (tipo === 'tienda') {
            $grupoTienda.show();
            $selectTienda.attr('required', 'required');
        } else {
        }
    }
    
    function validarFormulario() {
        const $form = $('#formCrearVendedor');
        const nombre = $form.find('#nombre').val().trim();
        const apellido = $form.find('#apellido').val().trim();
        const cedula = $form.find('#cedula').val().trim();
        const tipoUbicacion = $form.find('#tipoUbicacion').val();
        const almacen = $form.find('#almacen').val();
        const tienda = $form.find('#tienda').val();
        
        // Validar campos requeridos
        if (!nombre || !apellido || !cedula || !tipoUbicacion) {
            return false;
        }
        
        // Validar que se seleccione almacén o tienda según el tipo
        if (tipoUbicacion === 'almacen' && !almacen) {
            return false;
        }
        
        if (tipoUbicacion === 'tienda' && !tienda) {
            return false;
        }
        
        return true;
    }
    
    function limpiarFormulario() {
        const $form = $('#formCrearVendedor');
        
        if ($form.length) {
            $form[0].reset();
            $form.find('#tipoUbicacion').val('');
            $form.find('#almacen').val('');
            $form.find('#tienda').val('');
            
            // Ocultar selectores
            $('#grupoAlmacen').hide();
            $('#grupoTienda').hide();
        }
    }
    
    // Exponer función globalmente
    window.inicializarModalCrear = inicializarModalCrear;

})();
