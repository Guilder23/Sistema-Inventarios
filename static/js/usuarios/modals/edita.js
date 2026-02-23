// ================================================================
// MODAL EDITAR USUARIO - VERSIÓN SIMPLIFICADA
// ================================================================

(function() {
    'use strict';
    
    // Esperar a que jQuery esté listo
    $(document).ready(function() {
        
        // Delegación de eventos para botones de editar (dinámicos)
        $(document).on('click', '.btn-editar-usuario', function(e) {
            e.preventDefault();
            const userId = $(this).data('usuario-id');
            cargarDatosUsuario(userId);
        });
        
        // Inicializar eventos cuando se muestra el modal
        $('#modalEditarUsuario').on('shown.bs.modal', function() {
            
            // Event listener para cambio de rol
            $('#editRol').off('change').on('change', function() {
                const rolSeleccionado = $(this).val();
                mostrarOcultarSelectoresEditar(rolSeleccionado);
            });
            
            // Event listener para submit del formulario
            $('#formEditarUsuario').off('submit').on('submit', function(e) {
                e.preventDefault(); // Prevenir submit normal
                
                if (!validarFormularioEditar()) {
                    return false;
                }
                
                // Enviar datos mediante AJAX
                const userId = $('#editarUsuarioId').val();
                const formData = $(this).serialize();
                
                $.ajax({
                    url: `/usuarios/${userId}/editar/`,
                    type: 'POST',
                    data: formData,
                    success: function(response) {
                        $('#modalEditarUsuario').modal('hide');
                        location.reload(); // Recargar la página para ver cambios
                    },
                    error: function(xhr, status, error) {
                        alert('Error al actualizar el usuario');
                    }
                });
            });
        });
        
        // Limpiar cuando se cierra el modal
        $('#modalEditarUsuario').on('hidden.bs.modal', function() {
            $('#formEditarUsuario')[0].reset();
            $('#editGrupoAlmacen').hide();
            $('#editGrupoTienda').hide();
        });
    });
    
    function cargarDatosUsuario(userId) {
        
        $.ajax({
            url: `/usuarios/${userId}/obtener/`,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                
                // Llenar el formulario
                $('#editarUsuarioId').val(data.id);
                $('#editUsername').val(data.username);
                $('#editEmail').val(data.email);
                $('#editFirstName').val(data.first_name || '');
                $('#editLastName').val(data.last_name || '');
                $('#editRol').val(data.rol);
                $('#editIsActive').prop('checked', data.is_active);
                
                // Mostrar los selectores según el rol
                mostrarOcultarSelectoresEditar(data.rol);
                
                // Seleccionar almacén o tienda si aplica
                if (data.almacen_id) {
                    $('#editAlmacen').val(data.almacen_id);
                }
                if (data.tienda_id) {
                    $('#editTienda').val(data.tienda_id);
                }
                
                // Abrir el modal
                $('#modalEditarUsuario').modal('show');
            },
            error: function(xhr, status, error) {
                alert('Error al cargar los datos del usuario');
            }
        });
    }
    
    function mostrarOcultarSelectoresEditar(rol) {
        console.log('→ mostrarOcultarSelectoresEditar(' + rol + ')');
        
        const $grupoAlmacen = $('#editGrupoAlmacen');
        const $grupoTienda = $('#editGrupoTienda');
        const $selectAlmacen = $('#editAlmacen');
        const $selectTienda = $('#editTienda');
        
        // Ocultar todo por defecto
        $grupoAlmacen.hide();
        $grupoTienda.hide();
        $selectAlmacen.removeAttr('required');
        $selectTienda.removeAttr('required');
        
        // Mostrar según rol
        if (rol === 'almacen') {
            console.log('  ✓ Mostrando selector de ALMACÉN');
            $grupoAlmacen.show();
            $selectAlmacen.attr('required', 'required');
        } else if (rol === 'tienda') {
            console.log('  ✓ Mostrando selector de TIENDA');
            $grupoTienda.show();
            $selectTienda.attr('required', 'required');
        } else {
            console.log('  ✓ Ocultando todos los selectores');
            // Limpiar valores si no aplican
            $selectAlmacen.val('');
            $selectTienda.val('');
        }
    }
    
    function validarFormularioEditar() {
        console.log('→ Validando formulario editar...');
        
        const username = $('#editUsername').val().trim();
        const email = $('#editEmail').val().trim();
        const rol = $('#editRol').val();
        
        // Validar campos requeridos
        if (!username || !email || !rol) {
            alert('Por favor complete todos los campos requeridos');
            console.log('✗ Campos incompletos');
            return false;
        }
        
        // Validar almacén si el rol lo requiere
        if (rol === 'almacen') {
            const almacen = $('#editAlmacen').val();
            if (!almacen) {
                alert('Debe seleccionar un almacén para este rol');
                console.log('✗ Almacén no seleccionado');
                return false;
            }
        }
        
        // Validar tienda si el rol lo requiere
        if (rol === 'tienda') {
            const tienda = $('#editTienda').val();
            if (!tienda) {
                alert('Debe seleccionar una tienda para este rol');
                console.log('✗ Tienda no seleccionada');
                return false;
            }
        }
        
        console.log('✓ Formulario editar válido - enviando...');
        return true;
    }
    
})();
