// ========================================
// MODAL DE DETALLES DE TRASPASOS
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM cargado - Inicializando modal');
    
    const modal = document.getElementById('modalVerTraspaso');
    
    if (!modal) {
        console.error('❌ Modal #modalVerTraspaso no encontrado en el DOM');
        return;
    }
    
    console.log('✅ Modal encontrado:', modal.id);
    
    // Usar Bootstrap modal event si está disponible
    if (typeof $ !== 'undefined' && $.fn.modal) {
        console.log('✅ jQuery y Bootstrap Modal disponibles');
        
        $(modal).on('show.bs.modal', function(event) {
            console.log('🔄 Modal show.bs.modal event disparado');
            const button = event.relatedTarget;
            const traspasoId = button?.getAttribute('data-traspaso-id');
            
            console.log('Botón relacionado:', button);
            console.log('Traspaso ID:', traspasoId);
            
            if (traspasoId) {
                cargarDetallesTraspaso(traspasoId);
            }
        });
        
        $(modal).on('hidden.bs.modal', function() {
            console.log('🔄 Modal hidden.bs.modal event disparado');
            document.getElementById('loadingTraspaso').style.display = 'block';
            document.getElementById('traspasoDetalleContent').style.display = 'none';
        });
    } else {
        console.log('⚠️ jQuery/Bootstrap no disponible, usando eventos nativos');
        
        modal.addEventListener('show.bs.modal', function(event) {
            console.log('🔄 Modal show.bs.modal event disparado (nativo)');
            const button = event.relatedTarget;
            const traspasoId = button?.getAttribute('data-traspaso-id');
            
            console.log('Botón relacionado:', button);
            console.log('Traspaso ID:', traspasoId);
            
            if (traspasoId) {
                cargarDetallesTraspaso(traspasoId);
            }
        });
        
        modal.addEventListener('hidden.bs.modal', function() {
            console.log('🔄 Modal hidden.bs.modal event disparado (nativo)');
            document.getElementById('loadingTraspaso').style.display = 'block';
            document.getElementById('traspasoDetalleContent').style.display = 'none';
        });
    }
});

/**
 * Carga los detalles de un traspaso en el modal
 */
function cargarDetallesTraspaso(traspasoId) {
    const loading = document.getElementById('loadingTraspaso');
    const content = document.getElementById('traspasoDetalleContent');
    
    console.log('➡️ Iniciando carga de detalles del traspaso ID:', traspasoId);
    
    // Mostrar loading
    loading.style.display = 'block';
    content.style.display = 'none';
    
    // Construir la URL
    const apiUrl = `/traspasos/api/detalle/${traspasoId}/`;
    console.log('🔗 URL API:', apiUrl);
    
    // Hacer llamada AJAX para obtener los detalles
    fetch(apiUrl)
        .then(response => {
            console.log('📥 Response recibido');
            console.log('   Status:', response.status);
            console.log('   OK:', response.ok);
            
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('✅ JSON parseado exitosamente');
            console.log('📊 Datos recibidos:', data);
            
            // Llenar los datos en el modal
            try {
                console.log('📝 Llenando campos del modal...');
                
                // Código
                const codigoEl = document.getElementById('detalleCodigoTraspaso');
                if (codigoEl) {
                    codigoEl.textContent = data.codigo;
                    console.log('✅ Código asignado:', data.codigo);
                }
                
                // Estado
                const estadoEl = document.getElementById('detalleEstadoTraspaso');
                if (estadoEl) {
                    estadoEl.innerHTML = formatearBadgeEstado(data.estado);
                    console.log('✅ Estado asignado:', data.estado);
                }
                
                // Tipo
                const tipoEl = document.getElementById('detalleTipoTraspaso');
                if (tipoEl) {
                    tipoEl.innerHTML = formatearBadgeTipo(data.tipo);
                    console.log('✅ Tipo asignado:', data.tipo);
                }
                
                // Origen
                const origenNombreEl = document.getElementById('detalleOrigenNombre');
                const origenRolEl = document.getElementById('detalleOrigenRol');
                if (origenNombreEl && origenRolEl) {
                    origenNombreEl.textContent = data.origen.nombre_ubicacion;
                    origenRolEl.textContent = obtenerNombreRol(data.origen.rol);
                    console.log('✅ Origen asignado:', data.origen.nombre_ubicacion);
                }
                
                // Destino
                const destinoNombreEl = document.getElementById('detalleDestinoNombre');
                const destinoRolEl = document.getElementById('detalleDestinoRol');
                if (destinoNombreEl && destinoRolEl) {
                    destinoNombreEl.textContent = data.destino.nombre_ubicacion;
                    destinoRolEl.textContent = obtenerNombreRol(data.destino.rol);
                    console.log('✅ Destino asignado:', data.destino.nombre_ubicacion);
                }
                
                // Creado por
                const creadoPorEl = document.getElementById('detalleCreadoPor');
                if (creadoPorEl) {
                    creadoPorEl.textContent = data.creado_por;
                    console.log('✅ Creado por asignado:', data.creado_por);
                }
                
                // Fecha
                const fechaEl = document.getElementById('detalleFechaTraspaso');
                if (fechaEl) {
                    fechaEl.textContent = formatearFecha(data.fecha_creacion);
                    console.log('✅ Fecha asignada:', data.fecha_creacion);
                }
                
                // PRODUCTOS - Limpiar y llenar tabla
                const tbody = document.getElementById('productosDetalleBodyTraspaso');
                const tablaProductos = document.getElementById('tablaProductosTraspaso');
                const loadingProductos = document.getElementById('loadingProductos');
                
                if (tbody && tablaProductos) {
                    tbody.innerHTML = '';
                    
                    if (data.productos && data.productos.length > 0) {
                        console.log(`📦 Cargando ${data.productos.length} productos...`);
                        
                        data.productos.forEach((producto, idx) => {
                            const fila = document.createElement('tr');
                            fila.innerHTML = `
                                <td class="producto-codigo">${producto.codigo_producto || '-'}</td>
                                <td class="producto-nombre">${producto.nombre_producto || '-'}</td>
                                <td class="text-center producto-cantidad">${producto.cantidad || 0}</td>
                            `;
                            tbody.appendChild(fila);
                            console.log(`   🟢 Producto ${idx + 1}: ${producto.nombre_producto} (Código: ${producto.codigo_producto}, Cantidad: ${producto.cantidad})`);
                        });
                    } else {
                        console.log('⚠️ No hay productos en el traspaso');
                        const fila = document.createElement('tr');
                        fila.innerHTML = '<td colspan="3" class="text-center text-muted">No hay productos en este traspaso</td>';
                        tbody.appendChild(fila);
                    }
                    
                    // Mostrar tabla y ocultar loading
                    if (loadingProductos) {
                        loadingProductos.style.display = 'none';
                    }
                    tablaProductos.style.display = 'table';
                    console.log('✅ Tabla de productos mostrada');
                }
                
                // Comentario
                const comentarioDiv = document.getElementById('detalleComentarioDiv');
                const comentarioEl = document.getElementById('detalleComentario');
                if (data.comentario && comentarioDiv && comentarioEl) {
                    comentarioEl.textContent = data.comentario;
                    comentarioDiv.style.display = 'block';
                    console.log('✅ Comentario mostrado');
                } else if (comentarioDiv) {
                    comentarioDiv.style.display = 'none';
                    console.log('💬 Sin comentario');
                }
                
                // Mostrar contenido y ocultar loading
                loading.style.display = 'none';
                content.style.display = 'block';
                console.log('✅ Modal cargado y visible exitosamente');
                
            } catch (fillError) {
                console.error('❌ Error al llenar campos del modal:', fillError);
                console.error('   Error:', fillError.message);
                throw fillError;
            }
        })
        .catch(error => {
            console.error('❌ Error al cargar datos del API:', error);
            console.error('   Mensaje:', error.message);
            
            loading.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-triangle"></i> 
                    <strong>Error:</strong> ${error.message}
                </div>
            `;
        });
}

/**
 * Formatea un estado en un badge HTML
 */
function formatearBadgeEstado(estado) {
    const estadoMap = {
        'pendiente': '<span class="estado-badge-traspaso estado-pendiente"><i class="fas fa-clock"></i> Pendiente</span>',
        'transito': '<span class="estado-badge-traspaso estado-transito"><i class="fas fa-shipping-fast"></i> En Tránsito</span>',
        'recibido': '<span class="estado-badge-traspaso estado-recibido"><i class="fas fa-check-circle"></i> Recibido</span>',
        'rechazado': '<span class="estado-badge-traspaso estado-rechazado"><i class="fas fa-times-circle"></i> Rechazado</span>',
        'cancelado': '<span class="estado-badge-traspaso estado-cancelado"><i class="fas fa-ban"></i> Cancelado</span>'
    };
    return estadoMap[estado] || `<span class="estado-badge-traspaso">${estado}</span>`;
}

/**
 * Formatea un tipo en un badge HTML
 */
function formatearBadgeTipo(tipo) {
    if (tipo === 'normal') {
        return '<span class="tipo-badge-traspaso tipo-normal"><i class="fas fa-exchange-alt"></i> Normal</span>';
    } else {
        return '<span class="tipo-badge-traspaso tipo-devolucion"><i class="fas fa-undo"></i> Devolución</span>';
    }
}

/**
 * Obtiene el nombre mostrable del rol
 */
function obtenerNombreRol(rol) {
    const rolMap = {
        'almacen': 'Almacén',
        'tienda': 'Tienda',
        'tienda_online': 'Tienda Online',
        'deposito': 'Depósito',
        'administrador': 'Administrador'
    };
    return rolMap[rol] || rol;
}

/**
 * Formatea una fecha en formato legible
 */
function formatearFecha(fecha) {
    try {
        const date = new Date(fecha);
        const opciones = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('es-ES', opciones);
    } catch (e) {
        console.error('Error al formatear fecha:', e);
        return fecha;
    }
}
