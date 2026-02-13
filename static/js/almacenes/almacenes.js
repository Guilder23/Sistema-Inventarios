/* ============================================================================
   FUNCIONALIDAD PARA PÁGINA DE ALMACENES
   ============================================================================ */

document.addEventListener('DOMContentLoaded', function() {
    inicializarBusquedaFrontend();
    inicializarFiltrosFrontend();
    inicializarBotonesCRUD();
    inicializarFormularios();
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
            }, 200);
        });
    }
}

/**
 * Filtros automáticos (frontend)
 */
function inicializarFiltrosFrontend() {
    const filtroEstado = document.getElementById('estado');
    if (filtroEstado) {
        filtroEstado.addEventListener('change', () => aplicarFiltrosFrontend());
    }
}

/**
 * Aplica filtros y búsqueda en el frontend
 */
function aplicarFiltrosFrontend() {
    const buscar = (document.getElementById('buscar')?.value || '').toLowerCase().trim();
    const estado = document.getElementById('estado')?.value || '';
    
    const filas = document.querySelectorAll('.tabla-almacenes tbody tr');
    let contadorVisible = 0;
    
    filas.forEach(fila => {
        const textoFila = fila.textContent.toLowerCase();
        const estadoFila = fila.querySelector('.badge-success, .badge-danger');
        
        let mostrar = true;
        
        if (buscar && !textoFila.includes(buscar)) {
            mostrar = false;
        }
        
        if (estado && estadoFila) {
            if (estado === 'activo' && !estadoFila.classList.contains('badge-success')) {
                mostrar = false;
            }
            if (estado === 'inactivo' && !estadoFila.classList.contains('badge-danger')) {
                mostrar = false;
            }
        }
        
        fila.style.display = mostrar ? '' : 'none';
        if (mostrar) contadorVisible++;
    });
    
    mostrarMensajeSinResultados(contadorVisible, buscar, estado);
}

/**
 * Mostrar mensaje cuando no hay resultados
 */
function mostrarMensajeSinResultados(cantidad, buscar, estado) {
    let mensajeAnterior = document.querySelector('.mensaje-sin-resultados');
    if (mensajeAnterior) {
        mensajeAnterior.remove();
    }
    
    if (cantidad > 0) return;
    
    let mensaje = 'No se encontraron almacenes';
    const filtros = [];
    
    if (buscar) {
        filtros.push('que coincidan con "' + buscar + '"');
    }
    if (estado) {
        filtros.push('con estado "' + estado + '"');
    }
    
    if (filtros.length > 0) {
        mensaje += ' ' + filtros.join(' y ');
    }
    
    const tbody = document.querySelector('.tabla-almacenes tbody');
    if (tbody) {
        const tr = document.createElement('tr');
        tr.className = 'mensaje-sin-resultados';
        tr.innerHTML = '<td colspan="7" style="text-align: center; padding: 20px; color: #999;">📭 ' + mensaje + '</td>';
        tbody.appendChild(tr);
    }
}

/**
 * Inicializa los botones de CRUD
 */
function inicializarBotonesCRUD() {
    // Evento para modal de VER - Cuando se abre, carga los datos
    jQuery('#modalVerAlmacen').on('show.bs.modal', function(e) {
        const button = e.relatedTarget;
        const almacenId = button.getAttribute('data-almacen-id');
        if (almacenId) {
            cargarDetallesAlmacen(almacenId);
        }
    });

    // Evento para modal de EDITAR - Cuando se abre, carga los datos
    jQuery('#modalEditarAlmacen').on('show.bs.modal', function(e) {
        const button = e.relatedTarget;
        const almacenId = button.getAttribute('data-almacen-id');
        if (almacenId) {
            cargarEdicionAlmacen(almacenId);
            // Establecer el action del formulario dinámicamente
            document.getElementById('formEditarAlmacen').action = '/almacenes/' + almacenId + '/editar/';
        }
    });

    // Evento para modal de ELIMINAR - Cuando se abre, carga los datos
    jQuery('#modalEliminarAlmacen').on('show.bs.modal', function(e) {
        const button = e.relatedTarget;
        const almacenId = button.getAttribute('data-almacen-id');
        const almacenNombre = button.getAttribute('data-almacen-nombre');
        if (almacenId) {
            cargarEliminacionAlmacen(almacenId, almacenNombre);
            // Establecer el action del formulario dinámicamente
            document.getElementById('formEliminarAlmacen').action = '/almacenes/' + almacenId + '/cambiar-estado/';
        }
    });
}

/**
 * Carga los datos del almacén en el modal de VER
 */
function cargarDetallesAlmacen(almacenId) {
    fetch('/almacenes/' + almacenId + '/obtener/')
        .then(response => response.json())
        .then(data => {
            document.getElementById('verNombre').textContent = data.nombre;
            document.getElementById('verCodigo').textContent = data.codigo;
            document.getElementById('verDescripcion').textContent = data.descripcion || '-';
            document.getElementById('verDireccion').textContent = data.direccion;
            document.getElementById('verCiudad').textContent = data.ciudad;
            document.getElementById('verDepartamento').textContent = data.departamento;
            document.getElementById('verPais').textContent = data.pais;
            document.getElementById('verCodigoPostal').textContent = data.codigo_postal || '-';
            document.getElementById('verTelefono').textContent = data.telefono || '-';
            document.getElementById('verEmail').textContent = data.email || '-';
            document.getElementById('verCapacidadM2').textContent = data.capacidad_m2 || '-';
            document.getElementById('verCapacidadProductos').textContent = data.capacidad_productos || '-';
            document.getElementById('verCreadoPor').textContent = data.creado_por || '-';
            document.getElementById('verFechaCreacion').textContent = data.fecha_creacion || '-';
            document.getElementById('verFechaActualizacion').textContent = data.fecha_actualizacion || '-';
            
            let estado = document.getElementById('verEstado');
            if (estado) {
                estado.textContent = data.estado_display || (data.estado === 'activo' ? 'Activo' : 'Inactivo');
                estado.className = 'mb-0 estado-almacen estado-' + data.estado;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarAlerta('Error al cargar los detalles del almacén', 'danger');
        });
}

/**
 * Carga los datos del almacén en el modal de EDITAR
 */
function cargarEdicionAlmacen(almacenId) {
    fetch('/almacenes/' + almacenId + '/obtener/')
        .then(response => response.json())
        .then(data => {
            document.getElementById('editarId').value = data.id;
            document.getElementById('editarNombre').value = data.nombre;
            document.getElementById('editarCodigo').value = data.codigo;
            document.getElementById('editarDescripcion').value = data.descripcion || '';
            document.getElementById('editarDireccion').value = data.direccion;
            document.getElementById('editarCiudad').value = data.ciudad;
            document.getElementById('editarDepartamento').value = data.departamento;
            document.getElementById('editarPais').value = data.pais;
            document.getElementById('editarCodigoPostal').value = data.codigo_postal || '';
            document.getElementById('editarTelefono').value = data.telefono || '';
            document.getElementById('editarEmail').value = data.email || '';
            document.getElementById('editarCapacidadM2').value = data.capacidad_m2 || '';
            document.getElementById('editarCapacidadProductos').value = data.capacidad_productos || '';
            document.getElementById('editarEstado').value = data.estado;
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarAlerta('Error al cargar los datos para edición', 'danger');
        });
}

/**
 * Prepara el modal de cambio de estado
 */
function cargarEliminacionAlmacen(almacenId, almacenNombre) {
    // Primero obtener el estado actual del almacén
    fetch('/almacenes/' + almacenId + '/obtener/')
        .then(response => response.json())
        .then(data => {
            document.getElementById('eliminarAlmacenId').value = almacenId;
            document.getElementById('eliminarAlmacenNombre').textContent = almacenNombre;
            
            // Determinar el nuevo estado (si está activo, cambiar a inactivo y viceversa)
            const nuevoEstado = data.estado === 'activo' ? 'inactivo' : 'activo';
            document.getElementById('eliminarAlmacenEstado').value = nuevoEstado;
            
            // Actualizar el texto del modal para que refleje el cambio
            const modalBody = document.querySelector('#modalEliminarAlmacen .modal-body');
            const parrafoEstado = modalBody.querySelector('p.text-muted');
            if (parrafoEstado) {
                const estadoTexto = nuevoEstado === 'activo' ? 'activado' : 'desactivado';
                parrafoEstado.innerHTML = 'El almacén será <strong>' + estadoTexto + '</strong>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarAlerta('Error al cargar el almacén', 'danger');
        });
}

/**
 * Inicializa los formularios
 */
function inicializarFormularios() {
    const formCrear = document.getElementById('formCrearAlmacen');
    if (formCrear) {
        formCrear.addEventListener('submit', function(e) {
            if (!validarFormularioCrear()) {
                e.preventDefault();
            }
        });
    }

    const formEditar = document.getElementById('formEditarAlmacen');
    if (formEditar) {
        formEditar.addEventListener('submit', function(e) {
            if (!validarFormularioEditar()) {
                e.preventDefault();
            }
        });
    }
}

/**
 * Validar formulario de creación
 */
function validarFormularioCrear() {
    const nombre = document.getElementById('crearNombre')?.value.trim();
    const codigo = document.getElementById('crearCodigo')?.value.trim();
    const direccion = document.getElementById('crearDireccion')?.value.trim();
    const ciudad = document.getElementById('crearCiudad')?.value.trim();
    const departamento = document.getElementById('crearDepartamento')?.value.trim();

    if (!nombre || !codigo || !direccion || !ciudad || !departamento) {
        mostrarAlerta('Todos los campos requeridos deben estar completos', 'warning');
        return false;
    }

    return true;
}

/**
 * Validar formulario de edición
 */
function validarFormularioEditar() {
    const nombre = document.getElementById('editarNombre')?.value.trim();
    const codigo = document.getElementById('editarCodigo')?.value.trim();
    const direccion = document.getElementById('editarDireccion')?.value.trim();
    const ciudad = document.getElementById('editarCiudad')?.value.trim();
    const departamento = document.getElementById('editarDepartamento')?.value.trim();

    if (!nombre || !codigo || !direccion || !ciudad || !departamento) {
        mostrarAlerta('Todos los campos requeridos deben estar completos', 'warning');
        return false;
    }

    return true;
}

/**
 * Mostrar alerta personalizada
 */
function mostrarAlerta(mensaje, tipo) {
    if (typeof tipo === 'undefined') {
        tipo = 'info';
    }
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-' + tipo + ' alert-dismissible fade show';
    alertDiv.role = 'alert';
    alertDiv.innerHTML = mensaje + '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
    
    const container = document.querySelector('.container-fluid');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}
