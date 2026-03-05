/**
 * GESTIÓN DE SOLICITUDES DE ANULACIÓN DE VENTAS
 */

// URLS definidas en el template HTML (solicitudes_anulacion.html)
// No remover de aquí - se definen en: const URLS = { ... }

/**
 * Abrir modal con detalle de la solicitud
 */
function abrirDetalle(solicitudId) {
    ModalSistema.cargando('Cargando detalles de la solicitud...');
    
    const url = `${URLS.detalle}${solicitudId}/detalle/`;
    console.log('Fetching URL:', url); // Debug
    
    fetch(url)
        .then(response => {
            console.log('Response status:', response.status); // Debug
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Response data:', data); // Debug
            ModalSistema.cerrar('modalCargando');
            mostrarDetalleSolicitud(data);
        })
        .catch(error => {
            console.error('Full error:', error); // Debug completo
            ModalSistema.cerrar('modalCargando');
            ModalSistema.notificar('Error', 'No se pudo cargar la solicitud: ' + error.message, 'danger');
        });
}

/**
 * Mostrar detalle de la solicitud en modal
 */
function mostrarDetalleSolicitud(data) {
    const html = `
        <div class="modal-overlay activo" id="modalDetalle">
            <div class="modal-contenedor" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>Detalle de Solicitud - ${data.venta_codigo}</h3>
                    <button type="button" class="modal-close-btn" onclick="ModalSistema.cerrar('modalDetalle')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    
                    <!-- INFORMACIÓN GENERAL -->
                    <div class="card mb-3">
                        <div class="card-header bg-light">
                            <strong>Información de la Solicitud</strong>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>Solicitado por:</strong><br>${data.solicitado_por}</p>
                                    <p><strong>Fecha Solicitud:</strong><br>${data.fecha_solicitud}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>Estado:</strong><br><span class="badge badge-${data.estado_solicitud === 'Pendiente' ? 'warning' : data.estado_solicitud === 'Aceptada' ? 'success' : 'danger'}">${data.estado_solicitud}</span></p>
                                </div>
                            </div>
                            <p><strong>Comentario:</strong><br><em>${data.comentario}</em></p>
                        </div>
                    </div>

                    <!-- INFORMACIÓN DE LA VENTA -->
                    <div class="card mb-3">
                        <div class="card-header bg-light">
                            <strong>Información de la Venta</strong>
                        </div>
                        <div class="card-body">
                            <p><strong>Código:</strong> ${data.venta_codigo}</p>
                            <p><strong>Cliente:</strong> ${data.cliente}</p>
                            <p><strong>Tipo de Pago:</strong> ${data.tipo_pago.charAt(0).toUpperCase() + data.tipo_pago.slice(1)}</p>
                            <p><strong>Total:</strong> Bs. ${parseFloat(data.total).toFixed(2)}</p>
                        </div>
                    </div>

                    <!-- DETALLES DE PRODUCTOS -->
                    <div class="card mb-3">
                        <div class="card-header bg-light">
                            <strong>Productos</strong>
                        </div>
                        <div class="table-responsive" style="max-height: 200px; overflow-y: auto;">
                            <table class="table table-sm mb-0">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Qty</th>
                                        <th>Precio</th>
                                        <th>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${ 
                                        data.detalles.map(d => `
                                            <tr>
                                                <td><small>${d.producto}</small></td>
                                                <td><small>${d.cantidad}</small></td>
                                                <td><small>Bs. ${parseFloat(d.precio).toFixed(2)}</small></td>
                                                <td><small>Bs. ${parseFloat(d.subtotal).toFixed(2)}</small></td>
                                            </tr>
                                        `).join('')
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- AMORTIZACIONES (si las hay) -->
                    ${
                        data.amortizaciones && data.amortizaciones.length > 0 ? `
                            <div class="card mb-3">
                                <div class="card-header bg-light">
                                    <strong>Amortizaciones Registradas</strong>
                                </div>
                                <div class="table-responsive" style="max-height: 200px; overflow-y: auto;">
                                    <table class="table table-sm mb-0">
                                        <thead>
                                            <tr>
                                                <th>Monto</th>
                                                <th>Fecha</th>
                                                <th>Comprobante</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${
                                                data.amortizaciones.map(a => `
                                                    <tr>
                                                        <td><small>Bs. ${parseFloat(a.monto).toFixed(2)}</small></td>
                                                        <td><small>${a.fecha}</small></td>
                                                        <td>
                                                            ${
                                                                a.comprobante ? `
                                                                    <a href="${a.comprobante}" target="_blank" class="btn btn-sm btn-outline-info">
                                                                        <i class="fas fa-image"></i> Ver
                                                                    </a>
                                                                ` : '<small class="text-muted">Sin comprobante</small>'
                                                            }
                                                        </td>
                                                    </tr>
                                                `).join('')
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ` : ''
                    }

                </div>
            </div>
        </div>
    `;

    const container = document.getElementById('modalContainer') || document.body;
    const div = document.createElement('div');
    div.innerHTML = html;
    container.appendChild(div.firstElementChild);
}

/**
 * Aceptar solicitud de anulación
 */
function aceptarSolicitud(solicitudId) {
    ModalSistema.formulario('Aceptar Solicitud de Anulación', [
        {
            name: 'comentario_respuesta',
            label: 'Comentario (opcional)',
            type: 'textarea',
            placeholder: 'Motivo de la aceptación...',
            required: false
        }
    ], {
        textoConfirmar: 'Aceptar y Anular Venta',
        onSubmit: (datos) => {
            procesarRespuesta(solicitudId, 'aceptar', datos.comentario_respuesta);
        }
    });
}

/**
 * Rechazar solicitud de anulación
 */
function rechazarSolicitud(solicitudId) {
    ModalSistema.formulario('Rechazar Solicitud de Anulación', [
        {
            name: 'comentario_respuesta',
            label: 'Motivo del rechazo',
            type: 'textarea',
            placeholder: 'Explica por qué rechazas esta solicitud...',
            required: true
        }
    ], {
        textoConfirmar: 'Rechazar',
        onSubmit: (datos) => {
            procesarRespuesta(solicitudId, 'rechazar', datos.comentario_respuesta);
        }
    });
}

/**
 * Procesar respuesta a solicitud
 */
function procesarRespuesta(solicitudId, accion, comentario) {
    ModalSistema.cargando(`${accion === 'aceptar' ? 'Aceptando' : 'Rechazando'} solicitud...`);

    const formData = new FormData();
    formData.append('accion', accion);
    formData.append('comentario_respuesta', comentario);

    const url = `${URLS.responder}${solicitudId}/responder/`;
    console.log('Posting to URL:', url); // Debug

    fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': getCSRFToken()
        }
    })
        .then(response => {
            console.log('Response status:', response.status); // Debug
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Response data:', data); // Debug
            ModalSistema.cerrar('modalCargando');
            if (data.success) {
                ModalSistema.notificar(
                    'Éxito',
                    data.message,
                    'success',
                    2000
                );
                // Recargar tabla después de 1.5s
                setTimeout(() => {
                    location.reload();
                }, 1500);
            } else {
                ModalSistema.notificar('Error', data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Full error:', error); // Debug completo
            ModalSistema.cerrar('modalCargando');
            ModalSistema.notificar('Error', 'Error al procesar respuesta: ' + error.message, 'danger');
        });
}

/**
 * Filtrar solicitudes por estado
 */
function filtrarSolicitudes() {
    const estado = document.getElementById('filtroEstado').value;
    const url = new URL(window.location);
    if (estado) {
        url.searchParams.set('estado', estado);
    } else {
        url.searchParams.delete('estado');
    }
    window.location.href = url.toString();
}

/**
 * Obtener token CSRF
 */
function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
        document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';
}
