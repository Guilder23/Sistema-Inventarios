/**
 * Lógica del carrito de compras para Nueva Venta
 * Búsqueda AJAX de productos, carrito en memoria, y envío de la venta
 * DEPENDE DE: La variable global URLS definida en nueva_venta.html:
 *   const URLS = {
 *       buscarProductos: "/ventas/api/buscar-productos/",
 *       guardarVenta: "/ventas/guardar/",
 *       listaVentas: "/ventas/",
 *   };
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

// ESTADO GLOBAL: CARRITO
let carrito = [];  // Array de { productoId, codigo, nombre, precioUnitario, cantidad, stock }
let debounceTimer = null;

// INICIALIZACIÓN
$(document).ready(function () {
    initSelectorTipoPago();
    initSelectorUsuarioVendedor();
    initSelectorTipoPrecio();
    initInputDescuento();
    initBuscadorProductos();
    initBtnLimpiarCarrito();
    initBtnGuardarVenta();
});

// SELECTOR TIPO DE PAGO
function initSelectorTipoPago() {
    $('.tipo-pago-option').on('click', function () {
        $('.tipo-pago-option').removeClass('active');
        $(this).addClass('active');
        $('#inputTipoPago').val($(this).data('tipo'));
    });
}

// SELECTOR USUARIO VENDEDOR (Depósito/Tienda)
function initSelectorUsuarioVendedor() {
    $('#selectUsuarioVendedor').on('change', function () {
        const tipoVendedor = $(this).val();
        
        if (!tipoVendedor) {
            $('#divTipoPrecio').hide();
            $('#selectTipoPrecio').val('');
            return;
        }

        const opciones = tipoVendedor === 'deposito' 
            ? [
                { value: 'caja', text: 'Caja', help: 'Venta por cajas' }
              ]
            : [
                { value: 'unidad', text: 'Unidad', help: 'Venta unitaria (1-2 productos)' },
                { value: 'caja', text: 'Caja', help: 'Venta por cajas' },
                { value: 'mayor', text: 'Mayor', help: 'Venta por mayor (3 a N-1 unidades)' }
              ];

        // Llenar selector tipo precio
        let html = '<option value="">-- Selecciona modalidad --</option>';
        opciones.forEach(op => {
            html += `<option value="${op.value}">${op.text}</option>`;
        });
        
        $('#selectTipoPrecio').html(html);
        $('#divTipoPrecio').show();
    });
}

// SELECTOR TIPO PRECIO (Unidad/Caja/Mayor)
function initSelectorTipoPrecio() {
    $('#selectTipoPrecio').on('change', function () {
        const tipoPrecio = $(this).val();
        let helpText = '';

        if (tipoPrecio === 'unidad') {
            helpText = '<i class="fas fa-info-circle"></i> Uso: precio_unitario del producto';
        } else if (tipoPrecio === 'caja') {
            helpText = '<i class="fas fa-info-circle"></i> Uso: precio_caja del producto';
        } else if (tipoPrecio === 'mayor') {
            helpText = '<i class="fas fa-info-circle"></i> Uso: precio_mayor del producto (cantidad entre 3 y N-1)';
        }

        $('#helpTipoPrecio').html(helpText);
    });
}

// INPUT DESCUENTO
function initInputDescuento() {
    $('#inputDescuento').on('change input', function () {
        actualizarResumen();
    });
}

// BUSCADOR DE PRODUCTOS (AJAX con debounce)
function initBuscadorProductos() {
    const $input = $('#inputBuscarProducto');
    const $resultados = $('#resultadosBusqueda');
    const $buscando = $('#buscandoIndicador');

    $input.on('input', function () {
        const query = $(this).val().trim();

        clearTimeout(debounceTimer);

        if (query.length < 2) {
            $resultados.hide().empty();
            $buscando.hide();
            return;
        }

        $buscando.show();

        debounceTimer = setTimeout(function () {
            buscarProductos(query);
        }, 350);
    });

// Cerrar resultados al hacer click fuera
    $(document).on('click', function (e) {
        if (!$(e.target).closest('.card-buscador').length) {
            $resultados.hide();
        }
    });

// Re-mostrar resultados al enfocar si hay contenido
    $input.on('focus', function () {
        if ($resultados.children().length > 0 && $(this).val().length >= 2) {
            $resultados.show();
        }
    });
}

function buscarProductos(query) {
    const $resultados = $('#resultadosBusqueda');
    const $buscando = $('#buscandoIndicador');

    fetch(`${URLS.buscarProductos}?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
            $buscando.hide();
            renderResultadosBusqueda(data.productos);
        })
        .catch(err => {
            $buscando.hide();
            $resultados.html(`
                <div class="sin-resultados">
                    <i class="fas fa-exclamation-triangle text-danger"></i>
                    <p>Error al buscar productos.</p>
                </div>
            `).show();
            console.error('Error buscando productos:', err);
        });
}

function renderResultadosBusqueda(productos) {
    const $resultados = $('#resultadosBusqueda');
    $resultados.empty();

    if (productos.length === 0) {
        $resultados.html(`
            <div class="sin-resultados">
                <i class="fas fa-search"></i>
                <p>No se encontraron productos con stock disponible.</p>
            </div>
        `).show();
        return;
    }

    productos.forEach(p => {
        // Verificar si ya está en el carrito
        const enCarrito = carrito.find(item => item.productoId === p.id);
        const btnTexto = enCarrito ? 'Ya agregado' : '<i class="fas fa-plus mr-1"></i>Agregar';
        const btnDisabled = enCarrito ? 'disabled' : '';
        const btnClass = enCarrito ? 'btn-secondary' : 'btn-success';

        const item = $(`
            <div class="resultado-item">
                <div class="producto-info">
                    <div class="producto-nombre">${p.nombre}</div>
                    <div class="producto-codigo">${p.codigo}</div>
                </div>
                <div class="producto-meta">
                    <div class="producto-precio">Bs. ${parseFloat(p.precio_unidad).toFixed(2)}</div>
                    <div class="producto-stock">Stock: ${p.stock} uds.</div>
                </div>
                <button class="btn btn-sm ${btnClass} btn-agregar-producto"
                        data-producto='${JSON.stringify(p).replace(/'/g, "&#39;")}'
                        ${btnDisabled}>
                    ${btnTexto}
                </button>
            </div>
        `);

        $resultados.append(item);
    });

    $resultados.show();

    // Event: Agregar producto al carrito
    $resultados.find('.btn-agregar-producto').off('click').on('click', function () {
        if ($(this).prop('disabled')) return;

        const productoData = JSON.parse($(this).attr('data-producto'));
        agregarAlCarrito(productoData);

        // Deshabilitar botón
        $(this).prop('disabled', true)
            .removeClass('btn-success').addClass('btn-secondary')
            .html('Ya agregado');
    });
}

// CARRITO: AGREGAR PRODUCTO
function agregarAlCarrito(producto) {
    // Verificar si ya existe
    const existe = carrito.find(item => item.productoId === producto.id);
    if (existe) {
        Swal.fire({
            icon: 'info',
            title: 'Producto ya en el carrito',
            text: 'Modifique la cantidad directamente en la tabla.',
            timer: 2000,
            showConfirmButton: false,
        });
        return;
    }

    carrito.push({
        productoId: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        precioUnitario: parseFloat(producto.precio_unidad),
        cantidad: 1,
        stock: producto.stock,
    });

    renderCarrito();
    actualizarResumen();
}

// CARRITO: RENDERIZAR TABLA
function renderCarrito() {
    const $body = $('#carritoBody');
    const $vacio = $('#carritoVacio');
    const $contenido = $('#carritoContenido');
    const $footer = $('#carritoFooter');
    const $btnLimpiar = $('#btnLimpiarCarrito');
    const $contador = $('#carritoContador');

    $body.empty();
    $contador.text(carrito.length);

    if (carrito.length === 0) {
        $vacio.show();
        $contenido.hide();
        $footer.hide();
        $btnLimpiar.hide();
        return;
    }

    $vacio.hide();
    $contenido.show();
    $footer.show();
    $btnLimpiar.show();

    carrito.forEach((item, index) => {
        const subtotal = (item.precioUnitario * item.cantidad).toFixed(2);

        const $row = $(`
            <tr class="carrito-row-nueva" data-index="${index}">
                <td class="pl-3">
                    <div class="carrito-producto-nombre">${item.nombre}</div>
                    <div class="carrito-producto-codigo">${item.codigo}</div>
                </td>
                <td class="text-center">
                    Bs. ${item.precioUnitario.toFixed(2)}
                </td>
                <td class="text-center">
                    <div class="input-cantidad-wrapper">
                        <button class="btn btn-outline-secondary btn-cantidad-menos" data-index="${index}">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="input-cantidad" value="${item.cantidad}"
                               min="1" max="${item.stock}" data-index="${index}">
                        <button class="btn btn-outline-secondary btn-cantidad-mas" data-index="${index}">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <small class="text-muted d-block mt-1">Stock: ${item.stock}</small>
                </td>
                <td class="text-right carrito-subtotal">
                    Bs. ${subtotal}
                </td>
                <td class="text-center pr-3">
                    <button class="btn-eliminar-item" data-index="${index}" title="Eliminar">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `);

        $body.append($row);
    });

    // Eventos de cantidad
    $body.find('.btn-cantidad-menos').off('click').on('click', function () {
        const idx = $(this).data('index');
        cambiarCantidad(idx, -1);
    });
    $body.find('.btn-cantidad-mas').off('click').on('click', function () {
        const idx = $(this).data('index');
        cambiarCantidad(idx, 1);
    });
    $body.find('.input-cantidad').off('change').on('change', function () {
        const idx = $(this).data('index');
        let val = parseInt($(this).val());
        if (isNaN(val) || val < 1) val = 1;
        if (val > carrito[idx].stock) val = carrito[idx].stock;
        carrito[idx].cantidad = val;
        renderCarrito();
        actualizarResumen();
    });

    // Evento eliminar
    $body.find('.btn-eliminar-item').off('click').on('click', function () {
        const idx = $(this).data('index');
        eliminarDelCarrito(idx);
    });
}

// CARRITO: CAMBIAR CANTIDAD
function cambiarCantidad(index, delta) {
    const item = carrito[index];
    const nuevaCantidad = item.cantidad + delta;

    if (nuevaCantidad < 1) return;
    if (nuevaCantidad > item.stock) {
        Swal.fire({
            icon: 'warning',
            title: 'Stock insuficiente',
            text: `Solo hay ${item.stock} unidades disponibles de "${item.nombre}".`,
            timer: 2500,
            showConfirmButton: false,
        });
        return;
    }

    item.cantidad = nuevaCantidad;
    renderCarrito();
    actualizarResumen();
}

// CARRITO: ELIMINAR ITEM
function eliminarDelCarrito(index) {
    const item = carrito[index];
    carrito.splice(index, 1);
    renderCarrito();
    actualizarResumen();

    // Rehabilitar botón en resultados de búsqueda visible
    const $resultados = $('#resultadosBusqueda');
    $resultados.find('.btn-agregar-producto').each(function () {
        try {
            const data = JSON.parse($(this).attr('data-producto'));
            if (data.id === item.productoId) {
                $(this).prop('disabled', false)
                    .removeClass('btn-secondary').addClass('btn-success')
                    .html('<i class="fas fa-plus mr-1"></i>Agregar');
            }
        } catch (e) { /* ignorar */ }
    });
}

// CARRITO: ACTUALIZAR RESUMEN
function actualizarResumen() {
    let totalItems = 0;
    let totalPrecio = 0;

    carrito.forEach(item => {
        totalItems += item.cantidad;
        totalPrecio += item.precioUnitario * item.cantidad;
    });

    // Obtener descuento
    const descuento = parseFloat($('#inputDescuento').val()) || 0;
    const totalFinal = Math.max(totalPrecio - descuento, 0); // No permitir negativos

    $('#resumenCantItems').text(totalItems);
    $('#resumenSubtotal').text('Bs. ' + totalPrecio.toFixed(2));
    
    // Mostrar descuento si es mayor a 0
    if (descuento > 0) {
        $('#resumenTotal').html(`<del class="text-muted">Bs. ${totalPrecio.toFixed(2)}</del><br><strong>Bs. ${totalFinal.toFixed(2)}</strong>`);
    } else {
        $('#resumenTotal').text('Bs. ' + totalFinal.toFixed(2));
    }
}

// CARRITO: LIMPIAR TODO
function initBtnLimpiarCarrito() {
    $('#btnLimpiarCarrito').on('click', function () {
        Swal.fire({
            title: 'Vaciar carrito',
            text: '¿Está seguro de eliminar todos los productos del carrito?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, vaciar',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                carrito = [];
                renderCarrito();
                actualizarResumen();

                // Rehabilitar todos los botones de búsqueda
                $('#resultadosBusqueda .btn-agregar-producto').each(function () {
                    $(this).prop('disabled', false)
                        .removeClass('btn-secondary').addClass('btn-success')
                        .html('<i class="fas fa-plus mr-1"></i>Agregar');
                });
            }
        });
    });
}

// GUARDAR VENTA (POST AJAX)
function initBtnGuardarVenta() {
    $('#btnGuardarVenta').on('click', function () {
        guardarVenta();
    });
}

function guardarVenta() {
    const cliente = $('#inputCliente').val().trim();
    const telefono = $('#inputTelefono').val().trim();
    const razonSocial = $('#inputRazonSocial').val().trim();
    const direccion = $('#inputDireccion').val().trim();
    const tipoPago = $('#inputTipoPago').val();

    // Validaciones frontend
    if (!cliente) {
        Swal.fire({
            icon: 'warning',
            title: 'Cliente requerido',
            text: 'Ingrese el nombre del cliente.',
        });
        $('#inputCliente').focus();
        return;
    }

    if (carrito.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Carrito vacío',
            text: 'Agregue al menos un producto al carrito.',
        });
        return;
    }

    // Confirmar
    let totalFinal = 0;
    carrito.forEach(item => {
        totalFinal += item.precioUnitario * item.cantidad;
    });

    const tipoPagoTexto = tipoPago === 'contado' ? 'Al Contado' : 'A Crédito';

    Swal.fire({
        title: 'Confirmar Venta',
        html: `
            <div style="text-align:left;">
                <p><strong>Cliente:</strong> ${cliente}</p>
                ${telefono ? `<p><strong>Teléfono:</strong> ${telefono}</p>` : ''}
                <p><strong>Tipo de pago:</strong> ${tipoPagoTexto}</p>
                <p><strong>Productos:</strong> ${carrito.length} item(s)</p>
                <hr>
                <p style="font-size:1.2rem;"><strong>Total: Bs. ${totalFinal.toFixed(2)}</strong></p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="fas fa-check mr-1"></i>Confirmar Venta',
        cancelButtonText: 'Revisar',
    }).then((result) => {
        if (result.isConfirmed) {
            enviarVenta(cliente, telefono, razonSocial, direccion, tipoPago);
        }
    });
}

function enviarVenta(cliente, telefono, razonSocial, direccion, tipoPago) {
    const $btn = $('#btnGuardarVenta');
    $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...');

    const items = carrito.map(item => ({
        producto_id: item.productoId,
        cantidad: item.cantidad,
        precio_unitario: item.precioUnitario.toFixed(2),
    }));

    //OJO: Incluye telefono, razon_social y direccion (campos reales de tu modelo Venta)
    const payload = {
        cliente: cliente,
        telefono: telefono,
        razon_social: razonSocial,
        direccion: direccion,
        tipo_pago: tipoPago,
        items: items,
    };

    const csrfToken = getCookie('csrftoken');

    fetch(URLS.guardarVenta, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(payload),
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Venta Registrada',
                    html: `<p>${data.message}</p><p>Código: <strong>${data.codigo}</strong></p>`,
                    confirmButtonColor: '#28a745',
                    confirmButtonText: 'Ir al listado',
                }).then(() => {
                    window.location.href = URLS.listaVentas;
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al guardar',
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
            console.error('Error guardando venta:', err);
        })
        .finally(() => {
            $btn.prop('disabled', false).html('<i class="fas fa-check-circle mr-2"></i>Registrar Venta');
        });
}
