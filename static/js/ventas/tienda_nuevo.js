/**
 * Flujo de nueva venta para usuarios TIENDA.
 * Mantiene sincronizados:
 * - tipo de vendedor (tienda/deposito)
 * - modalidad de empaque (unidad/caja/mayor)
 * - precios del producto
 * - carrito, descuento y moneda visible
 */

let carrito = [];
let productosActuales = {};
let tipoVendedorActual = null;
let tipoDescuentoActual = 'fijo';
let debounceBusqueda = null;
let secuenciaBusqueda = 0;

function obtenerURLs() {
    if (typeof URLS !== 'undefined' && URLS) {
        return URLS;
    }

    return {
        buscarProductos: '/ventas/api/buscar-productos/',
        guardarVentaTienda: '/ventas/tienda/guardar/',
        listaTienda: '/ventas/tienda/listar/'
    };
}

function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
        document.cookie.split('; ').find((row) => row.startsWith('csrftoken='))?.split('=')[1] ||
        '';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function obtenerMonedaActual() {
    return document.getElementById('inputMoneda')?.value || 'BOB';
}

function obtenerTipoCambioActual() {
    return parseFloat(document.getElementById('tipoCambioActual')?.value || 1) || 1;
}

function formatearMontoSegunMoneda(montoBs, monedaDestino) {
    const monto = parseFloat(montoBs || 0);
    const tipoCambio = obtenerTipoCambioActual();

    if (monedaDestino === 'USD') {
        return `$ ${(monto / tipoCambio).toFixed(2)}`;
    }

    return `Bs. ${monto.toFixed(2)}`;
}

function formatearMonto(montoBs) {
    return formatearMontoSegunMoneda(montoBs, obtenerMonedaActual());
}

function renderMontoDual(montoBs) {
    const monedaActual = obtenerMonedaActual();
    const monedaSecundaria = monedaActual === 'USD' ? 'BOB' : 'USD';

    return `
        <div class="font-weight-bold text-success">${formatearMontoSegunMoneda(montoBs, monedaActual)}</div>
        <div class="small text-muted">${formatearMontoSegunMoneda(montoBs, monedaSecundaria)}</div>
    `;
}

function convertirBsAMoneda(montoBs) {
    const monto = parseFloat(montoBs || 0);
    return obtenerMonedaActual() === 'USD' ? (monto / obtenerTipoCambioActual()) : monto;
}

function convertirMonedaABs(monto) {
    const montoConvertido = parseFloat(monto || 0);
    return obtenerMonedaActual() === 'USD' ? (montoConvertido * obtenerTipoCambioActual()) : montoConvertido;
}

function obtenerEtiquetaModalidad(modalidad) {
    if (modalidad === 'caja') return 'Caja';
    if (modalidad === 'mayor') return 'Mayor';
    return 'Unidad';
}

function normalizarTipoVendedor(tipoVendedor) {
    const valor = (tipoVendedor || '').toString().trim().toLowerCase();

    if (['deposito', 'depósito', 'almacen', 'almacén'].includes(valor)) {
        return 'deposito';
    }

    if (valor === 'tienda') {
        return 'tienda';
    }

    return '';
}

function obtenerEtiquetaTipoVendedor(tipoVendedor) {
    const tipoNormalizado = normalizarTipoVendedor(tipoVendedor);

    if (tipoNormalizado === 'deposito') return 'Depósito';
    return 'Tienda';
}

function obtenerClaseTipoVendedor(tipoVendedor) {
    return normalizarTipoVendedor(tipoVendedor) === 'deposito'
        ? 'carrito-chip-vendedor carrito-chip-vendedor--deposito'
        : 'carrito-chip-vendedor carrito-chip-vendedor--tienda';
}

function obtenerClaveProductoBusqueda(productoId, tipoVendedor) {
    return `${tipoVendedor || 'tienda'}_${productoId}`;
}

function obtenerIdContextoBusqueda(productoId, tipoVendedor) {
    return `${tipoVendedor || 'tienda'}_${productoId}`;
}

function obtenerTipoVendedorItem(item) {
    return normalizarTipoVendedor(item?.tipo_vendedor)
        || normalizarTipoVendedor(item?.tipo_vendedor_label)
        || normalizarTipoVendedor(item?.producto?.tipo_vendedor_busqueda)
        || normalizarTipoVendedor(tipoVendedorActual)
        || 'tienda';
}

function esTiendaPrincipalActual() {
    return document.getElementById('inputEsTiendaPrincipal')?.value === '1';
}

function puedeAplicarDescuento() {
    const tipoPago = document.getElementById('inputTipoPago')?.value || 'contado';
    return tipoPago === 'contado';
}

function obtenerResumenModalidad(producto, cantidad, modalidad) {
    const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);

    if (modalidad === 'caja') {
        const unidades = cantidad * unidadesPorCaja;
        return `${cantidad} caja(s) = ${unidades} unidad(es)`;
    }

    if (modalidad === 'mayor') {
        return `${cantidad} unidad(es) a precio mayorista`;
    }

    return `${cantidad} unidad(es)`;
}

function obtenerPrecioBasePorModalidad(producto, modalidad) {
    const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);
    const precioUnidad = parseFloat(producto.precio_unidad || 0) || 0;
    const precioCaja = parseFloat(producto.precio_caja || 0) || 0;
    const precioMayor = parseFloat(producto.precio_mayor || 0) || 0;

    if (modalidad === 'caja') {
        return precioCaja > 0 ? precioCaja : (precioUnidad * unidadesPorCaja);
    }

    if (modalidad === 'mayor') {
        return precioMayor > 0 ? precioMayor : precioUnidad;
    }

    return precioUnidad;
}

function calcularUnidadesOperativas(producto, cantidad, modalidad) {
    const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);
    return modalidad === 'caja' ? (cantidad * unidadesPorCaja) : cantidad;
}

function actualizarUnidadDescuento() {
    const unidad = document.getElementById('tipoDescuentoUnidad');
    if (!unidad) return;

    unidad.textContent = tipoDescuentoActual === 'porcentaje'
        ? '%'
        : (obtenerMonedaActual() === 'USD' ? '$' : 'Bs.');
}

function obtenerDetalleDescuentoActual(subtotalBs) {
    const descuentoInput = parseFloat(document.getElementById('inputDescuento')?.value || 0) || 0;
    const descuentoHabilitado = puedeAplicarDescuento();
    let descuentoBs = 0;
    let resumen = 'Sin descuento';

    if (descuentoHabilitado && descuentoInput > 0) {
        if (tipoDescuentoActual === 'porcentaje') {
            const porcentaje = Math.min(descuentoInput, 100);
            descuentoBs = (subtotalBs * porcentaje) / 100;
            resumen = `${porcentaje.toFixed(2).replace(/\.00$/, '')}% (${formatearMonto(descuentoBs)})`;
        } else {
            descuentoBs = Math.min(convertirMonedaABs(descuentoInput), subtotalBs);
            resumen = formatearMonto(descuentoBs);
        }
    }

    return {
        descuentoBs,
        resumen,
        valorIngresado: descuentoInput,
        habilitado: descuentoHabilitado
    };
}

function actualizarVisibilidadDescuento() {
    const descuentoSection = document.getElementById('descuentoSection');
    const descuentoBloqueado = document.getElementById('descuentoBloqueado');
    const inputDescuento = document.getElementById('inputDescuento');

    if (!descuentoSection || !inputDescuento) return;

    const habilitado = puedeAplicarDescuento();
    descuentoSection.style.display = habilitado ? '' : 'none';
    if (descuentoBloqueado) {
        descuentoBloqueado.style.display = habilitado ? 'none' : 'block';
    }

    if (!habilitado) {
        inputDescuento.value = '0';
        tipoDescuentoActual = 'fijo';
        const descuentoFijo = document.getElementById('descuentoFijo');
        if (descuentoFijo) descuentoFijo.checked = true;
    }

    actualizarUnidadDescuento();
    actualizarTotales();
}

function mostrarAlerta(mensaje, tipo = 'warning', titulo = '') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: tipo,
            title: titulo || (tipo === 'success' ? 'Listo' : 'Atencion'),
            text: mensaje
        });
        return;
    }

    alert(mensaje);
}

function validarTelefono(input) {
    input.addEventListener('keypress', (event) => {
        if (!/[0-9]/.test(event.key)) {
            event.preventDefault();
        }
    });

    input.addEventListener('paste', (event) => {
        const texto = event.clipboardData.getData('text');
        if (!/^[0-9]*$/.test(texto)) {
            event.preventDefault();
        }
    });
}

function validarCantidadSegunModalidad(cantidad, modalidad, unidadesPorCaja, tipoVendedor) {
    const valor = parseInt(cantidad, 10);

    if (!Number.isInteger(valor) || valor < 1) {
        return { valido: false, mensaje: 'La cantidad debe ser mayor a 0.' };
    }

    if (tipoVendedor === 'deposito') {
        return { valido: true };
    }

    if (modalidad === 'unidad' && valor > 2) {
        return { valido: false, mensaje: 'La modalidad Unidad solo permite entre 1 y 2 unidades.' };
    }

    if (modalidad === 'mayor' && (valor < 3 || valor >= unidadesPorCaja)) {
        return {
            valido: false,
            mensaje: `La modalidad Mayor requiere entre 3 y ${Math.max(unidadesPorCaja - 1, 3)} unidades.`
        };
    }

    if (modalidad === 'caja' && valor < 1) {
        return { valido: false, mensaje: 'La modalidad Caja requiere al menos 1 caja.' };
    }

    return { valido: true };
}

function validarStockDisponible(producto, cantidad, modalidad, cantidadExistente = 0) {
    const stockDisponible = parseInt(producto.stock || 0, 10);
    const unidadesSolicitadas = calcularUnidadesOperativas(producto, cantidad + cantidadExistente, modalidad);

    if (unidadesSolicitadas > stockDisponible) {
        const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);
        if (modalidad === 'caja') {
            const maximoCajas = Math.floor(stockDisponible / unidadesPorCaja);
            return {
                valido: false,
                mensaje: `Stock insuficiente. Solo hay ${maximoCajas} caja(s) disponibles para "${producto.nombre}".`
            };
        }

        return {
            valido: false,
            mensaje: `Stock insuficiente. Disponible: ${stockDisponible} unidad(es) para "${producto.nombre}".`
        };
    }

    return { valido: true };
}

function recalcularItemCarrito(item) {
    item.unidades_operativas = calcularUnidadesOperativas(item.producto, item.cantidad, item.modalidad);
    item.subtotal_bs = item.cantidad * item.precio_unitario_bs;
}

function agregarAlCarrito(producto, cantidad, modalidad, tipoVendedor = tipoVendedorActual) {
    const tipoVendedorFinal = normalizarTipoVendedor(
        tipoVendedor || producto?.tipo_vendedor_busqueda || tipoVendedorActual
    ) || 'tienda';
    const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);
    const validacionCantidad = validarCantidadSegunModalidad(cantidad, modalidad, unidadesPorCaja, tipoVendedorFinal);
    if (!validacionCantidad.valido) {
        mostrarAlerta(validacionCantidad.mensaje);
        return false;
    }

    const precioBaseBs = obtenerPrecioBasePorModalidad(producto, modalidad);
    if (!precioBaseBs || precioBaseBs <= 0) {
        mostrarAlerta(`El producto "${producto.nombre}" no tiene precio configurado para la modalidad ${obtenerEtiquetaModalidad(modalidad)}.`);
        return false;
    }

    const existenteIndex = carrito.findIndex((item) =>
        item.producto.id === producto.id && item.modalidad === modalidad && obtenerTipoVendedorItem(item) === tipoVendedorFinal
    );
    const cantidadExistente = existenteIndex >= 0 ? carrito[existenteIndex].cantidad : 0;
    const validacionStock = validarStockDisponible(producto, cantidad, modalidad, cantidadExistente);
    if (!validacionStock.valido) {
        mostrarAlerta(validacionStock.mensaje);
        return false;
    }

    if (existenteIndex >= 0) {
        carrito[existenteIndex].cantidad += cantidad;
        carrito[existenteIndex].tipo_vendedor = tipoVendedorFinal;
        carrito[existenteIndex].tipo_vendedor_label = obtenerEtiquetaTipoVendedor(tipoVendedorFinal);
        carrito[existenteIndex].precio_unitario_bs = precioBaseBs;
        recalcularItemCarrito(carrito[existenteIndex]);
    } else {
        const item = {
            producto,
            cantidad,
            modalidad,
            tipo_vendedor: tipoVendedorFinal,
            tipo_vendedor_label: obtenerEtiquetaTipoVendedor(tipoVendedorFinal),
            precio_unitario_bs: precioBaseBs,
            unidades_operativas: 0,
            subtotal_bs: 0
        };
        recalcularItemCarrito(item);
        carrito.push(item);
    }

    renderCarrito();
    return true;
}

function removerDelCarrito(index) {
    carrito.splice(index, 1);
    renderCarrito();
}

function renderCarrito() {
    const tbody = document.getElementById('carritoBody');
    const footer = document.getElementById('carritoFooter');

    if (!tbody) return;

    if (carrito.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><i class="fas fa-inbox mr-2"></i>Carrito vacio</td></tr>';
        if (footer) footer.style.display = 'none';
        actualizarTotales();
        return;
    }

    if (footer) footer.style.display = 'block';

    tbody.innerHTML = carrito.map((item, index) => `
        <tr class="carrito-row-nueva">
            <td class="pl-3">
                <div class="carrito-producto-nombre">${escapeHtml(item.producto.nombre)}</div>
                <div class="carrito-producto-codigo">${escapeHtml(item.producto.codigo || '')}</div>
            </td>
            <td class="text-center">
                <span class="${obtenerClaseTipoVendedor(obtenerTipoVendedorItem(item))}">
                    ${escapeHtml(item.tipo_vendedor_label || obtenerEtiquetaTipoVendedor(obtenerTipoVendedorItem(item)))}
                </span>
            </td>
            <td class="text-center">
                <div class="font-weight-bold">${escapeHtml(obtenerEtiquetaModalidad(item.modalidad))}</div>
                <div class="small text-muted mt-1">${escapeHtml(obtenerResumenModalidad(item.producto, item.cantidad, item.modalidad))}</div>
            </td>
            <td class="text-center">
                ${renderMontoDual(item.precio_unitario_bs)}
            </td>
            <td class="text-center">${item.cantidad}</td>
            <td class="text-right font-weight-bold">
                ${renderMontoDual(item.subtotal_bs)}
            </td>
            <td class="text-center pr-3">
                <button type="button" class="btn btn-sm btn-danger" onclick="removerDelCarrito(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    actualizarTotales();
}

function actualizarTotales() {
    const subtotalBs = carrito.reduce((sum, item) => sum + item.subtotal_bs, 0);
    const cantidadItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const detalleDescuento = obtenerDetalleDescuentoActual(subtotalBs);
    const descuentoBs = detalleDescuento.descuentoBs;

    const totalBs = subtotalBs - descuentoBs;

    const resumenCantItems = document.getElementById('resumenCantItems');
    const resumenSubtotal = document.getElementById('resumenSubtotal');
    const resumenTotal = document.getElementById('resumenTotal');
    const descuentoResumen = document.getElementById('descuentoResumen');
    const descuentoCalculo = document.getElementById('descuentoCalculo');

    if (resumenCantItems) resumenCantItems.textContent = cantidadItems;
    if (resumenSubtotal) resumenSubtotal.textContent = formatearMonto(subtotalBs);
    if (resumenTotal) resumenTotal.innerHTML = `<strong style="font-size: 1.3rem; display: block;">${formatearMonto(totalBs)}</strong>`;
    if (descuentoResumen) descuentoResumen.textContent = detalleDescuento.resumen;
    if (descuentoCalculo) descuentoCalculo.textContent = `${formatearMonto(subtotalBs)} - ${formatearMonto(descuentoBs)} = ${formatearMonto(totalBs)}`;
}

function actualizarPreviewProducto(productoId, tipoVendedorContexto = tipoVendedorActual) {
    const claveProducto = obtenerClaveProductoBusqueda(productoId, tipoVendedorContexto);
    const producto = productosActuales[claveProducto];
    if (!producto) return;

    const contextoId = obtenerIdContextoBusqueda(productoId, tipoVendedorContexto);
    const modalidad = document.querySelector(`input[name="modalidad_${contextoId}"]:checked`)?.value || 'unidad';
    const cantidadInput = document.getElementById(`cantidad_${contextoId}`);
    const resumen = document.getElementById(`preview_modalidad_${contextoId}`);
    const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);
    const precioBs = obtenerPrecioBasePorModalidad(producto, modalidad);

    if (cantidadInput) {
        cantidadInput.min = '1';

        if (modalidad === 'unidad') {
            cantidadInput.placeholder = '1 o 2';
        } else if (modalidad === 'mayor') {
            cantidadInput.placeholder = `3 a ${Math.max(unidadesPorCaja - 1, 3)}`;
        } else {
            cantidadInput.placeholder = 'Cantidad de cajas';
        }
    }

    if (resumen) {
        resumen.innerHTML = `
            <strong>Precio aplicado:</strong> ${obtenerEtiquetaModalidad(modalidad)} -
            <span class="text-success">${formatearMonto(precioBs)}</span>
        `;
    }
}

function renderTarjetaProducto(producto) {
    const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);
    const stock = parseInt(producto.stock || 0, 10);
    const stockCajas = Math.floor(stock / Math.max(unidadesPorCaja, 1));
    const precioUnidad = obtenerPrecioBasePorModalidad(producto, 'unidad');
    const precioCaja = obtenerPrecioBasePorModalidad(producto, 'caja');
    const precioMayor = obtenerPrecioBasePorModalidad(producto, 'mayor');

    const bloqueModalidades = tipoVendedorActual === 'tienda'
        ? `
            <div class="col-md-5">
                <label class="small font-weight-bold text-muted d-block">Modalidad</label>
                <div class="d-flex flex-wrap">
                    <div class="form-check form-check-inline mr-3">
                        <input class="form-check-input" type="radio" name="modalidad_${obtenerIdContextoBusqueda(producto.id, tipoVendedorActual)}" id="unidad_${obtenerIdContextoBusqueda(producto.id, tipoVendedorActual)}" value="unidad" checked>
                        <label class="form-check-label" for="unidad_${obtenerIdContextoBusqueda(producto.id, tipoVendedorActual)}">Unidad</label>
                    </div>
                    <div class="form-check form-check-inline mr-3">
                        <input class="form-check-input" type="radio" name="modalidad_${obtenerIdContextoBusqueda(producto.id, tipoVendedorActual)}" id="caja_${obtenerIdContextoBusqueda(producto.id, tipoVendedorActual)}" value="caja">
                        <label class="form-check-label" for="caja_${obtenerIdContextoBusqueda(producto.id, tipoVendedorActual)}">Caja</label>
                    </div>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="modalidad_${obtenerIdContextoBusqueda(producto.id, tipoVendedorActual)}" id="mayor_${obtenerIdContextoBusqueda(producto.id, tipoVendedorActual)}" value="mayor">
                        <label class="form-check-label" for="mayor_${obtenerIdContextoBusqueda(producto.id, tipoVendedorActual)}">Mayor</label>
                    </div>
                </div>
                <div class="small text-muted mt-2" id="preview_modalidad_${obtenerIdContextoBusqueda(producto.id, tipoVendedorActual)}"></div>
            </div>
            <div class="col-md-3">
                <label for="cantidad_${obtenerIdContextoBusqueda(producto.id, tipoVendedorActual)}" class="small font-weight-bold text-muted">Cantidad</label>
                <input type="number" class="form-control form-control-sm" id="cantidad_${obtenerIdContextoBusqueda(producto.id, tipoVendedorActual)}" min="1" value="1">
            </div>
            <div class="col-md-4">
                <button type="button" class="btn btn-primary btn-sm btn-block" onclick="agregarDesdeResultados(${producto.id}, '${tipoVendedorActual}')">
                    <i class="fas fa-plus mr-1"></i>Agregar al carrito
                </button>
            </div>
        `
        : `
            <div class="col-md-3">
                <label for="cantidad_${obtenerIdContextoBusqueda(producto.id, tipoVendedorActual)}" class="small font-weight-bold text-muted">Cantidad</label>
                <input type="number" class="form-control form-control-sm" id="cantidad_${obtenerIdContextoBusqueda(producto.id, tipoVendedorActual)}" min="1" value="1">
            </div>
            <div class="col-md-9">
                <button type="button" class="btn btn-primary btn-sm btn-block" onclick="agregarDesdeResultadosDeposito(${producto.id}, '${tipoVendedorActual}')">
                    <i class="fas fa-plus mr-1"></i>Agregar al carrito
                </button>
            </div>
        `;

    const bloquePrecios = tipoVendedorActual === 'tienda'
        ? `
            <div class="row mb-3">
                <div class="col-md-4 mb-2">
                    <div class="border rounded p-2 h-100">
                        <div class="small text-muted">P. Unitario</div>
                        ${renderMontoDual(precioUnidad)}
                    </div>
                </div>
                <div class="col-md-4 mb-2">
                    <div class="border rounded p-2 h-100">
                        <div class="small text-muted">P. Caja</div>
                        ${renderMontoDual(precioCaja)}
                    </div>
                </div>
                <div class="col-md-4 mb-2">
                    <div class="border rounded p-2 h-100">
                        <div class="small text-muted">P. Mayor</div>
                        ${renderMontoDual(precioMayor)}
                    </div>
                </div>
            </div>
        `
        : `
            <div class="row mb-3">
                <div class="col-md-12">
                    <div class="border rounded p-2 h-100">
                        <div class="small text-muted">P. Unitario</div>
                        ${renderMontoDual(precioUnidad)}
                    </div>
                </div>
            </div>
        `;

    const html = `
        <div class="card mb-3 shadow-sm" style="border-left: 4px solid #4f6ad7;">
            <div class="card-body py-3">
                <div class="d-flex justify-content-between align-items-start flex-wrap mb-2">
                    <div class="pr-3">
                        <div class="font-weight-bold" style="font-size: 1.05rem;">${escapeHtml(producto.nombre)}</div>
                        <div class="small text-muted">${escapeHtml(producto.codigo || '')}</div>
                    </div>
                    <div class="small text-muted text-right">
                        <div>Origen: <strong>${obtenerEtiquetaTipoVendedor(tipoVendedorActual)}</strong></div>
                        <div>Stock: <strong>${stock}</strong> unidad(es)</div>
                        ${tipoVendedorActual === 'tienda'
                            ? `<div>Caja: <strong>${unidadesPorCaja}</strong> unidad(es)</div><div>Cajas disponibles: <strong>${stockCajas}</strong></div>`
                            : '<div>Modalidad disponible: <strong>Unidad</strong></div>'}
                    </div>
                </div>

                ${bloquePrecios}

                <div class="small text-muted mb-3">
                    <span class="mr-3"><strong>P. Compra:</strong> ${formatearMonto(parseFloat(producto.precio_compra || 0) || 0)}</span>
                    <span class="mr-3"><strong>Poliza:</strong> ${formatearMonto(parseFloat(producto.poliza || 0) || 0)}</span>
                    <span><strong>Gastos:</strong> ${formatearMonto(parseFloat(producto.gastos || 0) || 0)}</span>
                </div>

                <div class="row align-items-end">
                    ${bloqueModalidades}
                </div>
            </div>
        </div>
    `;

    return html;
}

function renderResultadosBusqueda(productos) {
    const resultados = document.getElementById('resultadosBusqueda');
    if (!resultados) return;

    productosActuales = {};
    resultados.innerHTML = '';

    if (!productos || productos.length === 0) {
        resultados.innerHTML = '<div class="alert alert-info mb-0">No hay resultados disponibles para ese criterio.</div>';
        resultados.style.display = 'block';
        return;
    }

    productos.forEach((producto) => {
        const claveProducto = obtenerClaveProductoBusqueda(producto.id, tipoVendedorActual);
        productosActuales[claveProducto] = {
            ...producto,
            tipo_vendedor_busqueda: normalizarTipoVendedor(tipoVendedorActual) || 'tienda'
        };
    });

    resultados.innerHTML = productos.map((producto) => renderTarjetaProducto(producto)).join('');
    resultados.style.display = 'block';

    if (tipoVendedorActual === 'tienda') {
        productos.forEach((producto) => {
            const contextoId = obtenerIdContextoBusqueda(producto.id, tipoVendedorActual);
            document.querySelectorAll(`input[name="modalidad_${contextoId}"]`).forEach((radio) => {
                radio.addEventListener('change', () => actualizarPreviewProducto(producto.id, tipoVendedorActual));
            });
            actualizarPreviewProducto(producto.id, tipoVendedorActual);
        });
    }
}

function buscarProductos(query) {
    const urls = obtenerURLs();
    const resultados = document.getElementById('resultadosBusqueda');
    const tipoVendedorConsulta = tipoVendedorActual;

    if (!tipoVendedorConsulta) {
        resultados.innerHTML = '<div class="alert alert-warning mb-0">Selecciona primero el tipo de vendedor.</div>';
        resultados.style.display = 'block';
        return;
    }

    const tokenBusqueda = ++secuenciaBusqueda;
    resultados.innerHTML = '<div class="alert alert-light mb-0"><i class="fas fa-spinner fa-spin mr-2"></i>Actualizando resultados...</div>';
    resultados.style.display = 'block';

    fetch(`${urls.buscarProductos}?q=${encodeURIComponent(query)}&tipo_venta=${encodeURIComponent(tipoVendedorConsulta)}`)
        .then((response) => response.json())
        .then((data) => {
            if (tokenBusqueda !== secuenciaBusqueda || tipoVendedorConsulta !== tipoVendedorActual) {
                return;
            }
            renderResultadosBusqueda(data.productos || []);
        })
        .catch((error) => {
            console.error(error);
            resultados.innerHTML = '<div class="alert alert-danger mb-0">No se pudo buscar productos en este momento.</div>';
            resultados.style.display = 'block';
        });
}

function refrescarBusquedaActual() {
    const inputBuscar = document.getElementById('inputBuscarProducto');
    const resultados = document.getElementById('resultadosBusqueda');
    if (!inputBuscar) return;

    const query = inputBuscar.value.trim();
    if (query.length >= 2) {
        buscarProductos(query);
        return;
    }

    productosActuales = {};
    if (resultados) {
        resultados.innerHTML = '';
        resultados.style.display = 'none';
    }
}

function inicializarSelectorTipoPago() {
    const opciones = document.querySelectorAll('.tipo-pago-option');
    if (!opciones.length) return;

    opciones.forEach((opcion) => {
        opcion.addEventListener('click', function () {
            opciones.forEach((elemento) => elemento.classList.remove('active'));
            this.classList.add('active');

            const inputTipoPago = document.getElementById('inputTipoPago');
            if (inputTipoPago) {
                inputTipoPago.value = this.dataset.tipo || 'contado';
            }

            actualizarVisibilidadDescuento();
        });
    });
}

function inicializarBusqueda() {
    const inputTelefono = document.getElementById('inputTelefono');
    if (inputTelefono) {
        validarTelefono(inputTelefono);
    }

    const selectTipoVendedor = document.getElementById('selectTipoVendedor');
    if (selectTipoVendedor) {
        tipoVendedorActual = selectTipoVendedor.value || 'tienda';

        selectTipoVendedor.addEventListener('change', function () {
            tipoVendedorActual = this.value || 'tienda';
            secuenciaBusqueda += 1;
            refrescarBusquedaActual();
        });
    }

    const selectMoneda = document.getElementById('selectMoneda');
    if (selectMoneda) {
        selectMoneda.addEventListener('change', function () {
            const inputMoneda = document.getElementById('inputMoneda');
            if (inputMoneda) {
                inputMoneda.value = this.value;
            }

            actualizarUnidadDescuento();
            renderCarrito();
            refrescarBusquedaActual();
        });
    }

    const inputBuscar = document.getElementById('inputBuscarProducto');
    if (inputBuscar) {
        inputBuscar.addEventListener('input', function () {
            const query = this.value.trim();

            clearTimeout(debounceBusqueda);

            if (query.length < 2) {
                document.getElementById('resultadosBusqueda').style.display = 'none';
                return;
            }

            debounceBusqueda = setTimeout(() => buscarProductos(query), 250);
        });
    }

    const inputDescuento = document.getElementById('inputDescuento');
    if (inputDescuento) {
        inputDescuento.addEventListener('input', () => actualizarTotales());
    }

    document.querySelectorAll('input[name="tipoDescuento"]').forEach((radio) => {
        radio.addEventListener('change', function () {
            tipoDescuentoActual = this.value;

            const inputDescuentoLocal = document.getElementById('inputDescuento');
            if (inputDescuentoLocal) {
                inputDescuentoLocal.value = '0';
                if (tipoDescuentoActual === 'porcentaje') {
                    inputDescuentoLocal.max = '100';
                } else {
                    inputDescuentoLocal.removeAttribute('max');
                }
            }

            actualizarUnidadDescuento();
            actualizarTotales();
        });
    });
}

function agregarDesdeResultados(productoId, tipoVendedorContexto = tipoVendedorActual) {
    const claveProducto = obtenerClaveProductoBusqueda(productoId, tipoVendedorContexto);
    const producto = productosActuales[claveProducto];
    if (!producto) {
        mostrarAlerta('Producto no encontrado.');
        return;
    }

    const contextoId = obtenerIdContextoBusqueda(productoId, tipoVendedorContexto);
    const modalidad = document.querySelector(`input[name="modalidad_${contextoId}"]:checked`)?.value || 'unidad';
    const cantidad = parseInt(document.getElementById(`cantidad_${contextoId}`)?.value || 0, 10);

    if (!cantidad || cantidad < 1) {
        mostrarAlerta('Ingresa una cantidad mayor a 0.');
        return;
    }

    if (agregarAlCarrito(producto, cantidad, modalidad, tipoVendedorContexto || 'tienda')) {
        document.getElementById(`cantidad_${contextoId}`).value = '1';
        mostrarAlerta(`${producto.nombre} fue agregado al carrito.`, 'success', 'Agregado');
    }
}

function agregarDesdeResultadosDeposito(productoId, tipoVendedorContexto = 'deposito') {
    const claveProducto = obtenerClaveProductoBusqueda(productoId, tipoVendedorContexto);
    const producto = productosActuales[claveProducto];
    if (!producto) {
        mostrarAlerta('Producto no encontrado.');
        return;
    }

    const contextoId = obtenerIdContextoBusqueda(productoId, tipoVendedorContexto);
    const cantidad = parseInt(document.getElementById(`cantidad_${contextoId}`)?.value || 0, 10);

    if (!cantidad || cantidad < 1) {
        mostrarAlerta('Ingresa una cantidad mayor a 0.');
        return;
    }

    if (agregarAlCarrito(producto, cantidad, 'unidad', tipoVendedorContexto || 'deposito')) {
        document.getElementById(`cantidad_${contextoId}`).value = '1';
        mostrarAlerta(`${producto.nombre} fue agregado al carrito.`, 'success', 'Agregado');
    }
}

function construirPayloadVenta() {
    const subtotalBs = carrito.reduce((sum, item) => sum + item.subtotal_bs, 0);
    const detalleDescuento = obtenerDetalleDescuentoActual(subtotalBs);
    const descuentoTipo = detalleDescuento.habilitado && detalleDescuento.valorIngresado > 0
        ? tipoDescuentoActual
        : 'ninguno';

    return {
        cliente: document.getElementById('inputCliente')?.value.trim() || '',
        telefono: document.getElementById('inputTelefono')?.value.trim() || '',
        razon_social: document.getElementById('inputRazonSocial')?.value.trim() || '',
        direccion: document.getElementById('inputDireccion')?.value.trim() || '',
        tipo_pago: document.getElementById('inputTipoPago')?.value || 'contado',
        tipo_venta: tipoVendedorActual || 'tienda',
        moneda: obtenerMonedaActual(),
        tipo_cambio: obtenerTipoCambioActual(),
        descuento: convertirBsAMoneda(detalleDescuento.descuentoBs).toFixed(2),
        descuento_tipo: descuentoTipo,
        descuento_valor: detalleDescuento.habilitado ? detalleDescuento.valorIngresado : 0,
        items: carrito.map((item) => ({
            producto_id: item.producto.id,
            cantidad: item.cantidad,
            modalidad: item.modalidad,
            tipo_vendedor: obtenerTipoVendedorItem(item),
            precio_unitario: convertirBsAMoneda(item.precio_unitario_bs).toFixed(2)
        }))
    };
}

function inicializarGuardarVenta() {
    const btnGuardar = document.getElementById('btnGuardarVenta');
    if (!btnGuardar) return;

    btnGuardar.addEventListener('click', function (event) {
        event.preventDefault();

        if (carrito.length === 0) {
            mostrarAlerta('El carrito esta vacio.');
            return;
        }

        const payload = construirPayloadVenta();
        if (!payload.cliente) {
            mostrarAlerta('Ingresa el nombre del cliente.');
            return;
        }

        const subtotalBs = carrito.reduce((sum, item) => sum + item.subtotal_bs, 0);
        const detalleDescuento = obtenerDetalleDescuentoActual(subtotalBs);
        const descuentoBs = detalleDescuento.descuentoBs;
        const totalBs = subtotalBs - descuentoBs;
        const tiposVendedor = [...new Set(carrito.map((item) => obtenerEtiquetaTipoVendedor(obtenerTipoVendedorItem(item))))].join(', ');
        const descuentoHtml = descuentoBs > 0
            ? `
                <p class="mb-1"><strong>Descuento:</strong> ${detalleDescuento.resumen}</p>
                <p class="mb-0"><strong>Calculo:</strong> ${formatearMonto(subtotalBs)} - ${formatearMonto(descuentoBs)} = ${formatearMonto(totalBs)}</p>
            `
            : '<p class="mb-0"><strong>Descuento:</strong> Sin descuento</p>';

        const confirmarVenta = () => {
            const urls = obtenerURLs();
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...';

            fetch(urls.guardarVentaTienda, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify(payload)
            })
                .then((response) => response.json())
                .then((data) => {
                    if (!data.success) {
                        throw new Error(data.error || 'No se pudo registrar la venta.');
                    }

                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'success',
                            title: 'Venta registrada',
                            html: `<p>${escapeHtml(data.message)}</p><p><strong>${escapeHtml(data.venta_codigo)}</strong></p>`
                        }).then(() => {
                            window.location.href = urls.listaTienda;
                        });
                        return;
                    }

                    alert(data.message);
                    window.location.href = urls.listaTienda;
                })
                .catch((error) => {
                    mostrarAlerta(error.message || 'No se pudo registrar la venta.', 'error', 'Error');
                })
                .finally(() => {
                    btnGuardar.disabled = false;
                    btnGuardar.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Registrar Venta';
                });
        };

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'question',
                title: 'Confirmar venta',
                html: `
                    <div class="text-left">
                        <p><strong>Cliente:</strong> ${escapeHtml(payload.cliente)}</p>
                        <p><strong>Origenes en carrito:</strong> ${escapeHtml(tiposVendedor || 'Tienda')}</p>
                        <p><strong>Moneda:</strong> ${escapeHtml(payload.moneda)}</p>
                        <p><strong>Items:</strong> ${carrito.length}</p>
                        <hr>
                        <p class="mb-1"><strong>Subtotal:</strong> ${formatearMonto(subtotalBs)}</p>
                        ${descuentoHtml}
                        <p class="mb-0"><strong>Total:</strong> ${formatearMonto(totalBs)}</p>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Registrar venta',
                cancelButtonText: 'Revisar'
            }).then((result) => {
                if (result.isConfirmed) {
                    confirmarVenta();
                }
            });
            return;
        }

        if (confirm(`Registrar venta por ${formatearMonto(totalBs)}?`)) {
            confirmarVenta();
        }
    });
}

function inicializarLimpiarCarrito() {
    const btnLimpiar = document.getElementById('btnLimpiarCarrito');
    if (!btnLimpiar) return;

    btnLimpiar.addEventListener('click', function () {
        if (carrito.length === 0) return;

        const limpiar = () => {
            carrito = [];
            renderCarrito();
        };

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Limpiar carrito',
                text: 'Se eliminaran todos los productos agregados.',
                showCancelButton: true,
                confirmButtonText: 'Si, limpiar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    limpiar();
                }
            });
            return;
        }

        if (confirm('Limpiar carrito?')) {
            limpiar();
        }
    });
}

window.agregarDesdeResultados = agregarDesdeResultados;
window.agregarDesdeResultadosDeposito = agregarDesdeResultadosDeposito;
window.removerDelCarrito = removerDelCarrito;

function init() {
    inicializarSelectorTipoPago();
    inicializarBusqueda();
    inicializarGuardarVenta();
    inicializarLimpiarCarrito();
    actualizarUnidadDescuento();
    actualizarVisibilidadDescuento();
    renderCarrito();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
