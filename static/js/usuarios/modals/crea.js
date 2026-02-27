// ================================================================
// MODAL CREAR USUARIO - VERSIÓN SIMPLIFICADA Y ROBUSTA
// ================================================================


(function() {
    'use strict';
    
    // Esperar a que jQuery esté listo
    $(document).ready(function() {
        
        // DELEGACIÓN DE EVENTOS - Escuchar cambios en el selector de rol EN TODO EL DOCUMENTO
        $(document).on('change', '#rol', function() {
            const rolSeleccionado = $(this).val();
            mostrarOcultarSelectores(rolSeleccionado);
        });
        
        // Limpiar cuando se cierra el modal
        $('#modalCrearUsuario').on('hidden.bs.modal', function() {
            limpiarFormulario();
        });
        
        // Manejar submit del formulario
        $(document).on('submit', '#formCrearUsuario', function(e) {
            if (!validarFormulario()) {
                e.preventDefault();
                return false;
            }
        });
        
        // Validación de contraseñas en tiempo real
        $(document).on('input', '#password2', function() {
            const pass1 = $('#password').val();
            const pass2 = $(this).val();
            
            if (pass2 && pass1 !== pass2) {
                $(this).addClass('is-invalid');
            } else {
                $(this).removeClass('is-invalid');
            }
        });
        
        console.log('✓ Eventos con delegación configurados');
    });
    
    function mostrarOcultarSelectores(rol) {
        console.log('→ mostrarOcultarSelectores(' + rol + ')');
        
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
        
        // Mostrar según rol
        if (rol === 'almacen') {
            console.log('  ✓ Mostrando selector de ALMACÉN');
            $grupoAlmacen.show();
            $selectAlmacen.attr('required', 'required');
        } else if (rol === 'tienda' || rol === 'deposito') {
            console.log('  ✓ Mostrando selector de TIENDA');
            $grupoTienda.show();
            $selectTienda.attr('required', 'required');
        } else {
            console.log('  ✓ Ocultando todos los selectores');
        }
    }
    
    function validarFormulario() {
        console.log('→ Validando formulario...');
        
        // IMPORTANTE: Buscar elementos DENTRO del formulario específico
        const $form = $('#formCrearUsuario');
        const username = $form.find('#username').val().trim();
        const email = $form.find('#email').val().trim();
        const password = $form.find('#password').val();
        const password2 = $form.find('#password2').val();
        const rol = $form.find('#rol').val();
        
        // LOG DETALLADO de cada campo
        console.log('  - username:', username || 'VACÍO');
        console.log('  - email:', email || 'VACÍO');
        console.log('  - password:', password ? '✓ (' + password.length + ' chars)' : 'VACÍO');
        console.log('  - password2:', password2 ? '✓ (' + password2.length + ' chars)' : 'VACÍO');
        console.log('  - rol:', rol || 'VACÍO');
        
        // Validar campos requeridos
        if (!username || !email || !password || !password2 || !rol) {
            alert('Por favor complete todos los campos requeridos');
            console.log('✗ Campos incompletos');
            return false;
        }
        
        // Validar username
        if (username.length < 3) {
            alert('El usuario debe tener al menos 3 caracteres');
            console.log('✗ Usuario muy corto');
            return false;
        }
        
        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Correo electrónico inválido');
            console.log('✗ Email inválido');
            return false;
        }
        
        // Validar contraseña
        if (password.length < 8) {
            alert('La contraseña debe tener al menos 8 caracteres');
            console.log('✗ Contraseña muy corta');
            return false;
        }
        
        // Validar que las contraseñas coincidan
        if (password !== password2) {
            alert('Las contraseñas no coinciden');
            console.log('✗ Contraseñas no coinciden');
            return false;
        }
        
        // Validar almacén si el rol lo requiere
        if (rol === 'almacen') {
            const almacen = $form.find('#almacen').val();
            console.log('  - almacen seleccionado:', almacen || 'NINGUNO');
            if (!almacen) {
                alert('Debe seleccionar un almacén para este rol');
                console.log('✗ Almacén no seleccionado');
                return false;
            }
        }
        
        // Validar tienda si el rol lo requiere
        if (rol === 'tienda' || rol === 'deposito') {
            const tienda = $form.find('#tienda').val();
            console.log('  - tienda seleccionada:', tienda || 'NINGUNA');
            if (!tienda) {
                alert('Debe seleccionar una tienda para este rol');
                console.log('✗ Tienda no seleccionada');
                return false;
            }
        }
        
        console.log('✓ Formulario válido - enviando...');
        return true;
    }
    
    function limpiarFormulario() {
        $('#formCrearUsuario')[0].reset();
        $('#grupoAlmacen').hide();
        $('#grupoTienda').hide();
        $('#almacen').removeAttr('required');
        $('#tienda').removeAttr('required');
        $('.is-invalid').removeClass('is-invalid');
    }
    
})();
