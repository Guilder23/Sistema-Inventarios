// ================================================================
// MODAL CREAR VENDEDOR
// ================================================================

(function() {
    'use strict';
    
    $(document).ready(function() {
        inicializarModalCrear();
    });
    
    function inicializarModalCrear() {
        console.log('✓ Inicializando Modal Crear Vendedor');
        
        // Cambio de tipo de ubicación (Almacén o Tienda)
        $(document).on('change', '#tipoUbicacion', function() {
            const tipoSeleccionado = $(this).val();
            console.log('Tipo seleccionado:', tipoSeleccionado);
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
                url: '{% url "crear_vendedor" %}',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        alert('Vendedor creado exitosamente');
                        $('#modalCrearVendedor').modal('hide');
                        location.reload();
                    } else {
                        alert('Error: ' + response.error);
                    }
                },
                error: function(xhr, status, error) {
                    alert('Error al crear vendedor');
                    console.error(error);
                }
            });
        });
    }
    
    function mostrarOcultarUbicacion(tipo) {
        console.log('→ mostrarOcultarUbicacion(' + tipo + ')');
        
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
            console.log('  ✓ Mostrando selector de ALMACÉN');
            $grupoAlmacen.show();
            $selectAlmacen.attr('required', 'required');
        } else if (tipo === 'tienda') {
            console.log('  ✓ Mostrando selector de TIENDA');
            $grupoTienda.show();
            $selectTienda.attr('required', 'required');
        } else {
            console.log('  ✓ Ocultando todos los selectores');
        }
    }
    
    function validarFormulario() {
        console.log('→ Validando formulario...');
        
        const $form = $('#formCrearVendedor');
        const nombre = $form.find('#nombre').val().trim();
        const apellido = $form.find('#apellido').val().trim();
        const cedula = $form.find('#cedula').val().trim();
        const tipoUbicacion = $form.find('#tipoUbicacion').val();
        const almacen = $form.find('#almacen').val();
        const tienda = $form.find('#tienda').val();
        
        console.log('  - nombre:', nombre || 'VACÍO');
        console.log('  - apellido:', apellido || 'VACÍO');
        console.log('  - cedula:', cedula || 'VACÍO');
        console.log('  - tipoUbicacion:', tipoUbicacion || 'VACÍO');
        
        // Validar campos requeridos
        if (!nombre || !apellido || !cedula || !tipoUbicacion) {
            alert('Por favor complete los campos requeridos');
            return false;
        }
        
        // Validar que se seleccione almacén o tienda según el tipo
        if (tipoUbicacion === 'almacen' && !almacen) {
            alert('Debe seleccionar un almacén');
            return false;
        }
        
        if (tipoUbicacion === 'tienda' && !tienda) {
            alert('Debe seleccionar una tienda');
            return false;
        }
        
        console.log('✓ Validación exitosa');
        return true;
    }
    
    function limpiarFormulario() {
        console.log('→ Limpiando formulario');
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
