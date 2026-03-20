let solicitudActivaId = null;
let accionActiva = null;

function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
        document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';
}

function notificar(icon, title, text, onClose = null) {
    if (window.Swal) {
        Swal.fire({ icon, title, text }).then(() => {
            if (typeof onClose === 'function') {
                onClose();
            }
        });
        return;
    }

    alert(`${title}: ${text}`);
    if (typeof onClose === 'function') {
        onClose();
    }
}

function renderBadgeEstado(estado) {
    const estadoNormalizado = (estado || '').toLowerCase();

    if (estadoNormalizado === 'aceptada') {
        return '<span class="badge badge-estado badge-completada"><i class="fas fa-check-circle mr-1"></i>Aceptada</span>';
    }
    if (estadoNormalizado === 'rechazada') {
        return '<span class="badge badge-estado badge-cancelada"><i class="fas fa-times-circle mr-1"></i>Rechazada</span>';
    }
    return '<span class="badge badge-estado badge-pendiente"><i class="fas fa-clock mr-1"></i>Pendiente</span>';
}

function renderDetalleSolicitud(data) {
    const etiqueta = data.moneda_simbolo || (data.moneda === 'USD' ? '$' : 'Bs.');
    const monedaDescripcion = data.moneda_descripcion || (data.moneda === 'USD' ? 'USD ($)' : 'BOB (Bs.)');
    const comentario = data.comentario || 'Sin comentario registrado.';
    const comentarioRespuesta = data.comentario_respuesta || 'Sin comentario de respuesta.';

    let html = `
        <div class="detalle-info-grid mb-3">
            <div class="detalle-info-item">
                <div class="label">Solicitado por</div>
                <div class="value">${data.solicitado_por || 'N/D'}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Fecha de solicitud</div>
                <div class="value">${data.fecha_solicitud || 'N/D'}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Estado</div>
                <div class="value">${renderBadgeEstado(data.estado_solicitud)}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Respondido por</div>
                <div class="value">${data.respondido_por || 'Pendiente'}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Fecha de respuesta</div>
                <div class="value">${data.fecha_respuesta || 'Pendiente'}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Moneda</div>
                <div class="value">${monedaDescripcion}</div>
            </div>
        </div>

        <div class="solicitud-resumen mb-3">
            <div class="titulo">Comentario de solicitud</div>
            <p class="texto">${comentario}</p>
        </div>
    `;

    if (data.respondido_por) {
        html += `
            <div class="solicitud-resumen mb-3">
                <div class="titulo">Comentario de respuesta</div>
                <p class="texto">${comentarioRespuesta}</p>
            </div>
        `;
    }

    html += `
        <div class="detalle-info-grid mb-3">
            <div class="detalle-info-item">
                <div class="label">Venta</div>
                <div class="value">${data.venta_codigo || 'N/D'}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Cliente</div>
                <div class="value">${data.cliente || 'N/D'}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Tipo de pago</div>
                <div class="value">${data.tipo_pago === 'credito' ? 'Crédito' : 'Contado'}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Estado de venta</div>
                <div class="value">${data.estado_venta || 'N/D'}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Total</div>
                <div class="value"><strong>${etiqueta} ${parseFloat(data.total || 0).toFixed(2)}</strong></div>
            </div>
        </div>

        <h6 class="font-weight-bold mt-3 mb-2">
            <i class="fas fa-boxes mr-1"></i> Productos de la venta
        </h6>
        <div class="table-responsive">
            <table class="table table-sm detalle-solicitud-tabla">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th class="text-center">Cant.</th>
                        <th class="text-right">P. Unit.</th>
                        <th class="text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (data.detalles && data.detalles.length > 0) {
        data.detalles.forEach(item => {
            html += `
                <tr>
                    <td><strong>${item.producto}</strong></td>
                    <td class="text-center">${item.cantidad}</td>
                    <td class="text-right">${etiqueta} ${parseFloat(item.precio || 0).toFixed(2)}</td>
                    <td class="text-right font-weight-bold">${etiqueta} ${parseFloat(item.subtotal || 0).toFixed(2)}</td>
                </tr>
            `;
        });
    } else {
        html += `
            <tr>
                <td colspan="4" class="text-center text-muted py-3">No hay productos para mostrar.</td>
            </tr>
        `;
    }

    html += `
                </tbody>
            </table>
        </div>
    `;

    if (data.amortizaciones && data.amortizaciones.length > 0) {
        html += `
            <h6 class="font-weight-bold mt-4 mb-2">
                <i class="fas fa-hand-holding-usd mr-1"></i> Amortizaciones registradas
            </h6>
            <div class="table-responsive">
                <table class="table table-sm detalle-solicitud-tabla">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Moneda</th>
                            <th class="text-right">Monto</th>
                            <th>Observaciones</th>
                            <th class="text-center">Comprobante</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.amortizaciones.forEach(item => {
            html += `
                <tr>
                    <td>${item.fecha || '-'}</td>
                    <td>${item.moneda_descripcion || monedaDescripcion}</td>
                    <td class="text-right font-weight-bold text-success">${item.moneda_simbolo || etiqueta} ${parseFloat(item.monto || 0).toFixed(2)}</td>
                    <td>${item.observaciones || '-'}</td>
                    <td class="text-center">
                        ${item.comprobante
                            ? `<a href="${item.comprobante}" target="_blank" class="btn btn-outline-info btn-sm"><i class="fas fa-image mr-1"></i>Ver</a>`
                            : '<span class="text-muted">Sin archivo</span>'}
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    } else if (data.tipo_pago === 'credito') {
        html += `
            <div class="detalle-solicitud-vacio mt-3">
                <i class="fas fa-info-circle mr-1"></i>No hay amortizaciones registradas para esta venta.
            </div>
        `;
    }

    return html;
}

function cargarDetalleSolicitud(solicitudId) {
    const body = document.getElementById('detalleSolicitudBody');
    const codigo = document.getElementById('detalleSolicitudCodigo');

    body.innerHTML = `
        <div class="text-center py-4">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p class="mt-2 text-muted">Cargando detalle...</p>
        </div>
    `;
    codigo.textContent = '...';

    $('#modalDetalleSolicitud').modal({ backdrop: 'static', keyboard: false });
    $('#modalDetalleSolicitud').modal('show');

    fetch(`/ventas/solicitudes/${solicitudId}/detalle/`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
    })
        .then(response => response.json().then(data => ({ status: response.status, data })))
        .then(({ status, data }) => {
            if (status >= 400 || data.success === false) {
                throw new Error(data.error || 'No se pudo cargar el detalle de la solicitud.');
            }

            codigo.textContent = data.venta_codigo || `#${solicitudId}`;
            body.innerHTML = renderDetalleSolicitud(data);
        })
        .catch(error => {
            body.innerHTML = `
                <div class="alert alert-danger mb-0">
                    <i class="fas fa-exclamation-triangle mr-2"></i>${error.message}
                </div>
            `;
        });
}

function abrirModalRespuesta(solicitudId, accion) {
    solicitudActivaId = solicitudId;
    accionActiva = accion;

    const titulo = document.getElementById('modalRespuestaTitulo');
    const header = document.getElementById('modalRespuestaHeader');
    const resumen = document.getElementById('respuestaSolicitudResumen');
    const label = document.getElementById('labelComentarioRespuesta');
    const ayuda = document.getElementById('textoAyudaRespuesta');
    const input = document.getElementById('inputComentarioRespuesta');
    const boton = document.getElementById('btnConfirmarRespuestaSolicitud');

    input.value = '';
    header.classList.remove('modal-header-respuesta-aceptar', 'modal-header-respuesta-rechazar');

    if (accion === 'aceptar') {
        titulo.textContent = 'Aceptar solicitud de anulación';
        header.classList.add('modal-header-respuesta-aceptar');
        resumen.innerHTML = `
            <div class="titulo">La venta será anulada si confirmas.</div>
            <p class="texto">Usa este paso solo cuando ya hayas validado la solicitud y quieras cerrar definitivamente la venta.</p>
        `;
        label.textContent = 'Comentario de aceptación (opcional)';
        ayuda.textContent = 'Puedes dejar una nota interna para el historial.';
        input.placeholder = 'Motivo de la aceptación...';
        boton.className = 'btn btn-success btn-sm';
        boton.innerHTML = '<i class="fas fa-check mr-1"></i>Aceptar y anular';
    } else {
        titulo.textContent = 'Rechazar solicitud de anulación';
        header.classList.add('modal-header-respuesta-rechazar');
        resumen.innerHTML = `
            <div class="titulo">Esta solicitud quedará rechazada.</div>
            <p class="texto">Indica el motivo para que la tienda tenga trazabilidad clara de la decisión.</p>
        `;
        label.textContent = 'Motivo del rechazo';
        ayuda.textContent = 'Este comentario es obligatorio para rechazar.';
        input.placeholder = 'Explica por qué rechazas esta solicitud...';
        boton.className = 'btn btn-danger btn-sm';
        boton.innerHTML = '<i class="fas fa-times mr-1"></i>Rechazar';
    }

    $('#modalRespuestaSolicitud').modal({ backdrop: 'static', keyboard: false });
    $('#modalRespuestaSolicitud').modal('show');
}

function procesarRespuestaSolicitud() {
    const comentario = (document.getElementById('inputComentarioRespuesta').value || '').trim();
    const boton = document.getElementById('btnConfirmarRespuestaSolicitud');

    if (!solicitudActivaId || !accionActiva) {
        notificar('error', 'Error', 'No hay una solicitud seleccionada.');
        return;
    }

    if (accionActiva === 'rechazar' && !comentario) {
        notificar('warning', 'Comentario requerido', 'Debes indicar el motivo del rechazo.');
        return;
    }

    const formData = new FormData();
    formData.append('accion', accionActiva);
    formData.append('comentario_respuesta', comentario);

    boton.disabled = true;
    const textoOriginal = boton.innerHTML;
    boton.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Procesando...';

    fetch(`/ventas/solicitudes/${solicitudActivaId}/responder/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': getCSRFToken(),
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
    })
        .then(response => response.json().then(data => ({ status: response.status, data })))
        .then(({ status, data }) => {
            if (status >= 400 || !data.success) {
                throw new Error(data.error || 'No se pudo procesar la solicitud.');
            }

            $('#modalRespuestaSolicitud').modal('hide');
            notificar('success', 'Operación realizada', data.message, () => {
                window.location.reload();
            });
        })
        .catch(error => {
            notificar('error', 'Error', error.message);
        })
        .finally(() => {
            boton.disabled = false;
            boton.innerHTML = textoOriginal;
        });
}

function filtrarSolicitudes() {
    const estado = document.getElementById('filtroEstado').value;
    const url = new URL(window.location.href);

    if (estado) {
        url.searchParams.set('estado', estado);
    } else {
        url.searchParams.delete('estado');
    }

    window.location.href = url.toString();
}

window.cargarDetalleSolicitud = cargarDetalleSolicitud;
window.abrirModalRespuesta = abrirModalRespuesta;
window.procesarRespuestaSolicitud = procesarRespuestaSolicitud;
window.filtrarSolicitudes = filtrarSolicitudes;
