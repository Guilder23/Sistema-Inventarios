// ================================================================
// MODAL EDITAR VENDEDOR
// ================================================================

(function() {
    'use strict';
    
    function inicializarModalEditar() {
        console.log('✓ Inicializando Modal Editar Vendedor');
        
        $(document).on('click', '.btn-editar-vendedor', function(e) {
            e.preventDefault();
            const vendedorId = $(this).data('vendedor-id');
            cargarVendedorParaEditar(vendedorId);
        });
        
        // Cambio de tipo de ubicación
        $(document).on('change', '#editarTipoUbicacion', function() {
            const tipoSeleccionado = $(this).val();
            mostrarOcultarUbicacion(tipoSeleccionado);
        });
        
        // Manejar submit del formulario
        $(document).on('submit', '#formEditarVendedor', function(e) {
            e.preventDefault();
            
            const vendedorId = $('#editarVendedorId').val();
            const formData = new FormData(this);
            
            $.ajax({
                url: `/vendedores/editar/${vendedorId}/`,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        alert('Vendedor actualizado exitosamente');
                        $('#modalEditarVendedor').modal('hide');
                        location.reload();
                    } else {
                        alert('Error: ' + response.error);
                    }
                },
                error: function() {
                    alert('Error al actualizar vendedor');
                }
            });
        });
    }
    
    function cargarVendedorParaEditar(vendedorId) {
        $.ajax({
            url: `/vendedores/obtener/${vendedorId}/`,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                $('#editarVendedorId').val(data.id);
                $('#editarNombre').val(data.nombre);
                $('#editarApellido').val(data.apellido);
                $('#editarCedula').val(data.cedula);
                $('#editarEmail').val(data.email || '');
                $('#editarTelefono').val(data.telefono || '');
                $('#editarDireccion').val(data.direccion || '');
                $('#editarComision').val(data.comision);
                $('#editarEstado').val(data.estado);
                
                // Determinar tipo de ubicación
                let tipoUbicacion = '';
                let ubicacionId = '';
                
                if (data.almacen_id) {
                    tipoUbicacion = 'almacen';
                    ubicacionId = data.almacen_id;
                } else if (data.tienda_id) {
                    tipoUbicacion = 'tienda';
                    ubicacionId = data.tienda_id;
                }
                
                // Establecer tipo y mostrar/ocultar selectores
                $('#editarTipoUbicacion').val(tipoUbicacion);
                mostrarOcultarUbicacion(tipoUbicacion);
                
                // Después de mostrar el selector correcto, establecer el valor
                if (tipoUbicacion === 'almacen') {
                    $('#editarAlmacen').val(ubicacionId);
                } else if (tipoUbicacion === 'tienda') {
                    $('#editarTienda').val(ubicacionId);
                }
                
                $('#modalEditarVendedor').modal('show');
            },
            error: function() {
                alert('Error al cargar los datos del vendedor');
            }
        });
    }
    
    function mostrarOcultarUbicacion(tipo) {
        console.log('→ mostrarOcultarUbicacion(' + tipo + ')');
        
        const $grupoAlmacen = $('#editarGrupoAlmacen');
        const $grupoTienda = $('#editarGrupoTienda');
        const $selectAlmacen = $('#editarAlmacen');
        const $selectTienda = $('#editarTienda');
        
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
    
    // Exponer función para inicialización
    window.inicializarModalEditar = inicializarModalEditar;
    
})();
