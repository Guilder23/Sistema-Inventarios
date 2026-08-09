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
    return document.getElementById('inputMoneda')?.value || 'USD';
}

function obtenerTipoCambioActual() {
    return parseFloat(document.getElementById('tipoCambioActual')?.value || 1) || 1;
}

function formatearMontoSegunMoneda(montoUsd, monedaDestino) {
    const monto = parseFloat(montoUsd || 0);
    const tipoCambio = obtenerTipoCambioActual();

    if (monedaDestino === 'BOB') {
        return `Bs. ${(monto * tipoCambio).toFixed(2)}`;
    }

    return `$ ${monto.toFixed(2)}`;
}

function formatearMonto(montoUsd) {
    return formatearMontoSegunMoneda(montoUsd, obtenerMonedaActual());
}

function renderMontoDual(montoUsd) {
    const monedaActual = obtenerMonedaActual();
    const monedaSecundaria = monedaActual === 'USD' ? 'BOB' : 'USD';

    return `
        <div class="font-weight-bold text-success">${formatearMontoSegunMoneda(montoUsd, monedaActual)}</div>
        <div class="small text-muted">${formatearMontoSegunMoneda(montoUsd, monedaSecundaria)}</div>
    `;
}

function convertirUsdAMoneda(montoUsd) {
    const monto = parseFloat(montoUsd || 0);
    return obtenerMonedaActual() === 'BOB' ? (monto * obtenerTipoCambioActual()) : monto;
}

function convertirMonedaAUsd(monto) {
    const montoConvertido = parseFloat(monto || 0);
    return obtenerMonedaActual() === 'BOB' ? (montoConvertido / obtenerTipoCambioActual()) : montoConvertido;
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
function puedeUsarCaja(producto) {
    const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);
    return unidadesPorCaja > 1;
}

function puedeUsarMayor(producto) {
    const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);
    return unidadesPorCaja >= 4;
}

function determinarModalidadAutomaticaTienda(producto, cantidad, modalidadActual) {
    const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);
    const valor = parseInt(cantidad, 10);

    if (!Number.isInteger(valor) || valor < 1) {
        return modalidadActual || 'unidad';
    }

    // Caja siempre es manual: si el usuario ya eligió caja, no la tocamos aquí
    if (modalidadActual === 'caja') {
        return 'caja';
    }

    // Mayor solo existe si la caja trae 4 o más unidades
    if (unidadesPorCaja >= 4 && valor >= 3 && valor < unidadesPorCaja) {
        return 'mayor';
    }

    return 'unidad';
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
            descuentoBs = Math.min(convertirMonedaAUsd(descuentoInput), subtotalBs);
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
        if (modalidad !== 'caja') {
            return { valido: false, mensaje: 'En Depósito solo se permite vender por caja.' };
        }
        return { valido: true };
    }

    // CAJA: siempre manual
    if (modalidad === 'caja') {
        if (unidadesPorCaja <= 1) {
            return { valido: false, mensaje: 'Este producto no tiene presentación por caja.' };
        }
        return { valido: true };
    }

    // UNIDAD
    if (modalidad === 'unidad') {
        // Si existe modalidad mayor, unidad solo permite 1 o 2
        if (unidadesPorCaja >= 4 && valor > 2) {
            return { valido: false, mensaje: 'Con esa cantidad corresponde precio Mayor.' };
        }
        return { valido: true };
    }

    // MAYOR
    if (modalidad === 'mayor') {
        if (unidadesPorCaja < 4) {
            return { valido: false, mensaje: 'Este producto no tiene modalidad Mayor.' };
        }

        if (valor < 3 || valor >= unidadesPorCaja) {
            return {
                valido: false,
                mensaje: `La modalidad Mayor requiere entre 3 y ${unidadesPorCaja - 1} unidades.`
            };
        }

        return { valido: true };
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
    item.subtotal_bs = item.unidades_operativas * item.precio_unitario_bs;
    item.comision_total_bs = item.unidades_operativas * (parseFloat(item.comision_transporte_bs || 0) || 0);
}

function cambiarPrecioCarrito(index, nuevoPrecio) {
    const item = carrito[index];
    if (!item) return;

    const precioEnMonedaActual = parseFloat(nuevoPrecio);
    if (!Number.isFinite(precioEnMonedaActual) || precioEnMonedaActual <= 0) {
        mostrarAlerta('El precio debe ser mayor a 0.');
        renderCarrito();
        return;
    }

    item.precio_unitario_bs = convertirMonedaAUsd(precioEnMonedaActual);
    item.precio_personalizado = true;
    recalcularItemCarrito(item);
    renderCarrito();
}

function cambiarComisionCarrito(index, nuevaComision) {
    const item = carrito[index];
    if (!item) return;

    if (!esTiendaPrincipalActual()) {
        item.comision_transporte_bs = 0;
        item.comision_total_bs = 0;
        renderCarrito();
        return;
    }

    const comisionEnMonedaActual = parseFloat(nuevaComision);
    if (!Number.isFinite(comisionEnMonedaActual) || comisionEnMonedaActual < 0) {
        mostrarAlerta('La comision debe ser mayor o igual a 0.');
        renderCarrito();
        return;
    }

    item.comision_transporte_bs = convertirMonedaAUsd(comisionEnMonedaActual);
    recalcularItemCarrito(item);
    renderCarrito();
}

function obtenerModalidadesUsadasEnCarrito(productoId, tipoVendedor, indexIgnorado = null) {
    return carrito
        .filter((item, index) =>
            index !== indexIgnorado
            && item.producto.id === productoId
            && obtenerTipoVendedorItem(item) === tipoVendedor
        )
        .map((item) => item.modalidad);
}

function obtenerUnidadesOperativasEnCarrito(productoId, tipoVendedor, indexIgnorado = null) {
    return carrito.reduce((total, item, index) => {
        if (
            index === indexIgnorado
            || item.producto.id !== productoId
            || obtenerTipoVendedorItem(item) !== tipoVendedor
        ) {
            return total;
        }

        return total + calcularUnidadesOperativas(item.producto, item.cantidad, item.modalidad);
    }, 0);
}

function validarModalidadUnicaEnCarrito(producto, modalidad, tipoVendedor, indexIgnorado = null) {
    const modalidadesUsadas = obtenerModalidadesUsadasEnCarrito(producto.id, tipoVendedor, indexIgnorado);

    if (modalidadesUsadas.includes(modalidad)) {
        return {
            valido: false,
            mensaje: `Este producto ya fue agregado como ${obtenerEtiquetaModalidad(modalidad)}.`
        };
    }

    if (modalidadesUsadas.length >= 3) {
        return {
            valido: false,
            mensaje: 'Este producto ya fue agregado en las 3 modalidades permitidas.'
        };
    }

    return { valido: true };
}

function obtenerModalidadesPermitidasProducto(producto, tipoVendedor) {
    if (normalizarTipoVendedor(tipoVendedor) === 'deposito') {
        return ['caja'];
    }

    const modalidades = ['unidad'];

    if (puedeUsarCaja(producto)) {
        modalidades.push('caja');
    }

    if (puedeUsarMayor(producto)) {
        modalidades.push('mayor');
    }

    return modalidades;
}

function ajustarCantidadParaModalidad(producto, cantidad, modalidad) {
    const cantidadBase = parseInt(cantidad, 10) || 1;
    const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);

    if (modalidad === 'mayor') {
        return Math.max(3, Math.min(cantidadBase, unidadesPorCaja - 1));
    }

    return cantidadBase;
}

function resolverModalidadDisponible(producto, tipoVendedor, modalidadPreferida, cantidad) {
    const tipoVendedorFinal = normalizarTipoVendedor(tipoVendedor) || 'tienda';
    const modalidadesPermitidas = obtenerModalidadesPermitidasProducto(producto, tipoVendedorFinal);
    const modalidadesUsadas = obtenerModalidadesUsadasEnCarrito(producto.id, tipoVendedorFinal);
    const ordenModalidades = [
        modalidadPreferida,
        ...modalidadesPermitidas
    ].filter((modalidad, index, modalidades) =>
        modalidad
        && modalidadesPermitidas.includes(modalidad)
        && modalidades.indexOf(modalidad) === index
        && !modalidadesUsadas.includes(modalidad)
    );

    const modalidad = ordenModalidades[0];
    if (!modalidad) return null;

    return {
        modalidad,
        cantidad: ajustarCantidadParaModalidad(producto, cantidad, modalidad)
    };
}

function validarStockTotalProducto(producto, cantidad, modalidad, tipoVendedor, indexIgnorado = null) {
    const stockDisponible = parseInt(producto.stock || 0, 10);
    const unidadesEnCarrito = obtenerUnidadesOperativasEnCarrito(producto.id, tipoVendedor, indexIgnorado);
    const unidadesSolicitadas = unidadesEnCarrito + calcularUnidadesOperativas(producto, cantidad, modalidad);

    if (unidadesSolicitadas > stockDisponible) {
        const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);
        const unidadesRestantes = Math.max(stockDisponible - unidadesEnCarrito, 0);

        if (modalidad === 'caja') {
            const maximoCajas = Math.floor(unidadesRestantes / unidadesPorCaja);
            return {
                valido: false,
                mensaje: `Stock insuficiente. Solo puedes agregar ${maximoCajas} caja(s) mas para "${producto.nombre}".`
            };
        }

        return {
            valido: false,
            mensaje: `Stock insuficiente. Disponible restante: ${unidadesRestantes} unidad(es) para "${producto.nombre}".`
        };
    }

    return { valido: true };
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

    const validacionModalidadUnica = validarModalidadUnicaEnCarrito(producto, modalidad, tipoVendedorFinal);
    if (!validacionModalidadUnica.valido) {
        mostrarAlerta(validacionModalidadUnica.mensaje);
        return false;
    }

    const validacionStock = validarStockTotalProducto(producto, cantidad, modalidad, tipoVendedorFinal);
    if (!validacionStock.valido) {
        mostrarAlerta(validacionStock.mensaje);
        return false;
    }

    const item = {
        producto,
        cantidad,
        modalidad,
        tipo_vendedor: tipoVendedorFinal,
        tipo_vendedor_label: obtenerEtiquetaTipoVendedor(tipoVendedorFinal),
        precio_unitario_bs: precioBaseBs,
        comision_transporte_bs: 0,
        unidades_operativas: 0,
        subtotal_bs: 0,
        comision_total_bs: 0
    };
    recalcularItemCarrito(item);
    carrito.push(item);

    renderCarrito();
    return true;
}

function removerDelCarrito(index) {
    carrito.splice(index, 1);
    renderCarrito();
}
function cambiarModalidadCarrito(index, nuevaModalidad) {
    const item = carrito[index];
    if (!item) return;

    const producto = item.producto;
    const tipoVendedor = obtenerTipoVendedorItem(item);
    const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);

    // En depósito solo se permite caja
    if (tipoVendedor === 'deposito') {
        nuevaModalidad = 'caja';
    }

    // Validar si existe presentación por caja
    if (nuevaModalidad === 'caja' && unidadesPorCaja <= 1) {
        mostrarAlerta('Este producto no tiene presentación por caja.');
        renderCarrito();
        return;
    }

    // Validar si existe modalidad mayor
    if (nuevaModalidad === 'mayor' && unidadesPorCaja < 4) {
        mostrarAlerta('Este producto no tiene modalidad Mayor.');
        renderCarrito();
        return;
    }

    // Validar cantidad según modalidad
    const validacionModalidadUnica = validarModalidadUnicaEnCarrito(producto, nuevaModalidad, tipoVendedor, index);
    if (!validacionModalidadUnica.valido) {
        mostrarAlerta(validacionModalidadUnica.mensaje);
        renderCarrito();
        return;
    }

    const validacionCantidad = validarCantidadSegunModalidad(
        item.cantidad,
        nuevaModalidad,
        unidadesPorCaja,
        tipoVendedor
    );

    if (!validacionCantidad.valido) {
        mostrarAlerta(validacionCantidad.mensaje);
        renderCarrito();
        return;
    }

    // Validar stock disponible
    const validacionStock = validarStockTotalProducto(
        producto,
        item.cantidad,
        nuevaModalidad,
        tipoVendedor,
        index
    );

    if (!validacionStock.valido) {
        mostrarAlerta(validacionStock.mensaje);
        renderCarrito();
        return;
    }

    // Obtener nuevo precio según modalidad
    const precioBaseBs = obtenerPrecioBasePorModalidad(producto, nuevaModalidad);
    if (!precioBaseBs || precioBaseBs <= 0) {
        mostrarAlerta(
            `El producto "${producto.nombre}" no tiene precio para la modalidad ${obtenerEtiquetaModalidad(nuevaModalidad)}.`
        );
        renderCarrito();
        return;
    }

    // Aplicar cambio
    item.modalidad = nuevaModalidad;
    item.precio_unitario_bs = precioBaseBs;
    item.precio_personalizado = false;

    recalcularItemCarrito(item);
    renderCarrito();
}

function cambiarCantidadCarrito(index, nuevaCantidad) {
    const item = carrito[index];
    if (!item) return;

    const cantidad = parseInt(nuevaCantidad, 10);
    const producto = item.producto;
    const tipoVendedor = obtenerTipoVendedorItem(item);
    const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);

    if (!Number.isInteger(cantidad) || cantidad < 1) {
        mostrarAlerta('La cantidad debe ser mayor a 0.');
        renderCarrito();
        return;
    }

    let modalidadFinal = item.modalidad;

    if (tipoVendedor === 'deposito') {
        modalidadFinal = 'caja';
    } else {
        modalidadFinal = determinarModalidadAutomaticaTienda(producto, cantidad, item.modalidad);
    }

    const validacionModalidadUnica = validarModalidadUnicaEnCarrito(producto, modalidadFinal, tipoVendedor, index);
    if (!validacionModalidadUnica.valido) {
        mostrarAlerta(validacionModalidadUnica.mensaje);
        renderCarrito();
        return;
    }

    const validacionCantidad = validarCantidadSegunModalidad(
        cantidad,
        modalidadFinal,
        unidadesPorCaja,
        tipoVendedor
    );

    if (!validacionCantidad.valido) {
        mostrarAlerta(validacionCantidad.mensaje);
        renderCarrito();
        return;
    }

    const validacionStock = validarStockTotalProducto(producto, cantidad, modalidadFinal, tipoVendedor, index);
    if (!validacionStock.valido) {
        mostrarAlerta(validacionStock.mensaje);
        renderCarrito();
        return;
    }

    if (modalidadFinal !== item.modalidad || !item.precio_personalizado) {
        const precioBaseBs = obtenerPrecioBasePorModalidad(producto, modalidadFinal);
        if (!precioBaseBs || precioBaseBs <= 0) {
            mostrarAlerta(`El producto "${producto.nombre}" no tiene precio para la modalidad ${obtenerEtiquetaModalidad(modalidadFinal)}.`);
            renderCarrito();
            return;
        }

        item.precio_unitario_bs = precioBaseBs;
        item.precio_personalizado = false;
    }

    item.cantidad = cantidad;
    item.modalidad = modalidadFinal;
    recalcularItemCarrito(item);
    renderCarrito();
}

function aumentarCantidadCarrito(index) {
    const item = carrito[index];
    if (!item) return;
    cambiarCantidadCarrito(index, item.cantidad + 1);
}

function disminuirCantidadCarrito(index) {
    const item = carrito[index];
    if (!item) return;
    if (item.cantidad <= 1) return;
    cambiarCantidadCarrito(index, item.cantidad - 1);
}

function renderCarrito() {
    const tbody = document.getElementById('carritoBody');
    const footer = document.getElementById('carritoFooter');
    const carritoVacio = document.getElementById('carritoVacio');

    if (!tbody) return;

    if (carrito.length === 0) {
        tbody.innerHTML = '';
        if (footer) footer.style.display = 'none';
        if (carritoVacio) carritoVacio.style.display = 'block';
        actualizarTotales();
        return;
    }

    if (footer) footer.style.display = 'block';
    if (carritoVacio) carritoVacio.style.display = 'none';

    const mostrarColumnaComision = esTiendaPrincipalActual();

    tbody.innerHTML = carrito.map((item, index) => {
        const tipoVendedor = obtenerTipoVendedorItem(item);
        const esDeposito = tipoVendedor === 'deposito';

        const unidadesPorCaja = parseInt(item.producto.unidades_por_caja || 1, 10);
        const mostrarCaja = unidadesPorCaja > 1;
        const mostrarMayor = unidadesPorCaja >= 4;
        const modalidadesUsadas = obtenerModalidadesUsadasEnCarrito(item.producto.id, tipoVendedor, index);
        const unidadUsada = modalidadesUsadas.includes('unidad');
        const cajaUsada = modalidadesUsadas.includes('caja');
        const mayorUsada = modalidadesUsadas.includes('mayor');

        return `
            <tr class="carrito-row-nueva">
                <td class="pl-3">
                    <div class="carrito-producto-nombre">${escapeHtml(item.producto.nombre)}</div>
                    <div class="carrito-producto-codigo">${escapeHtml(item.producto.codigo || '')}</div>
                </td>

                <td class="text-center">
                    <span class="${obtenerClaseTipoVendedor(tipoVendedor)}">
                        ${escapeHtml(item.tipo_vendedor_label || obtenerEtiquetaTipoVendedor(tipoVendedor))}
                    </span>
                </td>

                <td class="text-center">
                    ${esDeposito ? `
                       <span class="carrito-modalidad-fija carrito-modalidad-fija--deposito">Caja</span>
                    ` : `
                        <div class="carrito-modalidad-botones">
                            <button
                                type="button"
                                class="btn btn-sm ${unidadUsada ? 'btn-secondary' : (item.modalidad === 'unidad' ? 'btn-primary' : 'btn-outline-primary')}"
                                onclick="cambiarModalidadCarrito(${index}, 'unidad')"
                                ${unidadUsada ? 'disabled title="Unidad ya usada para este producto"' : ''}
                            >
                                Unidad
                            </button>

                            ${mostrarCaja ? `
                                <button
                                    type="button"
                                    class="btn btn-sm ${cajaUsada ? 'btn-secondary' : (item.modalidad === 'caja' ? 'btn-primary' : 'btn-outline-primary')}"
                                    onclick="cambiarModalidadCarrito(${index}, 'caja')"
                                    ${cajaUsada ? 'disabled title="Caja ya usada para este producto"' : ''}
                                >
                                    Caja
                                </button>
                            ` : ''}

                            ${mostrarMayor ? `
                                <button
                                    type="button"
                                    class="btn btn-sm ${mayorUsada ? 'btn-secondary' : (item.modalidad === 'mayor' ? 'btn-primary' : 'btn-outline-primary')}"
                                    onclick="cambiarModalidadCarrito(${index}, 'mayor')"
                                    ${mayorUsada ? 'disabled title="Mayor ya usada para este producto"' : ''}
                                >
                                    Mayor
                                </button>
                            ` : ''}
                        </div>
                    `}

                    <div class="small text-muted mt-2">
                        ${escapeHtml(obtenerResumenModalidad(item.producto, item.cantidad, item.modalidad))}
                    </div>
                </td>

                <td class="text-center">
                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        class="form-control form-control-sm text-center carrito-precio-input"
                        value="${convertirUsdAMoneda(item.precio_unitario_bs).toFixed(2)}"
                        onchange="cambiarPrecioCarrito(${index}, this.value)"
                    >
                    <div class="small text-muted mt-1">
                        ${obtenerMonedaActual()}
                    </div>
                </td>

                ${mostrarColumnaComision ? `
                    <td class="text-center">
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            class="form-control form-control-sm text-center carrito-precio-input"
                            value="${convertirUsdAMoneda(item.comision_transporte_bs || 0).toFixed(2)}"
                            onchange="cambiarComisionCarrito(${index}, this.value)"
                        >
                        <div class="small text-muted mt-1">
                            x ${item.unidades_operativas} = ${formatearMonto(item.comision_total_bs || 0)}
                        </div>
                    </td>
                ` : ''}

                <td class="text-center">
                    <div class="carrito-cantidad-control">
                        <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary"
                            onclick="disminuirCantidadCarrito(${index})"
                        >
                            -
                        </button>

                        <input
                            type="number"
                            min="1"
                            class="form-control form-control-sm text-center carrito-cantidad-input"
                            value="${item.cantidad}"
                            onchange="cambiarCantidadCarrito(${index}, this.value)"
                        >

                        <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary"
                            onclick="aumentarCantidadCarrito(${index})"
                        >
                            +
                        </button>
                    </div>
                </td>

                <td class="text-right font-weight-bold">
                    ${renderMontoDual(item.subtotal_bs)}
                </td>

                <td class="text-center pr-3">
                    <button
                        type="button"
                        class="btn btn-sm btn-danger"
                        onclick="removerDelCarrito(${index})"
                    >
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    actualizarTotales();
}

function actualizarTotales() {
    const subtotalBs = carrito.reduce((sum, item) => sum + item.subtotal_bs, 0);
    const totalComisionBs = carrito.reduce((sum, item) => sum + (item.comision_total_bs || 0), 0);
    const cantidadItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const detalleDescuento = obtenerDetalleDescuentoActual(subtotalBs);
    const descuentoBs = detalleDescuento.descuentoBs;

    const totalBs = subtotalBs - descuentoBs + totalComisionBs;

    const resumenCantItems = document.getElementById('resumenCantItems');
    const resumenSubtotal = document.getElementById('resumenSubtotal');
    const resumenTotal = document.getElementById('resumenTotalFinal');
    const descuentoResumen = document.getElementById('descuentoResumen');
    const descuentoCalculo = document.getElementById('descuentoCalculo');
    const resumenComision = document.getElementById('resumenComisionTransporte');

    if (resumenCantItems) resumenCantItems.textContent = cantidadItems;
    if (resumenSubtotal) resumenSubtotal.textContent = formatearMonto(subtotalBs);
    if (resumenTotal) resumenTotal.innerHTML = `<strong style="font-size: 1.3rem; display: block;">${formatearMonto(totalBs)}</strong>`;
    if (descuentoResumen) descuentoResumen.textContent = detalleDescuento.resumen;
    if (descuentoCalculo) descuentoCalculo.textContent = `${formatearMonto(subtotalBs)} - ${formatearMonto(descuentoBs)} + ${formatearMonto(totalComisionBs)} = ${formatearMonto(totalBs)}`;
    if (resumenComision) resumenComision.textContent = formatearMonto(totalComisionBs);
}

function actualizarPreviewProducto(productoId, tipoVendedorContexto = tipoVendedorActual) {
    const claveProducto = obtenerClaveProductoBusqueda(productoId, tipoVendedorContexto);
    const producto = productosActuales[claveProducto];
    if (!producto) return;

    const contextoId = obtenerIdContextoBusqueda(productoId, tipoVendedorContexto);
    const modalidad = document.querySelector(`input[name="modalidad_${contextoId}"]:checked`)?.value || 'unidad';
    const cantidadInput = document.getElementById(`cantidad_${contextoId}`);
    const resumen = document.getElementById(`preview_modalidad_${contextoId}`);
    const precioBase = document.getElementById(`precio_base_${contextoId}`);
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

    if (precioBase) {
        precioBase.textContent = formatearMonto(precioBs);
    }

    if (resumen) {
        resumen.innerHTML = `
            <strong>Precio aplicado:</strong> ${obtenerEtiquetaModalidad(modalidad)} -
            <span class="text-success">${formatearMonto(precioBs)}</span>
        `;
    }
}
function renderTarjetaProducto(producto) {
    const contextoId = obtenerIdContextoBusqueda(producto.id, tipoVendedorActual);
    const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);
    const stock = parseInt(producto.stock || 0, 10);
    const stockCajas = Math.floor(stock / Math.max(unidadesPorCaja, 1));
    const precioUnidad = obtenerPrecioBasePorModalidad(producto, 'unidad');

    const bloqueModalidades = tipoVendedorActual === 'tienda'
        ? `
            <div class="producto-acciones-grid">
                <div>
                    <label class="producto-label">Modalidad</label>
                    <div class="modalidad-botones" data-contexto="${contextoId}">
                        <input class="modalidad-input" type="radio" name="modalidad_${contextoId}" id="unidad_${contextoId}" value="unidad" checked>
                        <label class="modalidad-btn" for="unidad_${contextoId}">Unidad</label>

                        <input class="modalidad-input" type="radio" name="modalidad_${contextoId}" id="caja_${contextoId}" value="caja">
                        <label class="modalidad-btn" for="caja_${contextoId}">Caja</label>

                        <input class="modalidad-input" type="radio" name="modalidad_${contextoId}" id="mayor_${contextoId}" value="mayor">
                        <label class="modalidad-btn" for="mayor_${contextoId}">Mayor</label>
                    </div>

                    <div class="producto-precio-aplicado" id="preview_modalidad_${contextoId}">
                        <strong>Precio aplicado:</strong> Unidad -
                        <span class="text-success">${formatearMonto(precioUnidad)}</span>
                    </div>
                </div>

                <div>
                    <label for="cantidad_${contextoId}" class="producto-label">Cantidad</label>
                    <input
                        type="number"
                        class="form-control producto-cantidad-input"
                        id="cantidad_${contextoId}"
                        min="1"
                        value="1"
                    >
                </div>

                <div class="producto-boton-wrap">
                    <button
                        type="button"
                        class="btn btn-primary producto-btn-agregar"
                        onclick="agregarDesdeResultados(${producto.id}, '${tipoVendedorActual}')"
                    >
                        <i class="fas fa-plus mr-1"></i>Agregar al carrito
                    </button>
                </div>
            </div>
        `
        : `
            <div class="producto-acciones-grid producto-acciones-grid--deposito">
                <div>
                    <label for="cantidad_${contextoId}" class="producto-label">Cantidad</label>
                    <input
                        type="number"
                        class="form-control producto-cantidad-input"
                        id="cantidad_${contextoId}"
                        min="1"
                        value="1"
                    >
                </div>

                <div class="producto-boton-wrap">
                    <button
                        type="button"
                        class="btn btn-primary producto-btn-agregar"
                        onclick="agregarDesdeResultadosDeposito(${producto.id}, '${tipoVendedorActual}')"
                    >
                        <i class="fas fa-plus mr-1"></i>Agregar al carrito
                    </button>
                </div>
            </div>
        `;

    return `
        <div class="producto-card-minimal mb-3">
            <div class="producto-card-head">
                <div>
                    <div class="producto-codigo-grande">${escapeHtml(producto.codigo || 'SIN-CODIGO')}</div>
                    <div class="producto-meta-secundaria">
                        ${escapeHtml(obtenerEtiquetaTipoVendedor(tipoVendedorActual))}
                    </div>
                </div>

                <div class="producto-precio-principal">
                    <span class="producto-precio-label">Precio base</span>
                    <strong id="precio_base_${contextoId}">${formatearMonto(precioUnidad)}</strong>
                </div>
            </div>

            <div class="producto-stock-grid">
                <div class="producto-stock-card">
                    <span class="producto-stock-titulo">Stock actual</span>
                    <strong class="producto-stock-valor">${stock}</strong>
                    <small>unidades</small>
                </div>

                ${tipoVendedorActual === 'tienda' ? `
                    <div class="producto-stock-card">
                        <span class="producto-stock-titulo">Cajas actuales</span>
                        <strong class="producto-stock-valor">${stockCajas}</strong>
                        <small>cajas disponibles</small>
                    </div>

                    <div class="producto-stock-card producto-stock-card--soft">
                        <span class="producto-stock-titulo">Unidades por caja</span>
                        <strong class="producto-stock-valor">${unidadesPorCaja}</strong>
                        <small>unidades</small>
                    </div>
                ` : `
                    <div class="producto-stock-card producto-stock-card--soft">
                        <span class="producto-stock-titulo">Modalidad</span>
                        <strong class="producto-stock-valor">Unidad</strong>
                        <small>venta depósito</small>
                    </div>
                `}
            </div>

            ${bloqueModalidades}
        </div>
    `;
}
function renderTarjetaProductoCompacta(producto) {
    const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1, 10);
    const stock = parseInt(producto.stock || 0, 10);
    const stockCajas = Math.floor(stock / Math.max(unidadesPorCaja, 1));

    const precioUnidadBs = obtenerPrecioBasePorModalidad(producto, 'unidad');
    const precioCajaBs = obtenerPrecioBasePorModalidad(producto, 'caja');
    const precioMayorBs = obtenerPrecioBasePorModalidad(producto, 'mayor');

    const precioUnidadBob = precioUnidadBs * obtenerTipoCambioActual();
    const precioCajaBob = precioCajaBs * obtenerTipoCambioActual();
    const precioMayorBob = precioMayorBs * obtenerTipoCambioActual();

    const esDeposito = tipoVendedorActual === 'deposito';

    return `
        <div class="producto-card-sugerido">
            <div class="producto-card-sugerido-head">
                <div class="producto-card-sugerido-codigo">${escapeHtml(producto.codigo || 'SIN-CODIGO')}</div>
            </div>

            <div class="producto-card-sugerido-meta">
                <span class="chip-meta">Stock ${stock}</span>
                ${stockCajas > 0 ? `<span class="chip-meta">${stockCajas} cajas</span>` : ''}
            </div>

            <div class="producto-card-sugerido-precios">
                ${esDeposito ? `
                    <div class="precio-mini-linea">
                        <span class="precio-mini-label">Caja</span>
                        <span class="precio-mini-bs">Bs. ${Number(precioCajaBob).toFixed(2)}</span>
                        <span class="precio-mini-usd">$ ${Number(precioCajaBs).toFixed(2)}</span>
                    </div>
                ` : `
                    <div class="precio-mini-linea">
                        <span class="precio-mini-label">Unidad</span>
                        <span class="precio-mini-bs">Bs. ${Number(precioUnidadBob).toFixed(2)}</span>
                        <span class="precio-mini-usd">$ ${Number(precioUnidadBs).toFixed(2)}</span>
                    </div>

                    <div class="precio-mini-linea">
                        <span class="precio-mini-label">Caja</span>
                        <span class="precio-mini-bs">Bs. ${Number(precioCajaBob).toFixed(2)}</span>
                        <span class="precio-mini-usd">$ ${Number(precioCajaBs).toFixed(2)}</span>
                    </div>

                    <div class="precio-mini-linea">
                        <span class="precio-mini-label">Mayor</span>
                        <span class="precio-mini-bs">Bs. ${Number(precioMayorBob).toFixed(2)}</span>
                        <span class="precio-mini-usd">$ ${Number(precioMayorBs).toFixed(2)}</span>
                    </div>
                `}
            </div>

            <div class="producto-card-sugerido-actions">
                <button
                    type="button"
                    class="btn btn-sm btn-primary btn-block"
                    onclick="agregarProductoSugeridoDirecto(${producto.id}, '${tipoVendedorActual}')"
                >
                    <i class="fas fa-plus mr-1"></i>Agregar
                </button>
            </div>
        </div>
    `;
}
function agregarProductoSugeridoDirecto(productoId, tipoVendedorContexto = tipoVendedorActual) {
    const claveProducto = obtenerClaveProductoBusqueda(productoId, tipoVendedorContexto);
    const producto = productosActuales[claveProducto];

    if (!producto) {
        mostrarAlerta('Producto no encontrado.');
        return;
    }

    const cantidadInicial = 1;
    const modalidadInicial = tipoVendedorContexto === 'deposito' ? 'caja' : 'unidad';
    const modalidadDisponible = resolverModalidadDisponible(
        producto,
        tipoVendedorContexto || 'tienda',
        modalidadInicial,
        cantidadInicial
    );

    if (!modalidadDisponible) {
        mostrarAlerta('Este producto ya fue agregado en todas sus modalidades disponibles.');
        return;
    }

    if (agregarAlCarrito(producto, modalidadDisponible.cantidad, modalidadDisponible.modalidad, tipoVendedorContexto || 'tienda')) {
        mostrarAlerta(`${producto.codigo || producto.nombre} fue agregado al carrito.`, 'success', 'Agregado');
    }
}
function mostrarProductoSugeridoExpandido(productoId) {
    const claveProducto = obtenerClaveProductoBusqueda(productoId, tipoVendedorActual);
    const producto = productosActuales[claveProducto];
    const resultados = document.getElementById('resultadosBusqueda');
    const sugeridosWrap = document.getElementById('productosSugeridos');

    if (!producto || !resultados) return;

    resultados.innerHTML = renderTarjetaProducto(producto);
    resultados.style.display = 'block';

    if (sugeridosWrap) {
        sugeridosWrap.style.display = 'none';
    }

    if (tipoVendedorActual === 'tienda') {
        const contextoId = obtenerIdContextoBusqueda(producto.id, tipoVendedorActual);
        document.querySelectorAll(`input[name="modalidad_${contextoId}"]`).forEach((radio) => {
            radio.addEventListener('change', () => actualizarPreviewProducto(producto.id, tipoVendedorActual));
        });
        actualizarPreviewProducto(producto.id, tipoVendedorActual);
    }
}

let productosSugeridos = [];

function cargarProductosSugeridos() {
    const urls = obtenerURLs();
    const sugeridosWrap = document.getElementById('productosSugeridos');
    const sugeridosTrack = document.getElementById('productosSugeridosTrack');
    const resultados = document.getElementById('resultadosBusqueda');

    if (resultados) {
        resultados.innerHTML = '';
        resultados.style.display = 'none';
    }

    if (!sugeridosWrap || !sugeridosTrack) return;

    fetch(`${urls.buscarProductos}?q=&tipo_venta=${encodeURIComponent(tipoVendedorActual)}&limit=5`)
        .then((response) => response.json())
        .then((data) => {
            productosSugeridos = (data.productos || []).slice(0, 5);

            if (!productosSugeridos.length) {
                sugeridosWrap.style.display = 'none';
                sugeridosTrack.innerHTML = '';
                return;
            }

            productosSugeridos.forEach((producto) => {
                const claveProducto = obtenerClaveProductoBusqueda(producto.id, tipoVendedorActual);
                productosActuales[claveProducto] = {
                    ...producto,
                    tipo_vendedor_busqueda: normalizarTipoVendedor(tipoVendedorActual) || 'tienda'
                };
            });

            sugeridosTrack.innerHTML = productosSugeridos.map((producto) => `
                <div class="producto-sugerido-slide">
                    ${renderTarjetaProductoCompacta(producto)}
                </div>
            `).join('');

            sugeridosWrap.style.display = 'block';
        })
        .catch((error) => {
            console.error(error);
            sugeridosWrap.style.display = 'none';
            sugeridosTrack.innerHTML = '';
        });
}

function renderResultadosBusqueda(productos) {
    const resultados = document.getElementById('resultadosBusqueda');
    const sugeridosWrap = document.getElementById('productosSugeridos');
    if (!resultados) return;

    productosActuales = {};
    resultados.innerHTML = '';

    if (sugeridosWrap) {
        sugeridosWrap.style.display = 'none';
    }

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

    resultados.innerHTML = `
        <div class="productos-sugeridos-track productos-sugeridos-track--resultados">
            ${productos.map((producto) => `
                <div class="producto-sugerido-slide">
                    ${renderTarjetaProductoCompacta(producto)}
                </div>
            `).join('')}
        </div>
    `;

    resultados.style.display = 'block';
}
function buscarProductos(query) {
    const urls = obtenerURLs();
    const resultados = document.getElementById('resultadosBusqueda');
    const sugeridosWrap = document.getElementById('productosSugeridos');
    const tipoVendedorConsulta = tipoVendedorActual;

    if (!tipoVendedorConsulta) {
        resultados.innerHTML = '<div class="alert alert-warning mb-0">Selecciona primero el tipo de vendedor.</div>';
        resultados.style.display = 'block';
        if (sugeridosWrap) sugeridosWrap.style.display = 'none';
        return;
    }

    const tokenBusqueda = ++secuenciaBusqueda;
    resultados.innerHTML = '<div class="alert alert-light mb-0"><i class="fas fa-spinner fa-spin mr-2"></i>Actualizando resultados...</div>';
    resultados.style.display = 'block';
    if (sugeridosWrap) sugeridosWrap.style.display = 'none';

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
    const sugeridosWrap = document.getElementById('productosSugeridos');

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

    if (sugeridosWrap) {
        sugeridosWrap.style.display = 'none';
    }

    cargarProductosSugeridos();
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
                const resultados = document.getElementById('resultadosBusqueda');
                const sugeridosWrap = document.getElementById('productosSugeridos');

                if (resultados) {
                    resultados.innerHTML = '';
                    resultados.style.display = 'none';
                }

                if (sugeridosWrap) {
                    sugeridosWrap.style.display = 'none';
                }

                cargarProductosSugeridos();
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

    const modalidadDisponible = resolverModalidadDisponible(
        producto,
        tipoVendedorContexto || 'tienda',
        modalidad,
        cantidad
    );

    if (!modalidadDisponible) {
        mostrarAlerta('Este producto ya fue agregado en todas sus modalidades disponibles.');
        return;
    }

    if (agregarAlCarrito(producto, modalidadDisponible.cantidad, modalidadDisponible.modalidad, tipoVendedorContexto || 'tienda')) {
        const inputCantidad = document.getElementById(`cantidad_${contextoId}`);
        if (inputCantidad) inputCantidad.value = '1';
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

    const modalidadDisponible = resolverModalidadDisponible(
        producto,
        tipoVendedorContexto || 'deposito',
        'caja',
        cantidad
    );

    if (!modalidadDisponible) {
        mostrarAlerta('Este producto ya fue agregado en todas sus modalidades disponibles.');
        return;
    }

    if (agregarAlCarrito(producto, modalidadDisponible.cantidad, modalidadDisponible.modalidad, tipoVendedorContexto || 'deposito')) {
        const inputCantidad = document.getElementById(`cantidad_${contextoId}`);
        if (inputCantidad) inputCantidad.value = '1';
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
        comentario: document.getElementById('inputComentario')?.value.trim() || '',
        tipo_pago: document.getElementById('inputTipoPago')?.value || 'contado',
        tipo_venta: tipoVendedorActual || 'tienda',
        moneda: obtenerMonedaActual(),
        tipo_cambio: obtenerTipoCambioActual(),
        descuento: convertirUsdAMoneda(detalleDescuento.descuentoBs).toFixed(2),
        descuento_tipo: descuentoTipo,
        descuento_valor: detalleDescuento.habilitado ? detalleDescuento.valorIngresado : 0,
        items: carrito.map((item) => ({
            producto_id: item.producto.id,
            cantidad: item.cantidad,
            modalidad: item.modalidad,
            tipo_vendedor: obtenerTipoVendedorItem(item),
            precio_unitario: convertirUsdAMoneda(item.precio_unitario_bs).toFixed(2),
            comision_transporte: convertirUsdAMoneda(item.comision_transporte_bs || 0).toFixed(2),
            unidades_operativas: item.unidades_operativas
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
        const totalComisionBs = carrito.reduce((sum, item) => sum + (item.comision_total_bs || 0), 0);
        const detalleDescuento = obtenerDetalleDescuentoActual(subtotalBs);
        const descuentoBs = detalleDescuento.descuentoBs;
        const totalBs = subtotalBs - descuentoBs + totalComisionBs;
        const tiposVendedor = [...new Set(carrito.map((item) => obtenerEtiquetaTipoVendedor(obtenerTipoVendedorItem(item))))].join(', ');
        const descuentoHtml = descuentoBs > 0
            ? `
                <p class="mb-1"><strong>Descuento:</strong> ${detalleDescuento.resumen}</p>
                <p class="mb-0"><strong>Calculo:</strong> ${formatearMonto(subtotalBs)} - ${formatearMonto(descuentoBs)} + ${formatearMonto(totalComisionBs)} = ${formatearMonto(totalBs)}</p>
            `
            : `<p class="mb-0"><strong>Descuento:</strong> Sin descuento</p>`;

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
                        ${payload.comentario ? `<p><strong>Comentario:</strong> ${escapeHtml(payload.comentario)}</p>` : ''}
                        <p><strong>Origenes en carrito:</strong> ${escapeHtml(tiposVendedor || 'Tienda')}</p>
                        <p><strong>Moneda:</strong> ${escapeHtml(payload.moneda)}</p>
                        <p><strong>Items:</strong> ${carrito.length}</p>
                        <hr>
                        <p class="mb-1"><strong>Subtotal:</strong> ${formatearMonto(subtotalBs)}</p>
                        <p class="mb-1"><strong>Comision transporte:</strong> ${formatearMonto(totalComisionBs)}</p>
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
window.cambiarModalidadCarrito = cambiarModalidadCarrito;
window.cambiarCantidadCarrito = cambiarCantidadCarrito;
window.cambiarPrecioCarrito = cambiarPrecioCarrito;
window.cambiarComisionCarrito = cambiarComisionCarrito;
window.aumentarCantidadCarrito = aumentarCantidadCarrito;
window.disminuirCantidadCarrito = disminuirCantidadCarrito;

function init() {
    const opciones = document.querySelectorAll('.tipo-pago-option');
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

    inicializarBusqueda();
    cargarProductosSugeridos();
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
