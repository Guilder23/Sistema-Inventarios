// CARRITO EN MEMORIA
let carrito = [];
let tipoVendedorActual = 'tienda';
let productosActuales = {};

// ASEGURAR QUE URLS ESTÉ DISPONIBLE
// Esperar a que scripts_globales lo defina, o usar valores por defecto
let URLS_LOCAL = null;

function obtenerURLs() {
    if (typeof URLS !== 'undefined' && URLS) {
        return URLS;
    }
    if (!URLS_LOCAL) {
        URLS_LOCAL = {
            buscarProductos: '/ventas/api/buscar-productos/',
            guardarVentaTienda: '/ventas/tienda/guardar/',
            listaTienda: '/ventas/tienda/listar/'
        };
    }
    return URLS_LOCAL;
}

// CSRF Token
function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
           document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';
}

// Validar teléfono
function validarTelefono(input) {
    input.addEventListener('keypress', function(e) {
        if (!/[0-9]/.test(e.key)) e.preventDefault();
    });
    input.addEventListener('paste', function(e) {
        if (!/^[0-9]*$/.test(e.clipboardData.getData('text'))) e.preventDefault();
    });
}

// Validar cantidad
function validarCantidad(cantidad, modalidad, unidadesPorCaja, tipoVendedor) {
    const cant = parseInt(cantidad);
    if (tipoVendedor === 'deposito') {
        return { valido: cant >= 1, mensaje: 'Cantidad debe ser al menos 1' };
    }
    switch(modalidad) {
        case 'unidad': return { valido: cant >= 1 && cant <= 2, mensaje: 'Modalidad Unidad: 1-2 unidades' };
        case 'caja': return { valido: cant >= 1, mensaje: 'Válido' };
        case 'mayor': return { valido: cant >= 3 && cant < unidadesPorCaja, mensaje: `Entre 3 y ${unidadesPorCaja - 1} unidades` };
        default: return { valido: false, mensaje: 'Modalidad desconocida' };
    }
}

// Agregar al carrito
function agregarAlCarrito(producto, cantidad, modalidad, precioUnitario) {
    const indexExistente = carrito.findIndex(i => i.producto.id === producto.id && i.modalidad === modalidad);
    
    if (indexExistente >= 0) {
        carrito[indexExistente].cantidad += cantidad;
        carrito[indexExistente].subtotal = carrito[indexExistente].cantidad * carrito[indexExistente].precio_unitario;
    } else {
        carrito.push({
            producto: producto,
            cantidad: cantidad,
            modalidad: modalidad,
            precio_unitario: precioUnitario,
            subtotal: cantidad * precioUnitario
        });
    }
    renderCarrito();
    return true;
}

// Remover del carrito
function removerDelCarrito(index) {
    carrito.splice(index, 1);
    renderCarrito();
}

// Renderizar carrito
function renderCarrito() {
    const tbody = document.getElementById('carritoBody') || document.getElementById('tablaCarritoProductos');
    if (!tbody) {
        console.warn('⚠️  [CARRITO] No se encontró elemento de carrito');
        return;
    }
    
    tbody.innerHTML = '';
    if (carrito.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">El carrito está vacío</td></tr>';
        document.getElementById('carritoFooter').style.display = 'none';
        return;
    }
    
    document.getElementById('carritoFooter').style.display = 'block';
    
    carrito.forEach((item, index) => {
        const subtotal = item.subtotal.toFixed(2);
        
        tbody.innerHTML += `<tr>
            <td>${item.producto.nombre}</td>
            <td class="text-center">${item.modalidad}</td>
            <td class="text-center font-weight-500" style="color: #28a745;">Bs. ${item.precio_unitario.toFixed(2)}</td>
            <td class="text-center">${item.cantidad}</td>
            <td class="text-right font-weight-bold" style="color: #28a745;">Bs. ${subtotal}</td>
            <td class="text-center"><button class="btn btn-danger btn-sm" onclick="removerDelCarrito(${index})"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    });
    
    actualizarTotales();
}

// Global state for discount
let tipoDescuentoActual = 'fijo'; // 'fijo' o 'porcentaje'

// Actualizar totales
function actualizarTotales() {
    const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const cantItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const descuentoValue = parseFloat(document.getElementById('inputDescuento')?.value || 0) || 0;
    
    let descuentoAplicado = 0;
    
    if (tipoDescuentoActual === 'porcentaje') {
        // Descuento en porcentaje
        const porcentaje = Math.min(descuentoValue, 100);
        descuentoAplicado = (subtotal * porcentaje) / 100;
    } else {
        // Descuento en monto fijo
        descuentoAplicado = Math.min(descuentoValue, subtotal);
    }
    
    const total = subtotal - descuentoAplicado;
    
    // Actualizar elementos del resumen (solo Bs. para tienda)
    const elemCantItems = document.getElementById('resumenCantItems');
    const elemSubtotal = document.getElementById('resumenSubtotal');
    const elemTotal = document.getElementById('resumenTotal');
    
    if (elemCantItems) {
        elemCantItems.textContent = cantItems;
    }
    if (elemSubtotal) {
        elemSubtotal.textContent = 'Bs. ' + subtotal.toFixed(2);
    }
    if (elemTotal) {
        elemTotal.innerHTML = `<strong style="font-size: 1.3rem; display: block;">Bs. ${total.toFixed(2)}</strong>`;
    }
}

// ═══════════════════════════════════════════════════════════
// BÚSQUEDA DE PRODUCTOS
// ═══════════════════════════════════════════════════════════
function inicializarBusqueda() {
    
    // Teléfono
    const inputTel = document.getElementById('inputTelefono');
    if (inputTel) validarTelefono(inputTel);
    
    // Tipo Vendedor
    const selectTipo = document.getElementById('selectTipoVendedor');
    if (selectTipo) {
        tipoVendedorActual = selectTipo.value || 'tienda';
        
        selectTipo.addEventListener('change', function() {
            tipoVendedorActual = this.value || 'tienda';
            carrito = [];
            renderCarrito();
        });
    }
    
    // TIPO DE PAGO SELECTOR
    const tipoPagoOptions = document.querySelectorAll('.tipo-pago-option');
    const inputTipoPago = document.getElementById('inputTipoPago');
    if (tipoPagoOptions.length > 0) {
        tipoPagoOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                // Remover active de todos
                tipoPagoOptions.forEach(opt => opt.classList.remove('active'));
                // Agregar active al clickeado
                this.classList.add('active');
                // Actualizar valor
                const tipo = this.getAttribute('data-tipo');
                if (inputTipoPago) inputTipoPago.value = tipo;
            });
        });
    }
    
    // INPUT BÚSQUEDA - EVENT LISTENER
    const inputBuscar = document.getElementById('inputBuscarProducto');
    if (!inputBuscar) {
        console.error('❌ [ERROR] #inputBuscarProducto NO ENCONTRADO');
        return;
    }
    
    inputBuscar.addEventListener('input', function(e) {
        const query = this.value.trim();
        const resultados = document.getElementById('resultadosBusqueda');
        
        if (query.length < 2) {
            if (resultados) resultados.style.display = 'none';
            return;
        }
        
        // Mostrar "Buscando..."
        if (resultados) {
            resultados.innerHTML = '<div class="alert alert-info mb-0"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>';
            resultados.style.display = 'block';
        }
        
        // Verificar tipoVendedorActual
        if (!tipoVendedorActual) {
            console.error('❌ [SEARCH] tipoVendedorActual no definido');
            if (resultados) resultados.innerHTML = '<div class="alert alert-warning mb-0">Selecciona tipo primero</div>';
            return;
        }
        
        // Obtener URLs (con fallback)
        const urls = obtenerURLs();
        const url = urls.buscarProductos + `?q=${encodeURIComponent(query)}&tipo_venta=${encodeURIComponent(tipoVendedorActual)}`;
        
        fetch(url)
            .then(r => r.json())
            .then(data => {
                
                const res = document.getElementById('resultadosBusqueda');
                res.innerHTML = '';
                
                productosActuales = {};
                if (data.productos) {
                    data.productos.forEach(p => { productosActuales[p.id] = p; });
                }
                
                if (!data.productos || data.productos.length === 0) {
                    res.innerHTML = '<div class="alert alert-info mb-0">No hay resultados</div>';
                    res.style.display = 'block';
                    return;
                }
                
                data.productos.forEach(producto => {
                    const unidadesPorCaja = producto.unidades_por_caja || 1;
                    const productoId = `producto_${producto.id}`;
                    
                    // Determinar el precio unitario según la modalidad y tipo de vendedor
                    let precioUnitarioDisplay = parseFloat(producto.precio_unidad || 0).toFixed(2);
                    let precioUnitarioDolar = precioUnitarioDisplay;
                    
                    // Si es usuario de almacén, convertir a dólar
                    if (typeof tipoCambioActual !== 'undefined' && tipoCambioActual > 0) {
                        precioUnitarioDolar = (parseFloat(precioUnitarioDisplay) / tipoCambioActual).toFixed(2);
                    }
                    
                    let html = '';
                    
                    // ═════════════════════════════════════════════════════════
                    // DISEÑO PARA DEPOSITO: Simple y limpio (estilo almacén)
                    // ═════════════════════════════════════════════════════════
                    if (tipoVendedorActual === 'deposito') {
                        html = `
                            <div class="resultado-item" style="border-left: 4px solid #667eea; padding: 1rem; margin-bottom: 0.75rem; background: #f8f9fa; border-radius: 0.25rem;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: bold; font-size: 1rem; margin-bottom: 0.25rem;">${producto.nombre}</div>
                                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem;">${producto.codigo}</div>
                                        <div style="font-size: 0.9rem; color: #999;">
                                            📦 Stock: ${producto.stock} cajas | Unidades/caja: ${unidadesPorCaja}
                                        </div>
                                    </div>
                                    <div style="text-align: right; margin-left: 1rem;">
                                        <div style="font-weight: bold; color: #28a745; font-size: 1.1rem; margin-bottom: 0.75rem;">
                                            Bs. ${precioUnitarioDisplay}
                                        </div>
                                        <input type="number" class="form-control form-control-sm" id="cantidad_${producto.id}" placeholder="0" min="0" value="0" style="width: 80px; margin-bottom: 0.5rem;">
                                        <button type="button" class="btn btn-primary btn-sm" id="btn_agregar_${producto.id}" style="width: 100%;">
                                            <i class="fas fa-plus mr-1"></i>Agregar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else {
                        // ═════════════════════════════════════════════════════════
                        // DISEÑO PARA TIENDA: Con modalidades
                        // ═════════════════════════════════════════════════════════
                        const stockText = `Stock: ${producto.stock} | Caja: ${unidadesPorCaja} unidad${unidadesPorCaja > 1 ? 'es' : ''}`;
                        
                        const modalidadHTML = `
                            <div class="col-md-5">
                                <label style="font-size: 0.85rem; font-weight: bold; color: #666;">Modalidad:</label>
                                <div>
                                    <div class="form-check form-check-inline" style="margin-right: 0.5rem;">
                                        <input class="form-check-input" type="radio" name="modalidad_${producto.id}" id="unidad_${producto.id}" value="unidad" checked>
                                        <label class="form-check-label" for="unidad_${producto.id}" style="font-size: 0.95rem;">Unidad</label>
                                    </div>
                                    <div class="form-check form-check-inline" style="margin-right: 0.5rem;">
                                        <input class="form-check-input" type="radio" name="modalidad_${producto.id}" id="caja_${producto.id}" value="caja">
                                        <label class="form-check-label" for="caja_${producto.id}" style="font-size: 0.95rem;">Caja</label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="modalidad_${producto.id}" id="mayor_${producto.id}" value="mayor">
                                        <label class="form-check-label" for="mayor_${producto.id}" style="font-size: 0.95rem;">Mayor</label>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        const precioDisplay = `<span style="font-weight: bold; color: #28a745; font-size: 1rem;">Bs. ${precioUnitarioDisplay}</span>`;
                        
                        html = `
                            <div class="card mb-3 p-3" style="border-left: 4px solid #667eea;">
                                <div class="row mb-2">
                                    <div class="col-12">
                                        <strong style="font-size: 1.1rem;">${producto.nombre}</strong><br>
                                        <small class="text-muted">${stockText}</small>
                                    </div>
                                </div>
                                <div class="row align-items-end">
                                    ${modalidadHTML}
                                    <div class="col-md-2">
                                        <label for="cantidad_${producto.id}" style="font-size: 0.85rem; font-weight: bold; color: #666;">Cantidad:</label>
                                        <input type="number" class="form-control form-control-sm" id="cantidad_${producto.id}" placeholder="0" min="0" value="0" style="border: 1px solid #ddd;">
                                    </div>
                                    <div class="col-md-2" style="text-align: center;">
                                        ${precioDisplay}
                                    </div>
                                    <div class="col-md-3">
                                        <button type="button" class="btn btn-primary btn-sm" id="btn_agregar_${producto.id}" style="width: 100%;">
                                            <i class="fas fa-plus"></i> Agregar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                    
                    res.innerHTML += html;
                    
                    // Agregar event listener al botón
                    const btnAgregar = document.getElementById(`btn_agregar_${producto.id}`);
                    if (btnAgregar) {
                        btnAgregar.addEventListener('click', function(e) {
                            e.preventDefault();
                            agregarDesdeResultadosV2(producto.id, producto.nombre, unidadesPorCaja, producto);
                        });
                    }
                });
                
                res.style.display = 'block';
            })
            .catch(err => {
                const res = document.getElementById('resultadosBusqueda');
                if (res) res.innerHTML = '<div class="alert alert-danger mb-0">Error en búsqueda</div>';
            });
    });
}

// Agregar desde resultados - VERSIÓN MEJORADA
function agregarDesdeResultadosV2(productoId, productoNombre, unidadesPorCaja, productoData) {
    const cantidadInput = document.getElementById(`cantidad_${productoId}`);
    if (!cantidadInput) {
        console.error(`Error: No se encontró input de cantidad para producto ${productoId}`);
        alert('Error: No se encontró cantidad');
        return;
    }
    
    const cantidad = parseInt(cantidadInput.value) || 0;
    console.log(`🛒 [ADD] Cantidad: ${cantidad}`);
    
    if (cantidad === 0) {
        alert('Ingresa una cantidad > 0');
        return;
    }
    
    // Determinar modalidad (para tienda)
    let modalidad = 'unidad';
    if (tipoVendedorActual === 'tienda') {
        const modalidadEl = document.querySelector(`input[name="modalidad_${productoId}"]:checked`);
        if (modalidadEl) {
            modalidad = modalidadEl.value;
        }
    }
    
    // Obtener precio unitario según modalidad
    let precioUnitario = 0;
    if (modalidad === 'unidad') {
        precioUnitario = parseFloat(productoData.precio_unidad) || 0;
    } else if (modalidad === 'caja') {
        precioUnitario = parseFloat(productoData.precio_caja) || parseFloat(productoData.precio_unidad) || 0;
    } else if (modalidad === 'mayor') {
        precioUnitario = parseFloat(productoData.precio_mayor) || parseFloat(productoData.precio_unidad) || 0;
    }
    
    if (!precioUnitario || precioUnitario <= 0) {
        alert(`Error: El producto no tiene precio configurado`);
        return;
    }
    
    // Agregar al carrito
    const producto = { id: productoId, nombre: productoNombre, unidades_por_caja: unidadesPorCaja };
    
    if (agregarAlCarrito(producto, cantidad, modalidad, precioUnitario)) {
        cantidadInput.value = 0;
        // Mostrar notificación
        Swal.fire({
            icon: 'success',
            title: 'Agregado',
            text: `${productoNombre} fue agregado al carrito`,
            timer: 2000,
            showConfirmButton: false
        });
    } else {
        alert('Error al agregar al carrito');
    }
}

// Agregar desde resultados - VERSIÓN ANTIGUA (mantenida para compatibilidad)
function agregarDesdeResultados(productoId, productoNombre, unidadesPorCaja) {
    const cantidad = parseInt(document.getElementById(`cantidad_${productoId}`).value) || 0;
    const modalidad = document.querySelector(`input[name="modalidad_${productoId}"]:checked`)?.value || 'unidad';
    
    if (cantidad === 0) {
        alert('Ingresa cantidad > 0');
        return;
    }
    
    const productoData = productosActuales[productoId];
    if (!productoData) {
        alert('Producto no encontrado');
        return;
    }
    
    let precioUnitario = 0;
    if (modalidad === 'unidad') precioUnitario = parseFloat(productoData.precio_unidad) || 0;
    else if (modalidad === 'caja') precioUnitario = parseFloat(productoData.precio_caja) || parseFloat(productoData.precio_unidad) || 0;
    else if (modalidad === 'mayor') precioUnitario = parseFloat(productoData.precio_mayor) || parseFloat(productoData.precio_unidad) || 0;
    
    if (!precioUnitario || precioUnitario <= 0) {
        alert(`El producto no tiene precio configurado`);
        return;
    }
    
    const producto = { id: productoId, nombre: productoNombre, unidades_por_caja: unidadesPorCaja };
    
    if (agregarAlCarrito(producto, cantidad, modalidad, precioUnitario)) {
        document.getElementById(`cantidad_${productoId}`).value = 0;
    }
}

// Descuento - Event listeners
const inputDesc = document.getElementById('inputDescuento');
if (inputDesc) {
    inputDesc.addEventListener('input', function() {
        actualizarTotales();
    });
}

// Toggle tipo de descuento
const descuentoRadios = document.querySelectorAll('input[name="tipoDescuento"]');
if (descuentoRadios.length > 0) {
    descuentoRadios.forEach(radio => {
        radio.addEventListener('change', function(e) {
            tipoDescuentoActual = this.value;
            const unidadEl = document.getElementById('tipoDescuentoUnidad');
            const inputEl = document.getElementById('inputDescuento');
            
            if (tipoDescuentoActual === 'porcentaje') {
                if (unidadEl) unidadEl.textContent = '%';
                if (inputEl) inputEl.max = '100';
            } else {
                if (unidadEl) unidadEl.textContent = 'Bs.';
                if (inputEl) inputEl.removeAttribute('max');
            }
            
            // Resetear descuento e input cuando se cambia tipo
            if (inputEl) inputEl.value = '0';
            actualizarTotales();
            console.log(`💰 [DESCUENTO] Tipo cambiado a: ${tipoDescuentoActual}`);
        });
    });
}

// ═══════════════════════════════════════════════════════════
// GUARDAR VENTA
// ═══════════════════════════════════════════════════════════
function inicializarGuardarVenta() {
    const btnGuardar = document.getElementById('btnGuardarVenta');
    if (!btnGuardar) return;
    
    btnGuardar.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Validar carrito primero
        if (carrito.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Carrito vacío',
                text: 'Debe agregar productos antes de registrar la venta',
                timer: 2000,
                showConfirmButton: false,
            });
            return;
        }
        
        // Validar cliente (OBLIGATORIO)
        const clienteInput = document.getElementById('inputCliente');
        const cliente = (clienteInput?.value || '').trim();
        if (!cliente) {
            Swal.fire({
                icon: 'warning',
                title: 'Nombre obligatorio',
                text: 'Debe ingresar el nombre del cliente',
                timer: 2000,
                showConfirmButton: false,
            });
            clienteInput?.focus();
            return;
        }
        
        // Validar tipo vendedor
        const tipoVendedor = document.getElementById('selectTipoVendedor')?.value;
        if (!tipoVendedor) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Debe seleccionar tipo de vendedor (Tienda/Depósito)',
                timer: 2000,
                showConfirmButton: false,
            });
            return;
        }
        
        // Preparar datos
        const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
        const descuentoValue = parseFloat(document.getElementById('inputDescuento')?.value || 0) || 0;
        
        let descuentoAplicado = 0;
        if (tipoDescuentoActual === 'porcentaje') {
            const porcentaje = Math.min(descuentoValue, 100);
            descuentoAplicado = (subtotal * porcentaje) / 100;
        } else {
            descuentoAplicado = Math.min(descuentoValue, subtotal);
        }
        
        const total = subtotal - descuentoAplicado;
        
        // Obtener tipo de cambio dinámico
        const tipoCambio = (typeof tipoCambioActual !== 'undefined' && tipoCambioActual > 0) ? tipoCambioActual : 1;
        
        const ventaData = {
            cliente_nombre: cliente,
            tipo_vendedor: tipoVendedor,
            items: carrito.map(item => ({
                producto_id: item.producto.id,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                subtotal: item.subtotal,
                modalidad: item.modalidad
            })),
            subtotal: subtotal,
            descuento: descuentoAplicado,
            total: total,
            tipo_cambio: tipoCambio,
            csrfmiddlewaretoken: getCSRFToken()
        };
        
        console.log('📊 [GUARDAR] Datos de venta:', ventaData);
        
        // Mostrar confirmación
        Swal.fire({
            title: 'Confirmar Venta',
            html: `<div style="text-align: left;">
                <p><strong>Cliente:</strong> ${cliente}</p>
                <p><strong>Items:</strong> ${carrito.length}</p>
                <p><strong>Total:</strong> Bs. ${total.toFixed(2)}</p>
                <p style="color: #666; font-size: 0.9rem;">¿Desea registrar esta venta?</p>
            </div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, registrar',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                // Enviar al servidor
                const urls = obtenerURLs();
                fetch(urls.guardarVentaTienda, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken(),
                    },
                    body: JSON.stringify(ventaData)
                })
                .then(r => r.json())
                .then(data => {
                    
                    if (data.success) {
                        // Mostrar modal de éxito
                        Swal.fire({
                            title: '🎉 ¡Venta Registrada!',
                            html: `<div style="text-align: left;">
                                <p><strong>Venta Registrada Exitosamente</strong></p>
                                <p style="margin: 1rem 0;">
                                    <span style="display: block; font-size: 0.9rem; color: #666;">Código de Venta:</span>
                                    <span style="font-size: 1.3rem; font-weight: bold; color: #28a745;">${data.codigo_venta || 'N/A'}</span>
                                </p>
                                <p style="font-size: 0.9rem; color: #666;">
                                    Total: <strong>Bs. ${total.toFixed(2)}</strong>
                                </p>
                            </div>`,
                            icon: 'success',
                            confirmButtonColor: '#28a745',
                            confirmButtonText: 'Aceptar',
                            allowOutsideClick: false,
                            allowEscapeKey: false,
                        }).then(() => {
                            // Limpiar carrito y recargar
                            carrito = [];
                            document.getElementById('inputDescuento').value = '0';
                            renderCarrito();
                            // Redirigir a lista de ventas
                            const urls = obtenerURLs();
                            window.location.href = urls.listaTienda;
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: data.error || 'No se pudo registrar la venta',
                            timer: 3000,
                        });
                    }
                })
                .catch(err => {
                    console.error('❌ [GUARDAR] Error:', err);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Error al registrar la venta. Intente nuevamente.',
                        timer: 3000,
                    });
                });
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════
// EJECUTAR AL CARGAR
// ═══════════════════════════════════════════════════════════
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        inicializarBusqueda();
        inicializarGuardarVenta();
    });
} else {
    inicializarBusqueda();
    inicializarGuardarVenta();
}
