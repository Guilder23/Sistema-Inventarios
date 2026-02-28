// CARRITO EN MEMORIA
let carrito = [];
let modalidadSeleccionada = 'tienda'; // Siempre tienda en esta vista

// VALIDADORES POR MODALIDAD
function validarCantidad(cantidad, modalidad, unidadesPorCaja) {
    const cant = parseInt(cantidad);
    
    if (cant <= 0) {
        return { valido: false, mensaje: 'Cantidad debe ser mayor a 0' };
    }
    
    switch(modalidad) {
        case 'unidad':
            return { valido: cant >= 1, mensaje: 'Mínimo 1 unidad' };
        
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

// FUNCIONES CARRITO
function seleccionarModalidad(tipo) {
    modalidadSeleccionada = tipo;
    carrito = [];
    
    document.getElementById('selectorModalidad').style.display = 'none';
    document.getElementById('titulo').textContent = 
        tipo === 'deposito' ? 'Nueva Venta Depósito' : 'Nueva Venta Tienda';
    
    renderCarrito();
}

function agregarAlCarrito(producto, cantidad, modalidad, precioUnitario) {
    const validacion = validarCantidad(cantidad, modalidad, producto.unidades_por_caja);
    
    if (!validacion.valido) {
        alert(validacion.mensaje);
        return false;
    }
    
    // Buscar si producto ya existe
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
                <td class="text-right">Bs. ${item.precio_unitario.toFixed(2)}</td>
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
    const resumenCantItems = document.getElementById('resumenCantItems');
    const resumenSubtotal = document.getElementById('resumenSubtotal');
    const resumenTotal = document.getElementById('resumenTotal');
    const cantidadItems = carrito.length;
    
    resumenCantItems.textContent = cantidadItems;
    resumenSubtotal.textContent = 'Bs. ' + subtotal.toFixed(2);
    resumenTotal.textContent = 'Bs. ' + subtotal.toFixed(2);
}

// BÚSQUEDA AJAX PRODUCTOS
document.getElementById('inputBuscarProducto').addEventListener('input', function(e) {
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
                const item = document.createElement('a');
                item.href = '#';
                item.className = 'list-group-item list-group-item-action';
                item.innerHTML = `
                    <div>
                        <strong>${producto.nombre}</strong>
                        <br>
                        <small>Stock: ${producto.stock} | Caja: ${producto.unidades_por_caja} unid</small>
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

document.getElementById('btnLimpiarBusqueda').addEventListener('click', function() {
    document.getElementById('buscarProducto').value = '';
    document.getElementById('resultadosBusqueda').style.display = 'none';
});

function seleccionarProducto(producto) {
    document.getElementById('modalProductoId').value = producto.id;
    document.getElementById('modalUnidadesPorCaja').value = producto.unidades_por_caja;
    document.getElementById('modalNombreProducto').textContent = producto.nombre;
    document.getElementById('modalCantidad').value = '';
    document.getElementById('modalCantidad').focus();
    
    // Mostrar opciones de modalidad (tienda tiene acceso a todas)
    const modalidadSelect = document.getElementById('modalModalidad');
    modalidadSelect.innerHTML = `
        <option value="">-- Selecciona modalidad --</option>
        <option value="unidad">Unidad (1-2 productos)</option>
        <option value="caja">Caja (múltiplos de unidades/caja)</option>
        <option value="mayor">Mayor (3 a ${producto.unidades_por_caja - 1} unidades)</option>
    `;
    
    // Actualizar precio según modalidad
    actualizarPrecio(producto);
    
    $('#modalAgregarProducto').modal('show');
    document.getElementById('inputBuscarProducto').value = '';
    document.getElementById('resultadosBusqueda').style.display = 'none';
}

function actualizarPrecio(producto) {
    const modalidad = document.getElementById('modalModalidad').value;
    
    let precio = 0;
    if (modalidad === 'unidad') {
        precio = producto.precio_unidad;
    } else if (modalidad === 'caja') {
        precio = producto.precio_caja;
    } else if (modalidad === 'mayor') {
        precio = producto.precio_mayor;
    } else {
        precio = producto.precio_unidad;
    }
    
    document.getElementById('modalPrecioUnitario').value = precio.toFixed(2);
}

document.getElementById('modalModalidad').addEventListener('change', function() {
    const productoId = document.getElementById('modalProductoId').value;
    if (productoId) {
        // Buscar producto en carrito o en búsqueda anterior
        fetch(URLS.buscarProductos + `?id=${productoId}`)
            .then(response => response.json())
            .then(data => {
                if (data.productos && data.productos.length > 0) {
                    const producto = data.productos[0];
                    actualizarPrecio(producto);
                    
                    // Mostrar validación de cantidad
                    const cantidad = parseInt(document.getElementById('modalCantidad').value) || 0;
                    mostrarValidacionCantidad(cantidad, this.value, producto.unidades_por_caja);
                }
            });
    }
});

document.getElementById('modalCantidad').addEventListener('input', function() {
    const modalidad = document.getElementById('modalModalidad').value;
    const unidadesPorCaja = parseInt(document.getElementById('modalUnidadesPorCaja').value);
    
    mostrarValidacionCantidad(parseInt(this.value) || 0, modalidad, unidadesPorCaja);
});

function mostrarValidacionCantidad(cantidad, modalidad, unidadesPorCaja) {
    const validacion = validarCantidad(cantidad, modalidad, unidadesPorCaja);
    const avisoEl = document.getElementById('modalAvisoModalidad');
    const desgloseEl = document.getElementById('modalDesglose');
    
    avisoEl.textContent = validacion.mensaje;
    avisoEl.style.color = validacion.valido ? '#28a745' : '#dc3545';
    
    if (cantidad > 0 && cantidad > unidadesPorCaja && modalidad === 'mayor') {
        const { cajas, mayoristas } = calcularDesglose(cantidad, unidadesPorCaja);
        document.getElementById('modalDesgloseTexto').textContent = `${cajas} caja(s) + ${mayoristas} unidades mayoristas`;
        desgloseEl.style.display = 'block';
    } else if (cantidad > 0 && modalidad === 'caja') {
        const cajas = cantidad / unidadesPorCaja;
        document.getElementById('modalDesgloseTexto').textContent = `${cajas} caja(s)`;
        desgloseEl.style.display = 'block';
    } else {
        desgloseEl.style.display = 'none';
    }
}

// GUARDAR VENTA
document.getElementById('formAgregarProducto').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const producto = {
        id: parseInt(document.getElementById('modalProductoId').value),
        nombre: document.getElementById('modalNombreProducto').textContent,
        unidades_por_caja: parseInt(document.getElementById('modalUnidadesPorCaja').value)
    };
    
    const cantidad = parseInt(document.getElementById('modalCantidad').value);
    const modalidad = document.getElementById('modalModalidad').value;
    const precio = parseFloat(document.getElementById('modalPrecioUnitario').value);
    
    if (agregarAlCarrito(producto, cantidad, modalidad, precio)) {
        $('#modalAgregarProducto').modal('hide');
    }
});

document.getElementById('btnGuardarVenta').addEventListener('click', function() {
    if (carrito.length === 0) {
        alert('El carrito está vacío');
        return;
    }
    
    const cliente = document.getElementById('inputCliente').value.trim();
    if (!cliente) {
        alert('Ingresa el nombre del cliente');
        return;
    }
    
    const datosVenta = {
        cliente,
        telefono: document.getElementById('inputTelefono').value.trim(),
        razon_social: document.getElementById('inputRazonSocial').value.trim(),
        direccion: document.getElementById('inputDireccion').value.trim(),
        tipo_pago: 'contado',  // Siempre es contado para tienda
        descuento: 0,  // Descuento comentado para v2
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

document.getElementById('btnLimpiarCarrito').addEventListener('click', function() {
    if (confirm('¿Limpiar carrito?')) {
        carrito = [];
        renderCarrito();
    }
});

// FUNCIONES AUXILIARES
function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
           document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';
}

// Mostrar selector de modalidad al cargar
document.addEventListener('DOMContentLoaded', function() {
    if (typeof esTienda !== 'undefined' && esTienda) {
        document.getElementById('selectorModalidad').style.display = 'block';
    } else {
        seleccionarModalidad('tienda');
    }
});