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

function agregarAlCarrito(producto, cantidad, modalidad) {
    const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);
    const validacionCantidad = validarCantidadSegunModalidad(cantidad, modalidad, unidadesPorCaja, tipoVendedorActual);
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
        item.producto.id === producto.id && item.modalidad === modalidad
    );
    const cantidadExistente = existenteIndex >= 0 ? carrito[existenteIndex].cantidad : 0;
    const validacionStock = validarStockDisponible(producto, cantidad, modalidad, cantidadExistente);
    if (!validacionStock.valido) {
        mostrarAlerta(validacionStock.mensaje);
        return false;
    }

    if (existenteIndex >= 0) {
        carrito[existenteIndex].cantidad += cantidad;
        carrito[existenteIndex].precio_unitario_bs = precioBaseBs;
        recalcularItemCarrito(carrito[existenteIndex]);
    } else {
        const item = {
            producto,
            cantidad,
            modalidad,
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
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4"><i class="fas fa-inbox mr-2"></i>Carrito vacio</td></tr>';
        if (footer) footer.style.display = 'none';
        actualizarTotales();
        return;
    }

    if (footer) footer.style.display = 'block';

    tbody.innerHTML = carrito.map((item, index) => `
        <tr class="carrito-row-nueva">
            <td class="pl-3">
                <div class="font-weight-bold">${escapeHtml(item.producto.nombre)}</div>
                <div class="small text-muted">${escapeHtml(item.producto.codigo || '')}</div>
            </td>
            <td class="text-center">
                <span class="badge badge-info">${obtenerEtiquetaModalidad(item.modalidad)}</span>
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
    const descuentoInput = parseFloat(document.getElementById('inputDescuento')?.value || 0) || 0;

    let descuentoBs = 0;
    if (tipoDescuentoActual === 'porcentaje') {
        const porcentaje = Math.min(descuentoInput, 100);
        descuentoBs = (subtotalBs * porcentaje) / 100;
    } else {
        descuentoBs = Math.min(convertirMonedaABs(descuentoInput), subtotalBs);
    }

    const totalBs = subtotalBs - descuentoBs;

    const resumenCantItems = document.getElementById('resumenCantItems');
    const resumenSubtotal = document.getElementById('resumenSubtotal');
    const resumenTotal = document.getElementById('resumenTotal');

    if (resumenCantItems) resumenCantItems.textContent = cantidadItems;
    if (resumenSubtotal) resumenSubtotal.textContent = formatearMonto(subtotalBs);
    if (resumenTotal) resumenTotal.innerHTML = `<strong style="font-size: 1.3rem; display: block;">${formatearMonto(totalBs)}</strong>`;
}

function actualizarPreviewProducto(productoId) {
    const producto = productosActuales[productoId];
    if (!producto) return;

    const modalidad = document.querySelector(`input[name="modalidad_${productoId}"]:checked`)?.value || 'unidad';
    const cantidadInput = document.getElementById(`cantidad_${productoId}`);
    const resumen = document.getElementById(`preview_modalidad_${productoId}`);
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
                        <input class="form-check-input" type="radio" name="modalidad_${producto.id}" id="unidad_${producto.id}" value="unidad" checked>
                        <label class="form-check-label" for="unidad_${producto.id}">Unidad</label>
                    </div>
                    <div class="form-check form-check-inline mr-3">
                        <input class="form-check-input" type="radio" name="modalidad_${producto.id}" id="caja_${producto.id}" value="caja">
                        <label class="form-check-label" for="caja_${producto.id}">Caja</label>
                    </div>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="modalidad_${producto.id}" id="mayor_${producto.id}" value="mayor">
                        <label class="form-check-label" for="mayor_${producto.id}">Mayor</label>
                    </div>
                </div>
                <div class="small text-muted mt-2" id="preview_modalidad_${producto.id}"></div>
            </div>
            <div class="col-md-3">
                <label for="cantidad_${producto.id}" class="small font-weight-bold text-muted">Cantidad</label>
                <input type="number" class="form-control form-control-sm" id="cantidad_${producto.id}" min="1" value="1">
            </div>
            <div class="col-md-4">
                <button type="button" class="btn btn-primary btn-sm btn-block" onclick="agregarDesdeResultados(${producto.id})">
                    <i class="fas fa-plus mr-1"></i>Agregar al carrito
                </button>
            </div>
        `
        : `
            <div class="col-md-3">
                <label for="cantidad_${producto.id}" class="small font-weight-bold text-muted">Cantidad</label>
                <input type="number" class="form-control form-control-sm" id="cantidad_${producto.id}" min="1" value="1">
            </div>
            <div class="col-md-9">
                <button type="button" class="btn btn-primary btn-sm btn-block" onclick="agregarDesdeResultadosDeposito(${producto.id})">
                    <i class="fas fa-plus mr-1"></i>Agregar al carrito
                </button>
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
                        <div>Stock: <strong>${stock}</strong> unidad(es)</div>
                        <div>Caja: <strong>${unidadesPorCaja}</strong> unidad(es)</div>
                        <div>Cajas disponibles: <strong>${stockCajas}</strong></div>
                    </div>
                </div>

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
        productosActuales[producto.id] = producto;
    });

    resultados.innerHTML = productos.map((producto) => renderTarjetaProducto(producto)).join('');
    resultados.style.display = 'block';

    if (tipoVendedorActual === 'tienda') {
        productos.forEach((producto) => {
            document.querySelectorAll(`input[name="modalidad_${producto.id}"]`).forEach((radio) => {
                radio.addEventListener('change', () => actualizarPreviewProducto(producto.id));
            });
            actualizarPreviewProducto(producto.id);
        });
    }
}

function buscarProductos(query) {
    const urls = obtenerURLs();
    const resultados = document.getElementById('resultadosBusqueda');

    if (!tipoVendedorActual) {
        resultados.innerHTML = '<div class="alert alert-warning mb-0">Selecciona primero el tipo de vendedor.</div>';
        resultados.style.display = 'block';
        return;
    }

    fetch(`${urls.buscarProductos}?q=${encodeURIComponent(query)}&tipo_venta=${encodeURIComponent(tipoVendedorActual)}`)
        .then((response) => response.json())
        .then((data) => renderResultadosBusqueda(data.productos || []))
        .catch((error) => {
            console.error(error);
            resultados.innerHTML = '<div class="alert alert-danger mb-0">No se pudo buscar productos en este momento.</div>';
            resultados.style.display = 'block';
        });
}

function refrescarBusquedaActual() {
    const inputBuscar = document.getElementById('inputBuscarProducto');
    if (!inputBuscar) return;

    const query = inputBuscar.value.trim();
    if (query.length >= 2) {
        buscarProductos(query);
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
            carrito = [];
            renderCarrito();
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

function agregarDesdeResultados(productoId) {
    const producto = productosActuales[productoId];
    if (!producto) {
        mostrarAlerta('Producto no encontrado.');
        return;
    }

    const modalidad = document.querySelector(`input[name="modalidad_${productoId}"]:checked`)?.value || 'unidad';
    const cantidad = parseInt(document.getElementById(`cantidad_${productoId}`)?.value || 0, 10);

    if (!cantidad || cantidad < 1) {
        mostrarAlerta('Ingresa una cantidad mayor a 0.');
        return;
    }

    if (agregarAlCarrito(producto, cantidad, modalidad)) {
        document.getElementById(`cantidad_${productoId}`).value = '1';
        mostrarAlerta(`${producto.nombre} fue agregado al carrito.`, 'success', 'Agregado');
    }
}

function agregarDesdeResultadosDeposito(productoId) {
    const producto = productosActuales[productoId];
    if (!producto) {
        mostrarAlerta('Producto no encontrado.');
        return;
    }

    const cantidad = parseInt(document.getElementById(`cantidad_${productoId}`)?.value || 0, 10);

    if (!cantidad || cantidad < 1) {
        mostrarAlerta('Ingresa una cantidad mayor a 0.');
        return;
    }

    if (agregarAlCarrito(producto, cantidad, 'unidad')) {
        document.getElementById(`cantidad_${productoId}`).value = '1';
        mostrarAlerta(`${producto.nombre} fue agregado al carrito.`, 'success', 'Agregado');
    }
}

function construirPayloadVenta() {
    const subtotalBs = carrito.reduce((sum, item) => sum + item.subtotal_bs, 0);
    const descuentoValue = parseFloat(document.getElementById('inputDescuento')?.value || 0) || 0;

    let descuentoBs = 0;
    if (tipoDescuentoActual === 'porcentaje') {
        descuentoBs = (subtotalBs * Math.min(descuentoValue, 100)) / 100;
    } else {
        descuentoBs = Math.min(convertirMonedaABs(descuentoValue), subtotalBs);
    }

    return {
        cliente: document.getElementById('inputCliente')?.value.trim() || '',
        telefono: document.getElementById('inputTelefono')?.value.trim() || '',
        razon_social: document.getElementById('inputRazonSocial')?.value.trim() || '',
        direccion: document.getElementById('inputDireccion')?.value.trim() || '',
        tipo_pago: document.getElementById('inputTipoPago')?.value || 'contado',
        tipo_venta: tipoVendedorActual || 'tienda',
        moneda: obtenerMonedaActual(),
        tipo_cambio: obtenerTipoCambioActual(),
        descuento: convertirBsAMoneda(descuentoBs).toFixed(2),
        items: carrito.map((item) => ({
            producto_id: item.producto.id,
            cantidad: item.cantidad,
            modalidad: item.modalidad,
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
        const descuentoBs = convertirMonedaABs(payload.descuento);
        const totalBs = subtotalBs - descuentoBs;

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
                        <p><strong>Tipo de vendedor:</strong> ${escapeHtml(tipoVendedorActual || 'tienda')}</p>
                        <p><strong>Moneda:</strong> ${escapeHtml(payload.moneda)}</p>
                        <p><strong>Items:</strong> ${carrito.length}</p>
                        <hr>
                        <p class="mb-1"><strong>Subtotal:</strong> ${formatearMonto(subtotalBs)}</p>
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
    renderCarrito();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
