    // ================================================================
// HISTORIAL.JS — Ventas, Traspasos, Movimientos
// ================================================================
document.addEventListener('DOMContentLoaded', function () {

    // ── 1. REFERENCIAS HTML ──────────────────────────────────────
    const tablaHead     = document.getElementById('tablaHead');
    const tablaBody     = document.getElementById('tablaBody');
    const filtroBuscar  = document.getElementById('filtroBuscar');
    const filtroEstado  = document.getElementById('filtroEstado');
    const filtroExtra   = document.getElementById('filtroExtra');
    const filtroDesde   = document.getElementById('filtroFechaDesde');
    const filtroHasta   = document.getElementById('filtroFechaHasta');
    const btnLimpiar    = document.getElementById('btnLimpiar');
    const btnAnterior   = document.querySelector('#btnAnterior .page-link');
    const btnSiguiente  = document.querySelector('#btnSiguiente .page-link');
    const totalReg      = document.getElementById('totalRegistros');
    const mostDesde     = document.getElementById('mostrandoDesde');
    const mostHasta     = document.getElementById('mostrandoHasta');

    // ── 2. ESTADO ────────────────────────────────────────────────
    let tabActiva  = 'ventas';
    let paginaNext = null;
    let paginaPrev = null;
    let paginaActual = 1;
    const POR_PAGINA = 10;

    // ── 3. CONFIGURACIÓN POR PESTAÑA ─────────────────────────────
    const CONFIG = {
        ventas: {
            url: '/reportes/historial/api/ventas/',
            columnas: ['Código', 'Cliente', 'Vendedor', 'Ubicación', 'Tipo Pago', 'Estado', 'Total', 'Fecha', 'Acciones'],
            estados: [
                { value: 'pendiente',   label: 'Pendiente' },
                { value: 'completada',  label: 'Completada' },
                { value: 'cancelada',   label: 'Cancelada' },
            ],
            extras: {
                label: 'Tipo de pago',
                param: 'tipo_pago',
                opciones: [
                    { value: 'contado',  label: 'Contado' },
                    { value: 'credito',  label: 'Crédito' },
                ]
            },
            renderFila: renderFilaVenta,
            renderModal: renderModalVenta,
        },
        traspasos: {
            url: '/reportes/historial/api/traspasos/',
            columnas: ['Código', 'Tipo', 'Origen', 'Destino', 'Estado', 'Total', 'Fecha', 'Acciones'],
            estados: [
                { value: 'pendiente',  label: 'Pendiente' },
                { value: 'transito',   label: 'En Tránsito' },
                { value: 'recibido',   label: 'Recibido' },
                { value: 'rechazado',  label: 'Rechazado' },
                { value: 'cancelado',  label: 'Cancelado' },
            ],
            extras: {
                label: 'Tipo',
                param: 'tipo',
                opciones: [
                    { value: 'normal',     label: 'Normal' },
                    { value: 'devolucion', label: 'Devolución' },
                ]
            },
            renderFila: renderFilaTraspaso,
            renderModal: renderModalTraspaso,
        },
        movimientos: {
            url: '/reportes/historial/api/movimientos/',
            columnas: ['Producto', 'Código', 'Tipo', 'Cantidad', 'Ubicación', 'Fecha'],
            estados: [],
            extras: {
                label: 'Tipo',
                param: 'tipo',
                opciones: []   // se pueden agregar según los tipos de tu modelo
            },
            renderFila: renderFilaMovimiento,
            renderModal: null,
        },
    };

    // ── 4. CAMBIO DE PESTAÑA ─────────────────────────────────────
    document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            document.querySelectorAll('.nav-link[data-tab]').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            tabActiva = link.dataset.tab;
            actualizarFiltrosUI();
            cargarDatos();
        });
    });

    function actualizarFiltrosUI() {
        const cfg = CONFIG[tabActiva];

        // Limpiar y rellenar estado
        filtroEstado.innerHTML = '<option value="">Todos los estados</option>';
        cfg.estados.forEach(op => {
            filtroEstado.innerHTML += `<option value="${op.value}">${op.label}</option>`;
        });

        // Limpiar y rellenar extra
        filtroExtra.innerHTML = `<option value="">Todos los tipos</option>`;
        cfg.extras.opciones.forEach(op => {
            filtroExtra.innerHTML += `<option value="${op.value}">${op.label}</option>`;
        });

        // Ocultar estado si no tiene opciones
        filtroEstado.closest('.col-md-2').style.display =
            cfg.estados.length ? '' : 'none';
        filtroExtra.closest('.col-md-2').style.display =
            cfg.extras.opciones.length ? '' : 'none';
    }

    // ── 5. CARGA DE DATOS ────────────────────────────────────────
    function cargarDatos(pagina = null) {
        const cfg = CONFIG[tabActiva];

        if (!pagina) {
            paginaNext   = null;
            paginaPrev   = null;
            paginaActual = 1;
        } else {
            paginaActual = parseInt(pagina);
        }

        const params = {
            search:      filtroBuscar.value.trim(),
            estado:      filtroEstado.value,
            fecha_desde: filtroDesde.value,
            fecha_hasta: filtroHasta.value,
        };
        params[cfg.extras.param] = filtroExtra.value;
        if (pagina) params.page = pagina;

        // Loading state
        tablaBody.innerHTML = `
            <tr>
                <td colspan="${cfg.columnas.length}" class="text-center py-4 text-muted">
                    <i class="fas fa-spinner fa-spin mr-2"></i> Cargando...
                </td>
            </tr>`;

        axios.get(cfg.url, { params })
            .then(res => {
                const data = res.data;
                paginaNext = extraerPagina(data.next);
                paginaPrev = extraerPagina(data.previous);

                renderCabecera(cfg.columnas);
                renderTabla(data.results, cfg.renderFila, cfg.columnas.length);
                actualizarPaginacion(data);
            })
            .catch(err => {
                console.error('❌ Error:', err);
                tablaBody.innerHTML = `
                    <tr>
                        <td colspan="${cfg.columnas.length}" class="text-center py-4 text-danger">
                            <i class="fas fa-exclamation-circle mr-2"></i> Error al cargar datos
                        </td>
                    </tr>`;
            });
    }

    // ── 6. RENDER CABECERA ───────────────────────────────────────
    function renderCabecera(columnas) {
        tablaHead.innerHTML = `
            <tr>${columnas.map(c => `<th>${c}</th>`).join('')}</tr>
        `;
    }

    // ── 7. RENDER TABLA ──────────────────────────────────────────
    function renderTabla(items, renderFila, numCols) {
        if (!items || items.length === 0) {
            tablaBody.innerHTML = `
                <tr>
                    <td colspan="${numCols}" class="text-center py-4 text-muted">
                        <i class="fas fa-search mr-2"></i> No se encontraron registros
                    </td>
                </tr>`;
            return;
        }
        tablaBody.innerHTML = '';
        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = renderFila(item);
            tablaBody.appendChild(tr);
        });

        // Guardar datos para el modal
        window.historialDatos = items;
    }

    // ── 8. RENDER FILAS POR TIPO ─────────────────────────────────
    function renderFilaVenta(v) {
        const estadoBadge = {
            pendiente:  'warning',
            completada: 'success',
            cancelada:  'danger',
        }[v.estado] || 'secondary';

        return `
            <td><strong>${v.codigo}</strong></td>
            <td>${v.cliente}</td>
            <td>${v.vendedor}</td>
            <td>${v.ubicacion}</td>
            <td><span class="badge badge-light">${v.tipo_pago_display}</span></td>
            <td><span class="badge badge-${estadoBadge}">${v.estado_display}</span></td>
            <td><strong>Bs. ${parseFloat(v.total).toFixed(2)}</strong></td>
            <td class="text-muted small">${v.fecha}</td>
            <td class="text-center">
                <button class="btn btn-info btn-sm btn-detalle" data-id="${v.id}" data-tipo="ventas">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
    }

    function renderFilaTraspaso(t) {
        const estadoBadge = {
            pendiente: 'warning',
            transito:  'info',
            recibido:  'success',
            rechazado: 'danger',
            cancelado: 'secondary',
        }[t.estado] || 'secondary';

        return `
            <td><strong>${t.codigo}</strong></td>
            <td><span class="badge badge-light">${t.tipo_display}</span></td>
            <td>${t.origen}</td>
            <td>${t.destino}</td>
            <td><span class="badge badge-${estadoBadge}">${t.estado_display}</span></td>
            <td><strong>Bs. ${parseFloat(t.total).toFixed(2)}</strong></td>
            <td class="text-muted small">${t.fecha}</td>
            <td class="text-center">
                <button class="btn btn-info btn-sm btn-detalle" data-id="${t.id}" data-tipo="traspasos">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
    }

    function renderFilaMovimiento(m) {
        return `
            <td>${m.producto_nombre}</td>
            <td><strong>${m.producto_codigo}</strong></td>
            <td><span class="badge badge-light">${m.tipo}</span></td>
            <td>${m.cantidad}</td>
            <td>${m.ubicacion}</td>
            <td class="text-muted small">${m.fecha}</td>
        `;
    }

    // ── 9. MODAL DETALLE ─────────────────────────────────────────
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.btn-detalle');
        if (!btn) return;

        const id   = parseInt(btn.dataset.id);
        const tipo = btn.dataset.tipo;
        const item = window.historialDatos.find(x => x.id === id);
        if (!item) return;

        const cfg = CONFIG[tipo];
        if (!cfg.renderModal) return;

        document.getElementById('modalTitulo').textContent =
            tipo === 'ventas' ? `Venta ${item.codigo}` : `Traspaso ${item.codigo}`;
        document.getElementById('modalCuerpo').innerHTML = cfg.renderModal(item);
        $('#modalDetalle').modal('show');
    });

    function renderModalVenta(v) {
        const rows = v.productos.map(p => `
            <tr>
                <td>${p.nombre}</td>
                <td class="text-center">${p.cantidad}</td>
                <td class="text-right">Bs. ${parseFloat(p.precio_unitario).toFixed(2)}</td>
                <td class="text-right">Bs. ${parseFloat(p.subtotal).toFixed(2)}</td>
            </tr>
        `).join('');

        return `
            <div class="row mb-3">
                <div class="col-md-6">
                    <p class="mb-1"><strong>Cliente:</strong> ${v.cliente}</p>
                    <p class="mb-1"><strong>Teléfono:</strong> ${v.telefono || 'N/A'}</p>
                    <p class="mb-1"><strong>Vendedor:</strong> ${v.vendedor}</p>
                </div>
                <div class="col-md-6">
                    <p class="mb-1"><strong>Ubicación:</strong> ${v.ubicacion}</p>
                    <p class="mb-1"><strong>Tipo pago:</strong> ${v.tipo_pago_display}</p>
                    <p class="mb-1"><strong>Estado:</strong> ${v.estado_display}</p>
                    <p class="mb-1"><strong>Fecha:</strong> ${v.fecha}</p>
                </div>
            </div>
            <table class="table table-sm table-bordered">
                <thead class="thead-light">
                    <tr>
                        <th>Producto</th>
                        <th class="text-center">Cant.</th>
                        <th class="text-right">P. Unit.</th>
                        <th class="text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" class="text-right"><strong>Total:</strong></td>
                        <td class="text-right"><strong>Bs. ${parseFloat(v.total).toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        `;
    }

    function renderModalTraspaso(t) {
        const rows = t.productos.map(p => `
            <tr>
                <td><strong>${p.codigo}</strong></td>
                <td>${p.nombre}</td>
                <td class="text-center">${p.cantidad}</td>
            </tr>
        `).join('');

        return `
            <div class="row mb-3">
                <div class="col-md-6">
                    <p class="mb-1"><strong>Origen:</strong> ${t.origen}</p>
                    <p class="mb-1"><strong>Destino:</strong> ${t.destino}</p>
                    <p class="mb-1"><strong>Creado por:</strong> ${t.creado_por}</p>
                </div>
                <div class="col-md-6">
                    <p class="mb-1"><strong>Tipo:</strong> ${t.tipo_display}</p>
                    <p class="mb-1"><strong>Estado:</strong> ${t.estado_display}</p>
                    <p class="mb-1"><strong>Fecha creación:</strong> ${t.fecha}</p>
                    ${t.fecha_envio ? `<p class="mb-1"><strong>Fecha envío:</strong> ${t.fecha_envio}</p>` : ''}
                    ${t.fecha_recepcion ? `<p class="mb-1"><strong>Fecha recepción:</strong> ${t.fecha_recepcion}</p>` : ''}
                </div>
            </div>
            ${t.comentario ? `<p><strong>Comentario:</strong> ${t.comentario}</p>` : ''}
            <table class="table table-sm table-bordered">
                <thead class="thead-light">
                    <tr>
                        <th>Código</th>
                        <th>Producto</th>
                        <th class="text-center">Cantidad</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <p class="text-right"><strong>Total: Bs. ${parseFloat(t.total).toFixed(2)}</strong></p>
        `;
    }

    // ── 10. PAGINACIÓN ───────────────────────────────────────────
    function extraerPagina(url) {
        if (!url) return null;
        const match = url.match(/[?&]page=(\d+)/);
        return match ? match[1] : '1';
    }

    function actualizarPaginacion(data) {
        const total = data.count || 0;
        const desde = total === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1;
        const hasta = Math.min(paginaActual * POR_PAGINA, total);

        totalReg.textContent  = total;
        mostDesde.textContent = desde;
        mostHasta.textContent = hasta;

        document.getElementById('btnAnterior').classList.toggle('disabled', !paginaPrev);
        document.getElementById('btnSiguiente').classList.toggle('disabled', !paginaNext);
    }

    btnAnterior.addEventListener('click', e => {
        e.preventDefault();
        if (paginaPrev) cargarDatos(paginaPrev);
    });

    btnSiguiente.addEventListener('click', e => {
        e.preventDefault();
        if (paginaNext) cargarDatos(paginaNext);
    });

    // ── 11. EVENTOS DE FILTROS ───────────────────────────────────
    let debounce;
    filtroBuscar.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => cargarDatos(), 350);
    });

    [filtroEstado, filtroExtra, filtroDesde, filtroHasta].forEach(el => {
        el.addEventListener('change', () => cargarDatos());
    });

    btnLimpiar.addEventListener('click', () => {
        filtroBuscar.value = '';
        filtroEstado.value = '';
        filtroExtra.value  = '';
        filtroDesde.value  = '';
        filtroHasta.value  = '';
        cargarDatos();
    });

    // ── 12. INICIO ───────────────────────────────────────────────
    actualizarFiltrosUI();
    cargarDatos();
});