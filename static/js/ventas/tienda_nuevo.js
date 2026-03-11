// CARRITO EN MEMORIA
let carrito = [];
let tipoVendedorActual = null;
let productosActuales = {}; // Almacenar productos para obtener precios correctos

// Funciones auxiliares
function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
           document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';
}

// Validar que teléfono solo acepte números
function validarTelefono(input) {
    input.addEventListener('keypress', function(e) {
        if (!/[0-9]/.test(e.key)) {
            e.preventDefault();
        }
    });
    input.addEventListener('paste', function(e) {
        const text = e.clipboardData.getData('text');
        if (!/^[0-9]*$/.test(text)) {
            e.preventDefault();
        }
    });
}

function validarCantidad(cantidad, modalidad, unidadesPorCaja, tipoVendedor) {
    const cant = parseInt(cantidad);
    
    // Para depósito: permitir cualquier cantidad >= 1 sin restricciones
    if (tipoVendedor === 'deposito') {
        if (cant < 1) {
            return { valido: false, mensaje: 'Cantidad debe ser al menos 1' };
        }
        return { valido: true, mensaje: 'Válido' };
    }
    
    // Para tienda: validar según modalidad
    switch(modalidad) {
        case 'unidad':
            return { valido: (cant >= 1 && cant <= 2), mensaje: 'Modalidad Unidad: debe ser 1-2 unidades' };
        
        case 'caja':
            if (cant < 0) {
                return { valido: false, mensaje: 'Cantidad no puede ser negativa' };
            }
            return { valido: true, mensaje: 'Válido' };
        
        case 'mayor':
            if (cant < 3 || cant >= unidadesPorCaja) {
                return { valido: false, mensaje: `Modalidad Mayor: debe ser entre 3 y ${unidadesPorCaja - 1} unidades` };
            }
            return { valido: true, mensaje: 'Válido' };
        
        default:
            return { valido: false, mensaje: 'Modalidad no válida' };
    }
}

function agregarAlCarrito(producto, cantidad, modalidad, precioUnitario) {
    const validacion = validarCantidad(cantidad, modalidad, producto.unidades_por_caja, tipoVendedorActual);
    
    if (!validacion.valido) {
        alert(validacion.mensaje);
        return false;
    }
    
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
        carritoBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4"><i class="fas fa-inbox"></i> Carrito vacío</td></tr>';
        carritoFooter.style.display = 'none';
        return;
    }
    
    let html = '';
    carrito.forEach((item, index) => {
        const precioUnitario = parseFloat(item.precio_unitario);
        const cantidad = parseInt(item.cantidad);
        const subtotal = precioUnitario * cantidad;
        
        html += `
            <tr>
                <td class="pl-3"><strong>${item.producto.nombre}</strong></td>
                <td class="text-center">
                    <span class="badge badge-info">${item.modalidad.charAt(0).toUpperCase() + item.modalidad.slice(1)}</span>
                </td>
                <td class="text-center" title="${item.modalidad === 'caja' ? 'Precio de caja' : 'Precio por unidad'}">
                    <strong>Bs. ${precioUnitario.toFixed(2)}</strong>
                </td>
                <td class="text-center">${cantidad}</td>
                <td class="text-right">
                    <small class="text-muted">Bs. ${precioUnitario.toFixed(2)} × ${cantidad} = </small>
                    <br>
                    <strong>Bs. ${subtotal.toFixed(2)}</strong>
                </td>
                <td class="text-center pr-3">
                    <button type="button" class="btn btn-sm btn-danger" onclick="eliminarDelCarrito(${index})">
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
    
    let descuentoAplicado = Math.min(descuento, subtotal);
    if (descuentoAplicado !== descuento && descuento > 0) {
        descuentoInput.value = descuentoAplicado.toFixed(2);
    }
    
    const total = subtotal - descuentoAplicado;
    
    document.getElementById('resumenCantItems').textContent = carrito.length;
    document.getElementById('resumenSubtotal').textContent = 'Bs. ' + subtotal.toFixed(2);
    document.getElementById('resumenTotal').textContent = 'Bs. ' + total.toFixed(2);
}

// BÚSQUEDA DE PRODUCTOS CON OPCIONES INLINE
document.addEventListener('DOMContentLoaded', function() {
    
    // Validar teléfono
    const inputTelefono = document.getElementById('inputTelefono');
    if (inputTelefono) {
        validarTelefono(inputTelefono);
    }
    
    // Selector Tipo Vendedor
    const selectTipoVendedor = document.getElementById('selectTipoVendedor');
    if (selectTipoVendedor) {
        // INICIALIZAR con el valor actual del selector (importante!)
        const valorInicial = selectTipoVendedor.value;
        
        if (valorInicial === 'tienda') {
            tipoVendedorActual = 'tienda';
        } else if (valorInicial === 'deposito') {
            tipoVendedorActual = 'deposito';
        } else {
            tipoVendedorActual = null;
        }
        
        // Listener para cambios posteriores
        selectTipoVendedor.addEventListener('change', function() {
            const tipo = this.value;
            if (tipo === 'tienda') {
                tipoVendedorActual = 'tienda';
            } else if (tipo === 'deposito') {
                tipoVendedorActual = 'deposito';
            } else {
                tipoVendedorActual = null;
            }
            carrito = [];
            renderCarrito();
        });
    }
    
    // Búsqueda de productos
    const inputBuscar = document.getElementById('inputBuscarProducto');
    if (inputBuscar) {
        inputBuscar.addEventListener('input', function(e) {
            const query = this.value.trim();
            
            if (query.length < 2) {
                document.getElementById('resultadosBusqueda').style.display = 'none';
                return;
            }
            
            if (!tipoVendedorActual) {
                document.getElementById('resultadosBusqueda').innerHTML = 
                    '<div class="alert alert-warning mb-0">Selecciona Tipo de Vendedor primero</div>';
                document.getElementById('resultadosBusqueda').style.display = 'block';
                return;
            }
            
            const url = URLS.buscarProductos + `?q=${encodeURIComponent(query)}&tipo_venta=${encodeURIComponent(tipoVendedorActual || '')}`;
            
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    const resultados = document.getElementById('resultadosBusqueda');
                    resultados.innerHTML = '';
                    
                    // Almacenar productos actuales para acceso en funciones
                    productosActuales = {};
                    if (data.productos) {
                        data.productos.forEach(p => {
                            productosActuales[p.id] = p;
                        });
                    }
                    
                    if (!data.productos || data.productos.length === 0) {
                        resultados.innerHTML = '<div class="alert alert-info mb-0">No hay resultados</div>';
                        resultados.style.display = 'block';
                        return;
                    }
                    
                    data.productos.forEach(producto => {
                        const unidadesPorCaja = producto.unidades_por_caja || 1;
                        const stockText = `Stock: ${producto.stock} | Caja: ${unidadesPorCaja} unidad${unidadesPorCaja > 1 ? 'es' : ''}`;
                        
                        const productoId = `producto_${producto.id}`;
                        
                        let html = `
                            <div class="card mb-3 p-3" style="border-left: 4px solid #667eea;">
                                <!-- Fila 1: Nombre y Stock -->
                                <div class="row mb-2">
                                    <div class="col-12">
                                        <strong style="font-size: 1.1rem;">${producto.nombre}</strong>
                                        <br>
                                        <small class="text-muted">${stockText}</small>
                                    </div>
                                </div>
                                
                                <!-- Fila 2: Opciones de venta -->
                                <div class="row align-items-end">
                        `;
                        
                        // Interfaz según tipo de vendedor
                        if (tipoVendedorActual === 'tienda') {
                            html += `
                                    <!-- Modalidades TIENDA -->
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
                                    
                                    <!-- Cantidad -->
                                    <div class="col-md-3">
                                        <label for="cantidad_${producto.id}" style="font-size: 0.85rem; font-weight: bold; color: #666;">Cantidad:</label>
                                        <input type="number" class="form-control form-control-sm" id="cantidad_${producto.id}" placeholder="Ej: 10" min="0" value="0" style="border: 1px solid #ddd;">
                                    </div>
                                    
                                    <!-- Botón -->
                                    <div class="col-md-4">
                                        <button type="button" class="btn btn-primary btn-sm" onclick="agregarDesdeResultados(${producto.id}, '${producto.nombre}', ${producto.unidades_por_caja || 1})" style="width: 100%;">
                                            <i class="fas fa-plus"></i> Agregar al Carrito
                                        </button>
                                    </div>
                            `;
                        } else {
                            // DEPÓSITO - sin modalidades
                            html += `
                                    <!-- Cantidad (Depósito) -->
                                    <div class="col-md-3">
                                        <label for="cantidad_${producto.id}" style="font-size: 0.85rem; font-weight: bold; color: #666;">Cantidad:</label>
                                        <input type="number" class="form-control form-control-sm" id="cantidad_${producto.id}" placeholder="Ej: 100" min="0" value="0" style="border: 1px solid #ddd;">
                                    </div>
                                    
                                    <!-- Botón (Depósito) -->
                                    <div class="col-md-9">
                                        <button type="button" class="btn btn-primary btn-sm" onclick="agregarDesdeResultadosDeposito(${producto.id}, '${producto.nombre}')" style="width: 100%;">
                                            <i class="fas fa-plus"></i> Agregar al Carrito
                                        </button>
                                    </div>
                            `;
                        }
                        
                        html += `
                                </div>
                            </div>
                        `;
                        
                        resultados.innerHTML += html;
                    });
                    
                    resultados.style.display = 'block';
                })
                .catch(err => console.error('Error:', err));
        });
    }
    
    // Descuento
    const inputDescuento = document.getElementById('inputDescuento');
    if (inputDescuento) {
        inputDescuento.addEventListener('input', function() {
            actualizarTotales();
        });
    }
    
    // Guardar venta
    const btnGuardar = document.getElementById('btnGuardarVenta');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', function() {
            if (carrito.length === 0) {
                Swal.fire('Advertencia', 'El carrito está vacío', 'warning');
                return;
            }
            
            const cliente = document.getElementById('inputCliente').value.trim();
            if (!cliente) {
                Swal.fire('Advertencia', 'Ingresa el nombre del cliente', 'warning');
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
                tipo_pago: 'contado',
                tipo_venta: tipoVendedorActual,
                descuento: descuentoAplicado,
                items: carrito.map(item => ({
                    producto_id: item.producto.id,
                    cantidad: item.cantidad,
                    modalidad: item.modalidad,
                    precio_unitario: item.precio_unitario
                }))
            };
            
            // Deshabilitar botón mientras se procesa
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...';
            
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
                    Swal.fire({
                        icon: 'success',
                        title: 'Venta Registrada',
                        html: `<p>Código: <strong>${data.venta_codigo}</strong></p>`,
                        confirmButtonColor: '#28a745',
                        confirmButtonText: 'Ver Venta',
                    }).then(() => {
                        window.location.href = data.redireccionar_a;
                    });
                } else {
                    Swal.fire('Error', data.error || 'Error desconocido', 'error');
                    btnGuardar.disabled = false;
                    btnGuardar.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Registrar Venta';
                }
            })
            .catch(err => {
                Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Registrar Venta';
            });
        });
    }
    
    // Limpiar carrito
    const btnLimpiar = document.getElementById('btnLimpiarCarrito');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', function() {
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
});

// Función para agregar desde resultados (TIENDA)
function agregarDesdeResultados(productoId, productoNombre, unidadesPorCaja) {
    const cantidad = parseInt(document.getElementById(`cantidad_${productoId}`).value) || 0;
    const modalidad = document.querySelector(`input[name="modalidad_${productoId}"]:checked`).value;
    
    // Validar cantidad según modalidad
    if (cantidad === 0) {
        alert('Ingresa una cantidad mayor a 0');
        return;
    }
    
    // Obtener producto con precios
    const productoData = productosActuales[productoId];
    if (!productoData) {
        alert('Producto no encontrado');
        return;
    }
    
    // Determinar precio según modalidad
    let precioUnitario = 0;
    switch(modalidad) {
        case 'unidad':
            precioUnitario = parseFloat(productoData.precio_unidad) || 0;
            break;
        case 'caja':
            // Si no tiene precio_caja definido, usar precio_unidad como fallback
            precioUnitario = parseFloat(productoData.precio_caja) || parseFloat(productoData.precio_unidad) || 0;
            break;
        case 'mayor':
            // Si no tiene precio_mayor definido, usar precio_unidad como fallback
            precioUnitario = parseFloat(productoData.precio_mayor) || parseFloat(productoData.precio_unidad) || 0;
            break;
    }
    
    // Validar que el precio sea mayor a 0
    if (!precioUnitario || precioUnitario <= 0) {
        alert(`Error: El producto "${productoData.nombre}" no tiene precio unitario configurado en la base de datos.`);
        return;
    }
    
    const producto = {
        id: productoId,
        nombre: productoNombre,
        unidades_por_caja: unidadesPorCaja
    };
    
    if (agregarAlCarrito(producto, cantidad, modalidad, precioUnitario)) {
        // Limpiar cantidad
        document.getElementById(`cantidad_${productoId}`).value = 0;
    }
}

// Función para agregar desde resultados (DEPÓSITO)
function agregarDesdeResultadosDeposito(productoId, productoNombre) {
    const cantidad = parseInt(document.getElementById(`cantidad_${productoId}`).value) || 0;
    
    // Validar cantidad
    if (cantidad === 0) {
        alert('Ingresa una cantidad mayor a 0');
        return;
    }
    
    // Obtener producto con precio
    const productoData = productosActuales[productoId];
    if (!productoData) {
        alert('Producto no encontrado');
        return;
    }
    
    const precioUnitario = parseFloat(productoData.precio_unidad) || 0;
    
    // Validar que el precio sea mayor a 0
    if (!precioUnitario || precioUnitario <= 0) {
        alert(`Error: El producto "${productoData.nombre}" no tiene precio unitario configurado en la base de datos.`);
        return;
    }
    
    const producto = {
        id: productoId,
        nombre: productoNombre,
        unidades_por_caja: 1
    };
    
    if (agregarAlCarrito(producto, cantidad, 'unidad', precioUnitario)) {
        // Limpiar cantidad
        document.getElementById(`cantidad_${productoId}`).value = 0;
    }
}
