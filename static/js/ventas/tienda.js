// CARRITO EN MEMORIA
let carrito = [];
let tipoVendedorActual = null; // null, 'tienda', o 'deposito'

// FUNCIONES AUXILIARES
function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
           document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';
}

// VALIDADORES POR MODALIDAD (SOLO PARA TIENDA)
function validarCantidad(cantidad, modalidad, unidadesPorCaja) {
    const cant = parseInt(cantidad);
    
    if (cant <= 0) {
        return { valido: false, mensaje: 'Cantidad debe ser mayor a 0' };
    }
    
    switch(modalidad) {
        case 'unidad':
            return { valido: (cant >= 1 && cant <= 2), mensaje: 'Debe ser 1-2 unidades' };
        
        case 'caja':
            if (cant % unidadesPorCaja !== 0) {
                return { 
                    valido: false, 
                    mensaje: `Cantidad debe ser múltiplo de ${unidadesPorCaja}` 
                };
            }
            return { valido: true, mensaje: 'Válido' };
        
        case 'mayor':
            if (unidadesPorCaja <= 3) {
                return { 
                    valido: false, 
                    mensaje: `Venta por mayor no disponible (caja muy pequeña)` 
                };
            }
            if (cant < 3 || cant >= unidadesPorCaja) {
                return { 
                    valido: false, 
                    mensaje: `Debe estar entre 3 y ${unidadesPorCaja - 1} unidades` 
                };
            }
            return { valido: true, mensaje: 'Válido' };
        
        default:
            return { valido: false, mensaje: 'Modalidad no válida' };
    }
}

// CALCULA DESGLOSE (cajas + mayoristas)
function calcularDesglose(cantidad, unidadesPorCaja) {
    const cajas = Math.floor(cantidad / unidadesPorCaja);
    const mayoristas = cantidad % unidadesPorCaja;
    return { cajas, mayoristas };
}

function obtenerTextoDesglose(cantidad, unidadesPorCaja) {
    const { cajas, mayoristas } = calcularDesglose(cantidad, unidadesPorCaja);
    
    let partes = [];
    if (cajas > 0) {
        partes.push(`${cajas} caja${cajas > 1 ? 's' : ''}`);
    }
    if (mayoristas > 0) {
        partes.push(`${mayoristas} unidad${mayoristas > 1 ? 'es' : ''} por mayor`);
    }
    
    return partes.length > 0 ? partes.join(' + ') : 'Sin desglose';
}

// AGREGAR AL CARRITO CON VALIDACIÓN
function agregarAlCarrito(producto, cantidad, modalidad, precioUnitario) {
    const validacion = validarCantidad(cantidad, modalidad, producto.unidades_por_caja);
    
    if (!validacion.valido) {
        alert(validacion.mensaje);
        return false;
    }
    
    // Buscar si producto ya existe con la misma modalidad
    const indexExistente = carrito.findIndex(item => 
        item.producto.id === producto.id && item.modalidad === modalidad
    );
    
    if (indexExistente >= 0) {
        carrito[indexExistente].cantidad += parseInt(cantidad);
        carrito[indexExistente].subtotal = 
            carrito[indexExistente].cantidad * carrito[indexExistente].precio_unitario;
    } else {
        carrito.push({
            producto,
            cantidad: parseInt(cantidad),
            modalidad,
            precio_unitario: parseFloat(precioUnitario),
            subtotal: parseInt(cantidad) * parseFloat(precioUnitario)
        });
    }
    
    renderCarrito();
    return true;
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    renderCarrito();
}

function renderCarrito() {
    const carritoBody = document.getElementById('carritoBody');
    const carritoFooter = document.getElementById('carritoFooter');
    
    if (carrito.length === 0) {
        carritoBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="fas fa-inbox"></i> Carrito vacío</td></tr>';
        carritoFooter.style.display = 'none';
        return;
    }
    
    let html = '';
    carrito.forEach((item, index) => {
        const desglose = item.cantidad > item.producto.unidades_por_caja 
            ? obtenerTextoDesglose(item.cantidad, item.producto.unidades_por_caja)
            : '-';
        
        html += `
            <tr>
                <td class="pl-3"><strong>${item.producto.nombre}</strong></td>
                <td class="text-center">
                    <span class="badge badge-info badge-modalidad">${item.modalidad}</span>
                </td>
                <td class="text-center">${item.cantidad}</td>
                <td class="text-right">Bs. ${item.subtotal.toFixed(2)}</td>
                <td class="text-center pr-3">
                    <button type="button" class="btn btn-sm btn-danger" onclick="eliminarDelCarrito(${index})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    carritoBody.innerHTML = html;
    carritoFooter.style.display = 'block';
    actualizarTotales();
}

function actualizarTotales() {
    const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const descuentoInput = document.getElementById('inputDescuento');
    const descuento = parseFloat(descuentoInput.value) || 0;
    
    // Validar que descuento no sea mayor que subtotal
    let descuentoAplicado = Math.min(descuento, subtotal);
    if (descuentoAplicado !== descuento && descuento > 0) {
        descuentoInput.value = descuentoAplicado.toFixed(2);
    }
    
    const total = subtotal - descuentoAplicado;
    
    const resumenCantItems = document.getElementById('resumenCantItems');
    const resumenSubtotal = document.getElementById('resumenSubtotal');
    const resumenTotal = document.getElementById('resumenTotal');
    const cantidadItems = carrito.length;
    
    resumenCantItems.textContent = cantidadItems;
    resumenSubtotal.textContent = 'Bs. ' + subtotal.toFixed(2);
    resumenTotal.textContent = 'Bs. ' + total.toFixed(2);
}

// BÚSQUEDA AJAX PRODUCTOS
document.getElementById('inputBuscarProducto') && document.getElementById('inputBuscarProducto').addEventListener('input', function(e) {
    const query = this.value.trim();
    
    if (query.length < 2) {
        document.getElementById('resultadosBusqueda').style.display = 'none';
        return;
    }
    
    fetch(URLS.buscarProductos + `?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            const resultados = document.getElementById('resultadosBusqueda');
            resultados.innerHTML = '';
            
            if (!data.productos || data.productos.length === 0) {
                resultados.innerHTML = '<a class="list-group-item text-muted">No hay resultados</a>';
                resultados.style.display = 'block';
                return;
            }
            
            data.productos.forEach(producto => {
                const unidadesPorCaja = producto.unidades_por_caja || 1;
                const stockText = `Stock: ${producto.stock} | Caja: ${unidadesPorCaja} unidad${unidadesPorCaja > 1 ? 'es' : ''}`;
                
                const item = document.createElement('a');
                item.href = '#';
                item.className = 'list-group-item list-group-item-action';
                item.innerHTML = `
                    <div>
                        <strong>${producto.nombre}</strong>
                        <br>
                        <small>${stockText}</small>
                    </div>
                `;
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    seleccionarProducto(producto);
                });
                resultados.appendChild(item);
            });
            
            resultados.style.display = 'block';
        })
        .catch(err => console.error('Error:', err));
});

document.getElementById('btnLimpiarBusqueda') && document.getElementById('btnLimpiarBusqueda').addEventListener('click', function() {
    document.getElementById('inputBuscarProducto').value = '';
    document.getElementById('resultadosBusqueda').style.display = 'none';
});

// SELECCIONAR PRODUCTO Y MOSTRAR INTERFAZ SEGÚN TIPO VENDEDOR
function seleccionarProducto(producto) {
    if (!tipoVendedorActual) {
        alert('Por favor selecciona Tipo de Vendedor primero');
        return;
    }
    
    document.getElementById('modalProductoId').value = producto.id;
    document.getElementById('modalUnidadesPorCaja').value = producto.unidades_por_caja || 1;
    document.getElementById('modalTipoVendedor').value = tipoVendedorActual;
    document.getElementById('modalNombreProducto').textContent = producto.nombre;
    
    // Limpiar búsqueda
    document.getElementById('inputBuscarProducto').value = '';
    document.getElementById('resultadosBusqueda').style.display = 'none';
    
    // Mostrar modal primero
    const modal = $('#modalAgregarProducto');
    modal.modal('show');
    
    // LUEGO configurar la interfaz cuando el modal está visible
    setTimeout(() => {
        if (tipoVendedorActual === 'tienda') {
            mostrarInterfazTienda(producto);
        } else {
            mostrarInterfazDeposito(producto);
        }
    }, 300); // Esperar a que Bootstrap termine de animar
}

// MOSTRAR INTERFAZ PARA TIENDA CON MODALIDADES
function mostrarInterfazTienda(producto) {
    document.getElementById('interfazTienda').style.display = 'block';
    document.getElementById('interfazDeposito').style.display = 'none';
    
    const unidadesPorCaja = producto.unidades_por_caja || 1;
    document.getElementById('textoUnidadesPorCaja').textContent = unidadesPorCaja;
    document.getElementById('textoMayorMax').textContent = (unidadesPorCaja - 1);
    
    // Resetear selección de modalidad
    document.getElementById('modalModalidad').value = '';
    document.getElementById('camposCantidadTienda').innerHTML = '';
    document.getElementById('modalAvisoModalidad').textContent = '';
    document.getElementById('modalDesglose').style.display = 'none';
    
    // Agregar event listeners a las tarjetas de modalidad
    document.querySelectorAll('.modalidad-card').forEach(card => {
        card.style.borderColor = '#dee2e6';
        card.style.backgroundColor = '#fff';
        card.style.cursor = 'pointer';
        
        // Remover todos los listeners anteriores
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
        
        // Agregar nuevo listener
        newCard.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const modalidad = this.getAttribute('data-modalidad');
            console.log('Card clicked, modalidad:', modalidad);
            seleccionarModalidadTienda(modalidad, producto);
        }, false);
    });
}

// SELECCIONAR MODALIDAD EN TIENDA
function seleccionarModalidadTienda(modalidad, producto) {
    const unidadesPorCaja = producto.unidades_por_caja || 1;
    
    document.getElementById('modalModalidad').value = modalidad;
    
    // Actualizar estilos de tarjetas
    document.querySelectorAll('.modalidad-card').forEach(card => {
        const isSelected = card.getAttribute('data-modalidad') === modalidad;
        if (isSelected) {
            card.style.borderColor = '#667eea';
            card.style.backgroundColor = '#f0f4ff';
            card.style.borderWidth = '2px';
        } else {
            card.style.borderColor = '#dee2e6';
            card.style.backgroundColor = '#fff';
            card.style.borderWidth = '1px';
        }
    });
    
    // Generar campos dinámicos según modalidad
    let camposHTML = '';
    
    if (modalidad === 'unidad') {
        camposHTML = `
            <div class="form-group">
                <label for="modalCantidadUnidad" class="label-campo">
                    Cantidad (máx 2 unidades) <span class="text-danger">*</span>
                </label>
                <div class="input-group">
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="decrementarCantidad('modalCantidadUnidad', 1)">−</button>
                    <input type="number" class="form-control text-center" id="modalCantidadUnidad"
                           placeholder="1" min="1" max="2" value="1" required onchange="actualizarValidacionTienda(this, '${modalidad}', ${unidadesPorCaja})">
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="incrementarCantidad('modalCantidadUnidad', 2)">+</button>
                </div>
                <small class="form-text text-muted mt-1">Cantidad válida: 1-2 unidades</small>
            </div>
            
            <div class="form-group">
                <label for="modalPrecioUnitario" class="label-campo">
                    Precio Unitario <span class="text-danger">*</span>
                </label>
                <div class="input-group">
                    <input type="number" class="form-control" id="modalPrecioUnitario"
                           value="${producto.precio_unidad ? producto.precio_unidad.toFixed(2) : ''}" 
                           placeholder="0.00" step="0.01" required>
                    <div class="input-group-append">
                        <span class="input-group-text bg-light">Bs.</span>
                    </div>
                </div>
            </div>
        `;
    } else if (modalidad === 'caja') {
        camposHTML = `
            <div class="form-group">
                <label for="modalCantidadCaja" class="label-campo">
                    Cantidad (múltiplos de ${unidadesPorCaja}) <span class="text-danger">*</span>
                </label>
                <div class="input-group">
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="decrementarCaja('modalCantidadCaja', ${unidadesPorCaja})">−</button>
                    <input type="number" class="form-control text-center" id="modalCantidadCaja"
                           placeholder="${unidadesPorCaja}" min="${unidadesPorCaja}" step="${unidadesPorCaja}" value="${unidadesPorCaja}" required 
                           onchange="actualizarValidacionTienda(this, '${modalidad}', ${unidadesPorCaja})">
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="incrementarCaja('modalCantidadCaja', ${unidadesPorCaja})">+</button>
                </div>
                <small class="form-text text-muted mt-1">Cantidad debe ser múltiplo de ${unidadesPorCaja}</small>
            </div>
            
            <div class="form-group">
                <label for="modalPrecioCaja" class="label-campo">
                    Precio por Caja <span class="text-danger">*</span>
                </label>
                <div class="input-group">
                    <input type="number" class="form-control" id="modalPrecioCaja"
                           value="${producto.precio_caja ? producto.precio_caja.toFixed(2) : ''}" 
                           placeholder="0.00" step="0.01" required>
                    <div class="input-group-append">
                        <span class="input-group-text bg-light">Bs.</span>
                    </div>
                </div>
            </div>
        `;
    } else if (modalidad === 'mayor') {
        camposHTML = `
            <div class="form-group">
                <label for="modalCantidadMayor" class="label-campo">
                    Cantidad (3 a ${unidadesPorCaja - 1} unidades) <span class="text-danger">*</span>
                </label>
                <div class="input-group">
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="decrementarCantidad('modalCantidadMayor', 1)">−</button>
                    <input type="number" class="form-control text-center" id="modalCantidadMayor"
                           placeholder="5" min="3" max="${unidadesPorCaja - 1}" value="3" required 
                           onchange="actualizarValidacionTienda(this, '${modalidad}', ${unidadesPorCaja})">
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="incrementarCantidad('modalCantidadMayor', ${unidadesPorCaja - 1})">+</button>
                </div>
                <small class="form-text text-muted mt-1">Cantidad válida: 3 a ${unidadesPorCaja - 1} unidades</small>
            </div>
            
            <div class="form-group">
                <label for="modalPrecioMayor" class="label-campo">
                    Precio Unitario (Mayor) <span class="text-danger">*</span>
                </label>
                <div class="input-group">
                    <input type="number" class="form-control" id="modalPrecioMayor"
                           value="${producto.precio_mayor ? producto.precio_mayor.toFixed(2) : ''}" 
                           placeholder="0.00" step="0.01" required>
                    <div class="input-group-append">
                        <span class="input-group-text bg-light">Bs.</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    const container = document.getElementById('camposCantidadTienda');
    if (!container) {
        console.error('Container camposCantidadTienda not found!');
        return;
    }
    
    container.innerHTML = camposHTML;
    console.log('HTML inyectado para modalidad:', modalidad);
    console.log('Verifying fields exist:');
    
    if (modalidad === 'unidad') {
        console.log('Buscando: modalCantidadUnidad, modalPrecioUnitario');
        console.log('modalCantidadUnidad existe:', !!document.getElementById('modalCantidadUnidad'));
        console.log('modalPrecioUnitario existe:', !!document.getElementById('modalPrecioUnitario'));
    } else if (modalidad === 'caja') {
        console.log('Buscando: modalCantidadCaja, modalPrecioCaja');
        console.log('modalCantidadCaja existe:', !!document.getElementById('modalCantidadCaja'));
        console.log('modalPrecioCaja existe:', !!document.getElementById('modalPrecioCaja'));
    } else if (modalidad === 'mayor') {
        console.log('Buscando: modalCantidadMayor, modalPrecioMayor');
        console.log('modalCantidadMayor existe:', !!document.getElementById('modalCantidadMayor'));
        console.log('modalPrecioMayor existe:', !!document.getElementById('modalPrecioMayor'));
    }
}

// MOSTRAR INTERFAZ SIMPLIFICADA PARA DEPÓSITO
function mostrarInterfazDeposito(producto) {
    document.getElementById('interfazTienda').style.display = 'none';
    document.getElementById('interfazDeposito').style.display = 'block';
    document.getElementById('modalDesglose').style.display = 'none';
    
    document.getElementById('modalCantidadDeposito').value = '';
    document.getElementById('modalPrecioDepositoUnitario').value = producto.precio_unidad ? producto.precio_unidad.toFixed(2) : '';
}

// FUNCIONES AUXILIARES PARA INCREMENTAR/DECREMENTAR
function incrementarCantidad(inputId, maximo) {
    const input = document.getElementById(inputId);
    let valor = parseInt(input.value) || 0;
    valor = Math.min(valor + 1, maximo);
    input.value = valor;
    input.dispatchEvent(new Event('change'));
}

function decrementarCantidad(inputId, minimo = 1) {
    const input = document.getElementById(inputId);
    let valor = parseInt(input.value) || 0;
    valor = Math.max(valor - 1, minimo);
    input.value = valor;
    input.dispatchEvent(new Event('change'));
}

function incrementarCaja(inputId, unidadesPorCaja) {
    const input = document.getElementById(inputId);
    let valor = parseInt(input.value) || 0;
    valor += unidadesPorCaja;
    input.value = valor;
    input.dispatchEvent(new Event('change'));
}

function decrementarCaja(inputId, unidadesPorCaja) {
    const input = document.getElementById(inputId);
    let valor = parseInt(input.value) || 0;
    valor = Math.max(valor - unidadesPorCaja, unidadesPorCaja);
    input.value = valor;
    input.dispatchEvent(new Event('change'));
}

// ACTUALIZAR VALIDACIÓN EN TIENDA
function actualizarValidacionTienda(inputElement, modalidad, unidadesPorCaja) {
    const cantidad = parseInt(inputElement.value) || 0;
    const validacion = validarCantidad(cantidad, modalidad, unidadesPorCaja);
    const avisoEl = document.getElementById('modalAvisoModalidad');
    const desgloseEl = document.getElementById('modalDesglose');
    
    avisoEl.textContent = validacion.mensaje;
    avisoEl.style.color = validacion.valido ? '#28a745' : '#dc3545';
    
    // Mostrar desglose solo para cantidad mayor
    if (modalidad === 'mayor' && cantidad > 0) {
        const { cajas, mayoristas } = calcularDesglose(cantidad, unidadesPorCaja);
        document.getElementById('modalDesgloseTexto').textContent = 
            `${cajas} caja${cajas > 1 ? 's' : ''} + ${mayoristas} unidad${mayoristas > 1 ? 'es' : ''} por mayor`;
        desgloseEl.style.display = 'block';
    } else if (modalidad === 'caja' && cantidad > 0) {
        const cajas = cantidad / unidadesPorCaja;
        document.getElementById('modalDesgloseTexto').textContent = `${cajas} caja${cajas > 1 ? 's' : ''}`;
        desgloseEl.style.display = 'block';
    } else {
        desgloseEl.style.display = 'none';
    }
}

// GUARDAR VENTA - Manejar Tienda y Depósito
document.addEventListener('DOMContentLoaded', function() {
    // Event listener para formAgregarProducto
    const formAgregarProducto = document.getElementById('formAgregarProducto');
    if (formAgregarProducto) {
        formAgregarProducto.addEventListener('submit', function(e) {
            e.preventDefault();
            
            console.log('Form submitted');
            
            const tipoVendedor = document.getElementById('modalTipoVendedor').value;
            console.log('Tipo vendedor:', tipoVendedor);
            
            const producto = {
                id: parseInt(document.getElementById('modalProductoId').value),
                nombre: document.getElementById('modalNombreProducto').textContent,
                unidades_por_caja: parseInt(document.getElementById('modalUnidadesPorCaja').value)
            };
            
            let cantidad, modalidad, precio;
            
            if (tipoVendedor === 'tienda') {
                // Obtener datos según modalidad seleccionada
                modalidad = document.getElementById('modalModalidad').value;
                console.log('Modalidad seleccionada:', modalidad);
                
                if (!modalidad) {
                    alert('Por favor selecciona una modalidad');
                    return;
                }
                
                if (modalidad === 'unidad') {
                    const cantidadInput = document.getElementById('modalCantidadUnidad');
                    const precioInput = document.getElementById('modalPrecioUnitario');
                    
                    if (!cantidadInput || !precioInput) {
                        alert('Error: campos de unidad no encontrados');
                        return;
                    }
                    
                    cantidad = parseInt(cantidadInput.value);
                    precio = parseFloat(precioInput.value);
                    
                    if (!cantidad || !precio) {
                        alert('Por favor ingresa cantidad y precio');
                        return;
                    }
                } else if (modalidad === 'caja') {
                    const cantidadInput = document.getElementById('modalCantidadCaja');
                    const precioInput = document.getElementById('modalPrecioCaja');
                    
                    if (!cantidadInput || !precioInput) {
                        alert('Error: campos de caja no encontrados');
                        return;
                    }
                    
                    cantidad = parseInt(cantidadInput.value);
                    precio = parseFloat(precioInput.value);
                    
                    if (!cantidad || !precio) {
                        alert('Por favor ingresa cantidad y precio');
                        return;
                    }
                } else if (modalidad === 'mayor') {
                    const cantidadInput = document.getElementById('modalCantidadMayor');
                    const precioInput = document.getElementById('modalPrecioMayor');
                    
                    if (!cantidadInput || !precioInput) {
                        alert('Error: campos de mayor no encontrados');
                        return;
                    }
                    
                    cantidad = parseInt(cantidadInput.value);
                    precio = parseFloat(precioInput.value);
                    
                    if (!cantidad || !precio) {
                        alert('Por favor ingresa cantidad y precio');
                        return;
                    }
                }
            } else if (tipoVendedor === 'deposito') {
                // DEPÓSITO: Solo unidad, sin modalidades
                const cantidadInput = document.getElementById('modalCantidadDeposito');
                const precioInput = document.getElementById('modalPrecioDepositoUnitario');
                
                if (!cantidadInput || !precioInput) {
                    alert('Error: campos de depósito no encontrados');
                    return;
                }
                
                cantidad = parseInt(cantidadInput.value);
                precio = parseFloat(precioInput.value);
                modalidad = 'unidad'; // Por defecto en depósito
                
                if (!cantidad || !precio) {
                    alert('Por favor ingresa cantidad y precio');
                    return;
                }
            } else {
                alert('Por favor selecciona un tipo de vendedor');
                return;
            }
            
            console.log('Datos a agregar:', { producto, cantidad, modalidad, precio });
            
            if (agregarAlCarrito(producto, cantidad, modalidad, precio)) {
                console.log('Producto agregado al carrito');
                $('#modalAgregarProducto').modal('hide');
            }
        });
    }
    
    // Event listener para btnGuardarVenta
    const btnGuardarVenta = document.getElementById('btnGuardarVenta');
    if (btnGuardarVenta) {
        btnGuardarVenta.addEventListener('click', function() {
            if (carrito.length === 0) {
                alert('El carrito está vacío');
                return;
            }
            
            const cliente = document.getElementById('inputCliente').value.trim();
            if (!cliente) {
                alert('Ingresa el nombre del cliente');
                return;
            }
            
            const descuentoValue = parseFloat(document.getElementById('inputDescuento').value) || 0;
            const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
            const descuentoAplicado = Math.min(descuentoValue, subtotal);
            
            const datosVenta = {
                cliente,
                telefono: document.getElementById('inputTelefono').value.trim(),
                razon_social: document.getElementById('inputRazonSocial').value.trim(),
                direccion: document.getElementById('inputDireccion').value.trim(),
                tipo_pago: 'contado',  // Siempre es contado para tienda
                tipo_venta: tipoVendedorActual,
                descuento: descuentoAplicado,
                items: carrito.map(item => ({
                    producto_id: item.producto.id,
                    cantidad: item.cantidad,
                    modalidad: item.modalidad,
                    precio_unitario: item.precio_unitario
                }))
            };
            
            fetch(URLS.guardarVentaTienda, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosVenta)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(`Venta ${data.venta_codigo} guardada exitosamente`);
                    window.location.href = data.redireccionar_a;
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(err => {
                console.error(err);
                alert('Error al guardar la venta: ' + err);
            });
        });
    }
    
    // Event listener para btnLimpiarCarrito
    const btnLimpiarCarrito = document.getElementById('btnLimpiarCarrito');
    if (btnLimpiarCarrito) {
        btnLimpiarCarrito.addEventListener('click', function() {
            Swal.fire({
                title: '¿Limpiar carrito?',
                text: 'Se eliminarán todos los productos agregados',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sí, limpiar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    carrito = [];
                    renderCarrito();
                }
            });
        });
    }
    
    // Event listener para inputDescuento
    const inputDescuento = document.getElementById('inputDescuento');
    if (inputDescuento) {
        inputDescuento.addEventListener('input', function() {
            actualizarTotales();
        });
    }
    
    // Event listener para selectTipoVendedor
    const selectTipoVendedor = document.getElementById('selectTipoVendedor');
    if (selectTipoVendedor) {
        selectTipoVendedor.addEventListener('change', function() {
            const tipo = this.value;
            
            if (tipo === 'tienda') {
                tipoVendedorActual = 'tienda';
                carrito = [];
                renderCarrito();
            } else if (tipo === 'deposito') {
                tipoVendedorActual = 'deposito';
                carrito = [];
                renderCarrito();
            } else {
                tipoVendedorActual = null;
            }
        });
    }
});