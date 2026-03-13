/* ============================================================================
   FUNCIONALIDAD PARA PÁGINA DE USUARIOS
   ============================================================================ */

document.addEventListener('DOMContentLoaded', function() {
    inicializarBusquedaFrontend();
    inicializarFiltrosFrontend();
    inicializarBotonesCRUD();
});

/**
 * Búsqueda en tiempo real (frontend)
 */
function inicializarBusquedaFrontend() {
    const inputBuscar = document.getElementById('buscar');
    
    if (inputBuscar) {
        let timeoutId;
        inputBuscar.addEventListener('input', function() {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                aplicarFiltrosFrontend();
            }, 200); // Búsqueda instantánea a medida que escribe
        });
    }
}

/**
 * Filtros automáticos (frontend)
 */
function inicializarFiltrosFrontend() {
    const filtroEstado = document.getElementById('estado');
    const filtroRol = document.getElementById('rol');
    
    if (filtroEstado) {
        filtroEstado.addEventListener('change', () => aplicarFiltrosFrontend());
    }
    
    if (filtroRol) {
        filtroRol.addEventListener('change', () => aplicarFiltrosFrontend());
    }
}

/**
 * Aplica filtros y búsqueda en el frontend (sin recargar)
 */
function aplicarFiltrosFrontend() {
    const buscar = (document.getElementById('buscar')?.value || '').toLowerCase().trim();
    const estado = document.getElementById('estado')?.value || '';
    const rol = document.getElementById('rol')?.value || '';
    
    // Obtener todas las filas de la tabla
    const filas = document.querySelectorAll('.tabla-usuarios tbody tr');
    let contadorVisible = 0;
    
    filas.forEach(fila => {
        // Si es la fila de "No hay usuarios" o mensaje de búsqueda
        if (fila.querySelector('td[colspan]')) {
            return;
        }
        
        // Extraer datos de la fila
        const textoFila = fila.textContent.toLowerCase();
        const estadoFila = fila.querySelector('.badge-success, .badge-danger');
        const rolBadge = fila.querySelector('.badge');
        
        let mostrar = true;
        
        // Filtro de búsqueda (busca en usuario, nombre, correo)
        if (buscar && !textoFila.includes(buscar)) {
            mostrar = false;
        }
        
        // Filtro de estado
        if (estado && estadoFila) {
            if (estado === 'activo' && !estadoFila.classList.contains('badge-success')) {
                mostrar = false;
            }
            if (estado === 'inactivo' && !estadoFila.classList.contains('badge-danger')) {
                mostrar = false;
            }
        }
        
        // Filtro de rol
        if (rol && rolBadge) {
            const rolTexto = rolBadge.textContent.toLowerCase();
            if (!rolTexto.includes(rol.toLowerCase())) {
                mostrar = false;
            }
        }
        
        // Mostrar/ocultar fila
        fila.style.display = mostrar ? '' : 'none';
        if (mostrar) contadorVisible++;
    });
    
    // Mostrar mensaje si no hay resultados
    mostrarMensajeSinResultados(contadorVisible, buscar, estado, rol);
    
    // Actualizar contador
    actualizarContador(contadorVisible);
}

/**
 * Actualiza el contador de usuarios visibles
 */
function actualizarContador(cantidad) {
    const contadorElement = document.querySelector('.card-title .badge');
    if (contadorElement) {
        contadorElement.textContent = cantidad;
    }
}

/**
 * Muestra un mensaje cuando no hay resultados en la búsqueda
 */
function mostrarMensajeSinResultados(cantidad, buscar, estado, rol) {
    const tbody = document.querySelector('.tabla-usuarios tbody');
    if (!tbody) return;
    
    // Eliminar mensaje anterior si existe
    const mensajeAnterior = tbody.querySelector('.mensaje-sin-resultados');
    if (mensajeAnterior) {
        mensajeAnterior.remove();
    }
    
    // Si hay resultados, no hacer nada
    if (cantidad > 0) return;
    
    // Crear mensaje personalizado
    let mensaje = 'No se encontraron usuarios';
    const filtros = [];
    
    if (buscar) {
        filtros.push(`que coincidan con "${buscar}"`);
    }
    if (estado) {
        filtros.push(`con estado "${estado}"`);
    }
    if (rol) {
        const rolesMap = {
            'administrador': 'Administrador',
            'almacen': 'Personal de Almacén',
            'tienda': 'Personal de Tienda',
            'deposito': 'Personal de Depósito',
            'tienda_online': 'Personal de Tienda Online'
        };
        filtros.push(`con rol "${rolesMap[rol] || rol}"`);
    }
    
    if (filtros.length > 0) {
        mensaje += ' ' + filtros.join(' y ');
    }
    
    // Crear fila con mensaje
    const filaMensaje = document.createElement('tr');
    filaMensaje.className = 'mensaje-sin-resultados';
    filaMensaje.innerHTML = `
        <td colspan="7" class="text-center py-4">
            <i class="fas fa-search fa-3x text-muted mb-2" style="display: block;"></i>
            <p class="text-muted mb-0"><strong>${mensaje}</strong></p>
            <p class="text-muted small">Intente con otros criterios de búsqueda</p>
        </td>
    `;
    
    tbody.appendChild(filaMensaje);
}

/**
 * Inicializar botones CRUD
 */
function inicializarBotonesCRUD() {
    // Botón Ver Usuario
    const botonesVer = document.querySelectorAll('.btn-ver-usuario');
    botonesVer.forEach(btn => {
        btn.addEventListener('click', function() {
            const usuarioId = this.getAttribute('data-usuario-id');
            if (typeof cargarDetallesUsuario === 'function') {
                cargarDetallesUsuario(usuarioId);
            }
        });
    });

    // Botón Editar Usuario
    const botonesEditar = document.querySelectorAll('.btn-editar-usuario');
    botonesEditar.forEach(btn => {
        btn.addEventListener('click', function() {
            const usuarioId = this.getAttribute('data-usuario-id');
            if (typeof cargarEdicionUsuario === 'function') {
                cargarEdicionUsuario(usuarioId);
            }
        });
    });

    // Botón Eliminar Usuario
    const botonesEliminar = document.querySelectorAll('.btn-eliminar-usuario');
    botonesEliminar.forEach(btn => {
        btn.addEventListener('click', function() {
            const usuarioId = this.getAttribute('data-usuario-id');
            const usuarioNombre = this.getAttribute('data-usuario-nombre');
            if (typeof cargarEliminacionUsuario === 'function') {
                cargarEliminacionUsuario(usuarioId, usuarioNombre);
            }
        });
    });
}

/**
 * Carga los datos del usuario en el modal de ELIMINAR
 */
function cargarEliminacionUsuario(usuarioId, nombreUsuario) {
    document.getElementById('eliminarUsuarioId').value = usuarioId;
    document.getElementById('eliminarUsuarioNombre').textContent = nombreUsuario;
    
    // Actualizar el action del formulario
    const formEliminar = document.getElementById('formEliminarUsuario');
    if (formEliminar) {
        formEliminar.action = `/usuarios/${usuarioId}/bloquear/`;
    }
}

    // Validar formulario de crear usuario
    const formCrear = document.getElementById('formCrearUsuario');
    if (formCrear) {
        formCrear.addEventListener('submit', function(e) {
            if (!validarFormularioCrear()) {
                e.preventDefault();
                mostrarAlerta('Por favor, complete todos los campos requeridos', 'warning');
            }
        });
    }

    // Validar formulario de editar usuario
    const formEditar = document.getElementById('formEditarUsuario');
    if (formEditar) {
        formEditar.addEventListener('submit', function(e) {
            if (!validarFormularioEditar()) {
                e.preventDefault();
                mostrarAlerta('Por favor, complete todos los campos requeridos', 'warning');
            }
        });
    }

    // Validar formulario de eliminar usuario
    const formEliminar = document.getElementById('formEliminarUsuario');
    if (formEliminar) {
        formEliminar.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Usuario a eliminar:', document.getElementById('eliminarUsuarioId').value);
        });
    }

    // Limpiar formulario cuando se cierre modal
    const modales = document.querySelectorAll('.modal');
    modales.forEach(modal => {
        modal.addEventListener('hidden.bs.modal', function() {
            const forms = this.querySelectorAll('form');
            forms.forEach(form => form.reset());
        });
    });


function inicializarBusqueda() {
    const inputBuscar = document.getElementById('buscar');
    
    if (inputBuscar) {
        let timeoutId;
        inputBuscar.addEventListener('input', function() {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                console.log('Buscando:', this.value);
            }, 300);
        });
    }
}

function validarFormularioCrear() {
    const username = document.getElementById('username')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value.trim();

    if (!username || !email || !password) {
        return false;
    }

    if (!validarEmail(email)) {
        mostrarAlerta('Correo electrónico inválido', 'warning');
        return false;
    }

    if (password.length < 8) {
        mostrarAlerta('La contraseña debe tener al menos 8 caracteres', 'warning');
        return false;
    }

    return true;
}

function validarFormularioEditar() {
    const email = document.getElementById('editEmail')?.value.trim();
    const password = document.getElementById('editPassword')?.value.trim();

    if (!email) {
        return false;
    }

    if (!validarEmail(email)) {
        mostrarAlerta('Correo electrónico inválido', 'warning');
        return false;
    }

    if (password && password.length < 8) {
        mostrarAlerta('La contraseña debe tener al menos 8 caracteres', 'warning');
        return false;
    }

    return true;
}

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function mostrarAlerta(mensaje, tipo = 'info') {
    const alertaHtml = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensaje}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `;

    const container = document.querySelector('.content');
    if (container) {
        const alerta = document.createElement('div');
        alerta.innerHTML = alertaHtml;
        container.insertBefore(alerta.firstElementChild, container.firstChild);

        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            const alertElement = document.querySelector('.alert');
            if (alertElement) {
                alertElement.remove();
            }
        }, 5000);
    }
}
/**
 * Carga los detalles del usuario en el modal de VER
 * @param {number} usuarioId - ID del usuario
 */
function cargarDetallesUsuario(usuarioId) {
    console.log('Cargando detalles del usuario: ' + usuarioId);
    // Aquí se implementará la lógica AJAX para cargar los datos
}

/**
 * Carga los datos del usuario en el modal de EDITAR
 * @param {number} usuarioId - ID del usuario
 */
function cargarEdicionUsuario(usuarioId) {
    console.log('Cargando edición del usuario: ' + usuarioId);
    // Aquí se implementará la lógica AJAX para cargar los datos
}

/**
 * Carga los datos del usuario en el modal de ELIMINAR
 * @param {number} usuarioId - ID del usuario
 * @param {string} nombreUsuario - Nombre del usuario
 */
function cargarEliminacionUsuario(usuarioId, nombreUsuario) {
    document.getElementById('eliminarUsuarioId').value = usuarioId;
    document.getElementById('eliminarUsuarioNombre').textContent = nombreUsuario;
}