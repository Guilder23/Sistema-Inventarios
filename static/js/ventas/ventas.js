/**
 * Lógica para la página principal de ventas (listado, tabs, filtros, modales)
 * Usa las URLs del proyecto:
 *   - /ventas/<id>/ver/          para ver detalle (GET AJAX)
 *   - /ventas/<venta_id>/amortizacion/ para registrar amortización (POST AJAX)
 *   - /ventas/<id>/anular/       para anular venta (POST AJAX)
 */

// UTILIDAD: CSRF TOKEN
function getCookie(name) {
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
    return cookieValue;
}

/**
 * Wrapper para fetch con CSRF token incluido
 */
async function fetchConCSRF(url, options = {}) {
    const csrfToken = getCookie('csrftoken');
    const headers = {
        'X-CSRFToken': csrfToken,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };
    const response = await fetch(url, { ...options, headers });
    return response;
}


// INICIALIZACIÓN
$(document).ready(function () {
    initFiltrosBusqueda();
    initFiltrosEstado();
    initBotonesDetalle();
    initBotonesPDF();
    initBotonesAmortizacion();
});

// FILTROS DE BÚSQUEDA EN TABLAS
function initFiltrosBusqueda() {
    $('.filtro-tabla').on('keyup', function () {
        const texto = $(this).val().toLowerCase();
        const tablaId = $(this).data('tabla');
        const $tabla = $('#' + tablaId);

        $tabla.find('tbody tr').each(function () {
            const contenido = $(this).text().toLowerCase();
            $(this).toggle(contenido.indexOf(texto) > -1);
        });
    });
}

// FILTRO POR ESTADO (SELECT)
function initFiltrosEstado() {
    $('.filtro-estado').on('change', function () {
        const estado = $(this).val();
        const tablaId = $(this).data('tabla');
        const $tabla = $('#' + tablaId);

        $tabla.find('tbody tr').each(function () {
            if (!estado) {
                $(this).show();
            } else {
                const rowEstado = $(this).data('estado');
                $(this).toggle(rowEstado === estado);
            }
        });
    });
}

// MODAL: VER DETALLE DE VENTA
function initBotonesDetalle() {
    $(document).on('click', '.btn-ver-detalle', function () {
        const ventaId = $(this).data('venta-id');
        cargarDetalleVenta(ventaId);
    });
}

function cargarDetalleVenta(ventaId) {
    const $modal = $('#modalDetalleVenta');
    const $body = $('#detalleVentaBody');
    const $codigo = $('#detalleVentaCodigo');

// Mostrar loading
    $body.html(`
        <div class="text-center py-4">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p class="mt-2 text-muted">Cargando detalle...</p>
        </div>
    `);
    $codigo.text('...');
    $modal.modal('show');

// NOTA: URL usa el patrón /ventas/<id>/ver/ de tu urls.py
    fetch(`/ventas/${ventaId}/ver/`)
        .then(res => res.json())
        .then(data => {
            $codigo.text(data.venta.codigo);
            $body.html(renderDetalleVenta(data));
        })
        .catch(err => {
            $body.html(`
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    Error al cargar el detalle de la venta.
                </div>
            `);
            console.error('Error cargando detalle:', err);
        });
}

function renderDetalleVenta(data) {
    const v = data.venta;

// Badge de estado
    let badgeEstado = '';
    if (v.estado_raw === 'completada') {
        badgeEstado = '<span class="badge badge-estado badge-completada"><i class="fas fa-check-circle mr-1"></i>' + v.estado + '</span>';
    } else if (v.estado_raw === 'pendiente') {
        badgeEstado = '<span class="badge badge-estado badge-pendiente"><i class="fas fa-clock mr-1"></i>' + v.estado + '</span>';
    } else {
        badgeEstado = '<span class="badge badge-estado badge-cancelada"><i class="fas fa-times-circle mr-1"></i>' + v.estado + '</span>';
    }

// Info grid
    let html = `
        <div class="detalle-info-grid">
            <div class="detalle-info-item">
                <div class="label">Cliente</div>
                <div class="value">${v.cliente}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Tipo de Pago</div>
                <div class="value">${v.tipo_pago}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Fecha</div>
                <div class="value">${v.fecha}</div>
            </div>
            <div class="detalle-info-item">
                <div class="label">Estado</div>
                <div class="value">${badgeEstado}</div>
            </div>
    `;

// Mostrar teléfono, razón social y dirección si existen
    if (v.telefono) {
        html += `
            <div class="detalle-info-item">
                <div class="label">Teléfono</div>
                <div class="value">${v.telefono}</div>
            </div>
        `;
    }
    if (v.razon_social) {
        html += `
            <div class="detalle-info-item">
                <div class="label">Razón Social</div>
                <div class="value">${v.razon_social}</div>
            </div>
        `;
    }

    html += `</div>`;

    if (v.direccion) {
        html += `
            <div class="mb-3">
                <small class="text-muted text-uppercase font-weight-bold">Dirección</small>
                <p class="mb-0">${v.direccion}</p>
            </div>
        `;
    }

    if (v.vendedor) {
        html += `
            <div class="mb-3">
                <small class="text-muted text-uppercase font-weight-bold">Vendedor</small>
                <p class="mb-0">${v.vendedor}</p>
            </div>
        `;
    }

// Tabla de items
    html += `
        <h6 class="font-weight-bold mt-3 mb-2">
            <i class="fas fa-list mr-1"></i> Productos vendidos
        </h6>
        <div class="table-responsive">
            <table class="table table-sm tabla-detalle-items">
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

    data.items.forEach(item => {
        html += `
            <tr>
                <td>
                    <strong>${item.producto_nombre}</strong>
                    <br><small class="text-muted">${item.producto_codigo}</small>
                </td>
                <td class="text-center">${item.cantidad}</td>
                <td class="text-right">Bs. ${parseFloat(item.precio_unitario).toFixed(2)}</td>
                <td class="text-right font-weight-bold">Bs. ${parseFloat(item.subtotal).toFixed(2)}</td>
            </tr>
        `;
    });

    html += `
                    <tr class="total-row">
                        <td colspan="3" class="text-right">TOTAL:</td>
                        <td class="text-right">Bs. ${parseFloat(v.total).toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

// Sección de amortizaciones (solo crédito)
    if (v.tipo_pago_raw === 'credito') {
        html += `
            <div class="seccion-amortizaciones">
                <h6><i class="fas fa-hand-holding-usd mr-1"></i> Amortizaciones</h6>
        `;

        if (data.amortizaciones.length > 0) {
            html += `
                <table class="table table-sm mb-2">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th class="text-right">Monto</th>
                            <th>Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            data.amortizaciones.forEach(a => {
                html += `
                    <tr>
                        <td>${a.fecha}</td>
                        <td class="text-right font-weight-bold text-success">Bs. ${parseFloat(a.monto).toFixed(2)}</td>
                        <td>${a.observaciones || '-'}</td>
                    </tr>
                `;
            });
            html += `</tbody></table>`;
        } else {
            html += `<p class="text-muted mb-2"><i class="fas fa-info-circle mr-1"></i>No hay amortizaciones registradas.</p>`;
        }

        html += `
                <div class="d-flex justify-content-between mt-2">
                    <span><strong>Total amortizado:</strong> <span class="text-success">Bs. ${parseFloat(data.total_amortizado).toFixed(2)}</span></span>
                    <span><strong>Saldo pendiente:</strong> <span class="text-danger">Bs. ${parseFloat(data.saldo_pendiente).toFixed(2)}</span></span>
                </div>
            </div>
        `;
    }

    return html;
}

// MODAL: REGISTRAR AMORTIZACIÓN
function initBotonesAmortizacion() {
    // Abrir modal
    $(document).on('click', '.btn-registrar-amortizacion', function () {
        const ventaId = $(this).data('venta-id');
        const ventaCodigo = $(this).data('venta-codigo');
        const ventaTotal = $(this).data('venta-total');

        $('#amortVentaId').val(ventaId);
        $('#amortVentaCodigo').text(ventaCodigo);
        $('#amortVentaTotal').text('Bs. ' + parseFloat(ventaTotal).toFixed(2));
        $('#amortMonto').val('');
        $('#amortObservaciones').val('');

// Cargar datos actuales de amortización
        cargarDatosAmortizacion(ventaId);

        $('#modalAmortizacion').modal('show');
    });

// Guardar amortización
    $('#btnGuardarAmortizacion').on('click', function () {
        guardarAmortizacion();
    });
}

function cargarDatosAmortizacion(ventaId) {
//OJO: URL usa /ventas/<id>/ver/ para obtener datos de amortización
    fetch(`/ventas/${ventaId}/ver/`)
        .then(res => res.json())
        .then(data => {
            $('#amortTotalPagado').text('Bs. ' + parseFloat(data.total_amortizado).toFixed(2));
            $('#amortSaldoPendiente').text('Bs. ' + parseFloat(data.saldo_pendiente).toFixed(2));

// Establecer max del input
            const saldo = parseFloat(data.saldo_pendiente);
            $('#amortMonto').attr('max', saldo);
        })
        .catch(err => {
            console.error('Error cargando datos de amortización:', err);
        });
}

function guardarAmortizacion() {
    const ventaId = $('#amortVentaId').val();
    const monto = $('#amortMonto').val();
    const observaciones = $('#amortObservaciones').val();
    const comprobante = document.getElementById('amortComprobante').files[0];

    // Validaciones
    if (!monto || parseFloat(monto) <= 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Monto inválido',
            text: 'Ingrese un monto mayor a 0.',
        });
        return;
    }

    if (!comprobante) {
        Swal.fire({
            icon: 'warning',
            title: 'Comprobante requerido',
            text: 'Debe seleccionar una fotografía como evidencia.',
        });
        return;
    }

    // Validar tipo de archivo
    if (!comprobante.type.startsWith('image/')) {
        Swal.fire({
            icon: 'warning',
            title: 'Tipo de archivo inválido',
            text: 'Por favor, seleccione una imagen.',
        });
        return;
    }

    const $btn = $('#btnGuardarAmortizacion');
    $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i>Guardando...');

    // Crear FormData para enviar archivo + datos
    const formData = new FormData();
    formData.append('monto', monto);
    formData.append('observaciones', observaciones);
    formData.append('comprobante', comprobante);

    // URL: /ventas/<venta_id>/amortizacion/
    const csrfToken = getCookie('csrftoken');
    fetch(`/ventas/${ventaId}/amortizacion/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
        },
        body: formData, // Enviar FormData, no JSON
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                $('#modalAmortizacion').modal('hide');
                Swal.fire({
                    icon: 'success',
                    title: 'Amortización registrada',
                    text: data.message,
                    timer: 2000,
                    showConfirmButton: false,
                }).then(() => {
                    location.reload();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.error,
                });
            }
        })
        .catch(err => {
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'No se pudo conectar con el servidor.',
            });
            console.error('Error guardando amortización:', err);
        })
        .finally(() => {
            $btn.prop('disabled', false).html('<i class="fas fa-save mr-1"></i>Registrar Pago');
        });
}

// BOTONES PDF: GENERAR PDF DE UNA VENTA INDIVIDUAL
function initBotonesPDF() {
    $(document).on('click', '.btn-generar-pdf-venta', function () {
        const ventaId = $(this).data('venta-id');
        generarPDFVenta(ventaId);
    });
}

function generarPDFVenta(ventaId) {
    // Redirigir a la URL de descarga de PDF
    window.location.href = `/ventas/${ventaId}/pdf/`;
}

function anularVenta(ventaId) {
//OJO: URL usa /ventas/<id>/anular/ de tu urls.py
    fetchConCSRF(`/ventas/${ventaId}/anular/`, {
        method: 'POST',
        body: JSON.stringify({}),
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Venta anulada',
                    text: data.message,
                    timer: 2000,
                    showConfirmButton: false,
                }).then(() => {
                    location.reload();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.error,
                });
            }
        })
        .catch(err => {
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'No se pudo conectar con el servidor.',
            });
            console.error('Error anulando venta:', err);
        });
}
