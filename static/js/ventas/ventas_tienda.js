let ventaIdActual = null;

/**
 * Obtener token CSRF para peticiones seguras POST.
 */
function getCsrfToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue || document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
}

/**
 * Renderizar estructura HTML interna del modal de detalle de venta.
 */
function renderDetalleVentaTienda(data) {
    const etiqueta = data.moneda_simbolo || (data.moneda === 'USD' ? '$' : 'Bs.');
    const monedaDescripcion = data.moneda_descripcion || (data.moneda === 'USD' ? 'USD ($)' : 'BOB (Bs.)');

    let badgeEstado = '';
    if (data.estado === 'completada') {
        badgeEstado = '<span class="badge badge-estado badge-completada"><i class="fas fa-check-circle mr-1"></i>Completada</span>';
    } else if (data.estado === 'pendiente') {
        badgeEstado = '<span class="badge badge-estado badge-pendiente"><i class="fas fa-clock mr-1"></i>Pendiente</span>';
    } else if (data.estado === 'anulada') {
        badgeEstado = '<span class="badge badge-estado badge-cancelada"><i class="fas fa-times-circle mr-1"></i>Anulada</span>';
    } else {
        badgeEstado = `<span class="badge badge-secondary">${data.estado}</span>`;
    }

    let html = `
        <div class="detalle-info-grid">
            <div class="detalle-info-item">
                <div class="label">Cliente</div>
                <div class="value">${data.cliente || 'N/A'}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Tipo de Pago</div>
                <div class="value">${data.tipo_pago === 'credito' ? 'Crédito' : 'Contado'}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Total</div>
                <div class="value"><span class="font-weight-bold">${etiqueta} ${parseFloat(data.total).toFixed(2)}</span></div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Estado</div>
                <div class="value">${badgeEstado}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Moneda</div>
                <div class="value">${monedaDescripcion}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Origen</div>
                <div class="value">${data.resumen_tipos_vendedor?.label || 'Tienda'}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Descuento</div>
                <div class="value">${data.descuento_info?.resumen || 'Sin descuento'}</div>
            </div>
        </div>
        ${data.comentario ? `
            <div class="alert alert-light border mt-3 mb-0">
                <strong>Comentario:</strong> ${data.comentario}
            </div>
        ` : ''}
        <h6 class="font-weight-bold mt-3 mb-2">
            <i class="fas fa-list mr-1"></i> Productos vendidos
        </h6>
        <div class="table-responsive">
            <table class="table table-sm tabla-detalle-items">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th class="text-center">Origen</th>
                        <th class="text-center">Modalidad</th>
                        <th class="text-center">Cajas</th>
                        <th class="text-center">Cant.</th>
                        <th class="text-right">P. Unit.</th>
                        <th class="text-right">Subtotal</th>
                        <th class="text-right">Comisi&oacute;n</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (data.detalles && data.detalles.length > 0) {
        data.detalles.forEach(item => {
            html += `
                <tr>
                    <td><strong>${item.producto}</strong></td>
                    <td class="text-center">${item.tipo_vendedor_label || 'Tienda'}</td>
                    <td class="text-center">${item.modalidad_label || 'Unidad'}</td>
                    <td class="text-center">${item.cantidad_cajas || 0}</td>
                    <td class="text-center">${item.cantidad}</td>
                    <td class="text-right">${etiqueta} ${parseFloat(item.precio_unitario).toFixed(2)}</td>
                    <td class="text-right font-weight-bold">${etiqueta} ${parseFloat(item.subtotal).toFixed(2)}</td>
                    <td class="text-right">${etiqueta} ${parseFloat(item.comision_transporte || 0).toFixed(2)}</td>
                </tr>
            `;
        });
    }

    if (parseFloat(data.descuento || 0) > 0) {
        html += `
                    <tr>
                        <td colspan="7" class="text-right"><strong>Descuento:</strong></td>
                        <td class="text-right text-danger"><strong>- ${etiqueta} ${parseFloat(data.descuento).toFixed(2)}</strong></td>
                    </tr>
        `;
    }

    if (parseFloat(data.total_comision_transporte || 0) > 0) {
        html += `
                    <tr>
                        <td colspan="7" class="text-right"><strong>Total comisi&oacute;n de transporte:</strong></td>
                        <td class="text-right text-primary"><strong>+ ${etiqueta} ${parseFloat(data.total_comision_transporte).toFixed(2)}</strong></td>
                    </tr>
        `;
    }

    html += `
                    <tr class="total-row">
                        <td colspan="7" class="text-right"><strong>TOTAL:</strong></td>
                        <td class="text-right"><strong>${etiqueta} ${parseFloat(data.total).toFixed(2)}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    if (data.tipo_pago === 'credito' && data.mostrar_amortizaciones !== false) {
        html += `
            <div class="seccion-amortizaciones">
                <h6><i class="fas fa-hand-holding-usd mr-1"></i> Amortizaciones</h6>
        `;

        if (data.amortizaciones && data.amortizaciones.length > 0) {
            html += `
                <table class="table table-sm mb-2">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Moneda</th>
                            <th class="text-right">Monto</th>
                            <th>Observaciones</th>
                            <th>Comprobante</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.amortizaciones.forEach(a => {
                const comprobanteHtml = a.comprobante
                    ? `<button type="button" class="btn btn-link p-0 border-0 bg-transparent d-inline-block" title="Ver comprobante" onclick="abrirComprobanteModal('${a.comprobante}')">
                            <img src="${a.comprobante}" alt="Comprobante" class="comprobante-thumb">
                       </button>`
                    : '<span class="text-muted">Sin imagen</span>';

                html += `
                    <tr>
                        <td>${a.fecha}</td>
                        <td>${a.moneda_descripcion || monedaDescripcion}</td>
                        <td class="text-right font-weight-bold text-success">${a.moneda_simbolo || etiqueta} ${parseFloat(a.monto).toFixed(2)}</td>
                        <td>${a.observaciones || '-'}</td>
                        <td>${comprobanteHtml}</td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
        } else {
            html += '<p class="text-muted mb-2"><i class="fas fa-info-circle mr-1"></i>No hay amortizaciones registradas.</p>';
        }

        html += `
                <div class="d-flex justify-content-between mt-2">
                    <span><strong>Total amortizado:</strong> <span class="text-success">${etiqueta} ${parseFloat(data.total_amortizado).toFixed(2)}</span></span>
                    <span><strong>Saldo pendiente:</strong> <span class="text-danger">${etiqueta} ${parseFloat(data.saldo_pendiente).toFixed(2)}</span></span>
                </div>
            </div>
        `;
    }

    return html;
}

/**
 * Carga mediante Fetch API el detalle de una venta.
 */
function cargarDetalleVentaTienda(ventaId) {
    const body = document.getElementById('detalleVentaBody');
    const codigo = document.getElementById('detalleVentaCodigo');

    body.innerHTML = `
        <div class="text-center py-4">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p class="mt-2 text-muted">Cargando detalle...</p>
        </div>
    `;
    codigo.textContent = '...';

    fetch(`/ventas/api/venta/${ventaId}/detalle/`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
    })
        .then(response => response.json().then(data => ({ status: response.status, data })))
        .then(({ status, data }) => {
            if (status === 401) {
                throw new Error('Sesión expirada. Por favor, recarga la página.');
            }
            if (!data.success) {
                throw new Error(data.error || 'No se pudo cargar el detalle.');
            }

            codigo.textContent = data.data.venta_codigo;
            body.innerHTML = renderDetalleVentaTienda(data.data);
            $('#modalDetalleVenta').modal({backdrop: 'static', keyboard: false});
            $('#modalDetalleVenta').modal('show');
        })
        .catch(error => {
            body.innerHTML = `
                <div class="alert alert-danger mb-0">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    ${error.message}
                </div>
            `;
        });
}

/**
 * Consulta de datos de amortización de una venta específica.
 */
function cargarDatosAmortizacionTienda(ventaId) {
    return fetch(`/ventas/${ventaId}/ver/`, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error || 'No se pudo cargar el saldo pendiente.');
            }

            const etiqueta = data.moneda_simbolo || (data.moneda === 'USD' ? '$' : 'Bs.');
            const totalAmortizado = parseFloat(data.total_amortizado || 0);
            const saldoPendiente = parseFloat(data.saldo_pendiente || 0);

            document.getElementById('amortVentaTotal').textContent = `${etiqueta} ${parseFloat(data.total || 0).toFixed(2)}`;
            document.getElementById('amortTotalPagado').textContent = `${etiqueta} ${totalAmortizado.toFixed(2)}`;
            document.getElementById('amortSaldoPendiente').textContent = saldoPendiente.toFixed(2);
            document.getElementById('amortMonedaLabel').textContent = etiqueta;
            document.getElementById('amortMonedaLabel2').textContent = etiqueta;
            document.getElementById('amortMonedaVenta').textContent = data.moneda_descripcion || (data.moneda === 'USD' ? 'USD ($)' : 'BOB (Bs.)');
            document.getElementById('amortMonto').setAttribute('max', saldoPendiente);
        });
}

function abrirComprobanteModal(src) {
    const img = document.getElementById('imgComprobanteAmortizacion');
    img.src = src;
    $('#modalComprobanteAmortizacion').modal('show');
}

function limpiarPreviewAmortizacion() {
    const previewWrapper = document.getElementById('amortComprobantePreviewWrapper');
    const previewImg = document.getElementById('amortComprobantePreview');

    if (previewImg) {
        previewImg.removeAttribute('src');
    }

    if (previewWrapper) {
        previewWrapper.classList.add('d-none');
    }
}

function actualizarPreviewAmortizacion(input) {
    const previewWrapper = document.getElementById('amortComprobantePreviewWrapper');
    const previewImg = document.getElementById('amortComprobantePreview');
    const archivo = input.files && input.files[0];

    if (!archivo || !archivo.type.startsWith('image/')) {
        limpiarPreviewAmortizacion();
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        previewImg.src = event.target.result;
        previewWrapper.classList.remove('d-none');
    };
    reader.readAsDataURL(archivo);
}

// Inicialización de eventos DOM
document.addEventListener('DOMContentLoaded', function() {
    const inputAmortComprobante = document.getElementById('amortComprobante');

    // Botones de Detalle
    document.querySelectorAll('.btn-ver-detalle').forEach(btn => {
        btn.addEventListener('click', function () {
            const ventaId = this.getAttribute('data-venta-id');
            cargarDetalleVentaTienda(ventaId);
        });
    });

    // Botones de PDF
    document.querySelectorAll('.btn-generar-pdf-venta').forEach(btn => {
        btn.addEventListener('click', function () {
            const ventaId = this.getAttribute('data-venta-id');
            window.location.href = `/ventas/${ventaId}/pdf/`;
        });
    });

    // Botones Solicitud Anulación
    document.querySelectorAll('.btn-anular-venta').forEach(btn => {
        btn.addEventListener('click', function() {
            ventaIdActual = this.getAttribute('data-venta-id');
            document.getElementById('inputMotivoAnulacion').value = '';
            $('#modalAnularVenta').modal({backdrop: 'static', keyboard: false});
            $('#modalAnularVenta').modal('show');
        });
    });

    // Confirmación de Anulación
    const btnConfirmar = document.getElementById('btnConfirmarAnulacion');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', function() {
            const motivo = document.getElementById('inputMotivoAnulacion').value.trim();
            
            if (!motivo) {
                alert('Por favor, ingresa un motivo para la solicitud de anulación.');
                return;
            }
            
            const formData = new FormData();
            formData.append('comentario', motivo);
            formData.append('csrfmiddlewaretoken', getCsrfToken());
            
            this.disabled = true;
            const btnText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...';
            
            fetch(`/ventas/${ventaIdActual}/anular/`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Solicitud de anulación enviada correctamente.');
                    $('#modalAnularVenta').modal('hide');
                    setTimeout(() => location.reload(), 500);
                } else {
                    alert('Error: ' + (data.error || 'No se pudo procesar la solicitud'));
                    this.disabled = false;
                    this.innerHTML = btnText;
                }
            })
            .catch(error => {
                alert('Error de conexión: No se pudo procesar la solicitud.');
                console.error('Error:', error);
                this.disabled = false;
                this.innerHTML = btnText;
            });
        });
    }

    // Botones Registrar Amortización
    document.querySelectorAll('.btn-registrar-amortizacion').forEach(btn => {
        btn.addEventListener('click', function() {
            const ventaId = this.getAttribute('data-venta-id');
            const ventaCodigo = this.getAttribute('data-venta-codigo');
            
            document.getElementById('amortVentaId').value = ventaId;
            document.getElementById('amortVentaCodigo').textContent = ventaCodigo;
            document.getElementById('formAmortizacion').reset();
            document.getElementById('amortVentaTotal').textContent = 'Cargando...';
            document.getElementById('amortTotalPagado').textContent = 'Cargando...';
            document.getElementById('amortSaldoPendiente').textContent = '0.00';
            document.getElementById('amortMonedaLabel').textContent = '...';
            document.getElementById('amortMonedaLabel2').textContent = '...';
            document.getElementById('amortMonedaVenta').textContent = 'Cargando moneda...';
            limpiarPreviewAmortizacion();

            $('#modalAmortizacion').modal({backdrop: 'static', keyboard: false});
            $('#modalAmortizacion').modal('show');
            cargarDatosAmortizacionTienda(ventaId)
                .catch(error => {
                    alert('Error: ' + (error.message || 'No se pudo cargar los datos de la venta.'));
                    console.error('Error:', error);
                    $('#modalAmortizacion').modal('hide');
                });
        });
    });

    // Vista previa de comprobante
    if (inputAmortComprobante) {
        inputAmortComprobante.addEventListener('change', function() {
            actualizarPreviewAmortizacion(this);
        });
    }

    $('#modalAmortizacion').on('hidden.bs.modal', function() {
        limpiarPreviewAmortizacion();
    });

    // Bootstrap aplica aria-hidden al modal durante el cierre. Retirar el foco
    // antes evita que un botón interno quede oculto para lectores de pantalla.
    $('#modalDetalleVenta, #modalAmortizacion').on('hide.bs.modal', function() {
        if (this.contains(document.activeElement)) {
            document.activeElement.blur();
        }
    });

    // Guardar Amortización
    const btnGuardarAmortizacion = document.getElementById('btnGuardarAmortizacion');
    if (btnGuardarAmortizacion) {
        btnGuardarAmortizacion.addEventListener('click', function() {
            const ventaId = document.getElementById('amortVentaId').value;
            const monto = document.getElementById('amortMonto').value;
            const observaciones = document.getElementById('amortObservaciones').value;
            const comprobante = document.getElementById('amortComprobante').files[0];

            if (!monto || parseFloat(monto) <= 0) {
                alert('Por favor, ingresa un monto válido.');
                return;
            }

            if (!comprobante) {
                alert('Por favor, sube una fotografía del comprobante.');
                return;
            }

            const formData = new FormData();
            formData.append('monto', monto);
            formData.append('observaciones', observaciones);
            formData.append('comprobante', comprobante);
            formData.append('csrfmiddlewaretoken', getCsrfToken());

            this.disabled = true;
            const btnText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Procesando...';

            fetch(`/ventas/${ventaId}/registrar-amortizacion/`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Pago registrado correctamente.');
                    $('#modalAmortizacion').modal('hide');
                    setTimeout(() => location.reload(), 500);
                } else {
                    alert('Error: ' + (data.error || 'No se pudo registrar el pago'));
                    this.disabled = false;
                    this.innerHTML = btnText;
                }
            })
            .catch(error => {
                alert('Error de conexión: No se pudo registrar el pago.');
                console.error('Error:', error);
                this.disabled = false;
                this.innerHTML = btnText;
            });
        });
    }
});
