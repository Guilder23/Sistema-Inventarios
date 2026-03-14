/**
 * modal_detalle.js - Lógica para el modal de detalle de venta
 * Muestra información completa de una venta específica
 */

/**
 * Función para abrir el modal y cargar los detalles de la venta
 */
function verDetalleVenta(ventaId) {
    const boton = document.querySelector(`button[data-venta-id="${ventaId}"]`);
    
    if (!boton) {
        console.error('No se encontró el botón con la información de la venta');
        return;
    }
    
    // Obtener datos del botón
    const codigo = boton.dataset.codigo;
    const cliente = boton.dataset.cliente;
    const telefono = boton.dataset.telefono;
    const razonSocial = boton.dataset.razonSocial;
    const direccion = boton.dataset.direccion;
    const vendedor = boton.dataset.vendedor;
    const ubicacion = boton.dataset.ubicacion;
    const ubicacionTipo = boton.dataset.ubicacionTipo;
    const fecha = boton.dataset.fecha;
    const tipoPago = boton.dataset.tipoPago;
    const estado = boton.dataset.estado;
    const moneda = boton.dataset.moneda;
    const tipoCambio = boton.dataset.tipoCambio;
    const subtotal = boton.dataset.subtotal;
    const descuento = boton.dataset.descuento;
    const total = boton.dataset.total;
    
    // Rellenar campos básicos
    document.getElementById('detalleCodigoVenta').textContent = codigo;
    document.getElementById('detalleCliente').textContent = cliente;
    document.getElementById('detalleTelefono').textContent = telefono;
    document.getElementById('detalleRazonSocial').textContent = razonSocial;
    document.getElementById('detalleDireccion').textContent = direccion;
    document.getElementById('detalleVendedor').textContent = vendedor;
    document.getElementById('detalleFecha').textContent = fecha;
    document.getElementById('detalleTipoPago').textContent = tipoPago;
    document.getElementById('detalleMoneda').textContent = moneda;
    document.getElementById('detalleTipoCambio').textContent = parseFloat(tipoCambio).toFixed(4);
    
    // Ubicación con icono
    let ubicacionHtml = '';
    if (ubicacionTipo === 'almacen') {
        ubicacionHtml = `<i class="fas fa-warehouse text-info"></i> ${ubicacion}`;
    } else if (ubicacionTipo === 'tienda') {
        ubicacionHtml = `<i class="fas fa-store text-success"></i> ${ubicacion}`;
    } else if (ubicacionTipo === 'tienda_online') {
        ubicacionHtml = `<i class="fas fa-globe text-primary"></i> ${ubicacion}`;
    } else {
        ubicacionHtml = `<i class="fas fa-box text-secondary"></i> ${ubicacion}`;
    }
    document.getElementById('detalleUbicacion').innerHTML = ubicacionHtml;
    
    // Estado con badge
    const estadoContainer = document.getElementById('detalleEstadoVenta');
    let badgeClass = 'estado-venta-completada';
    let estadoTexto = estado;
    
    if (estado.toLowerCase().includes('pendiente')) {
        badgeClass = 'estado-venta-pendiente';
    } else if (estado.toLowerCase().includes('cancelada')) {
        badgeClass = 'estado-venta-cancelada';
    } else if (estado.toLowerCase().includes('anulada')) {
        badgeClass = 'estado-venta-anulada';
    }
    
    estadoContainer.innerHTML = `<span class="${badgeClass}">${estadoTexto}</span>`;
    
    // Montos
    const simboloMoneda = moneda === 'BOB' ? 'Bs.' : '$us';
    document.getElementById('detalleSubtotal').textContent = `${simboloMoneda} ${parseFloat(subtotal).toFixed(2)}`;
    document.getElementById('detalleDescuento').textContent = `${simboloMoneda} ${parseFloat(descuento).toFixed(2)}`;
    document.getElementById('detalleTotal').textContent = `${simboloMoneda} ${parseFloat(total).toFixed(2)}`;
    
    // Mostrar loading de productos
    document.getElementById('loadingProductos').style.display = 'block';
    document.getElementById('tablaProductosDetalle').style.display = 'none';
    document.getElementById('productosDetalleBody').innerHTML = '';
    
    // Abrir modal
    $('#modalDetalleVenta').modal('show');
    
    // Cargar productos vía AJAX
    cargarProductosVenta(ventaId, simboloMoneda);
}

/**
 * Cargar productos de la venta vía AJAX
 */
function cargarProductosVenta(ventaId, simboloMoneda) {
    fetch(`/ventas/api/venta/${ventaId}/detalle/`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cargar los detalles de la venta');
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.data && data.data.detalles && data.data.detalles.length > 0) {
                mostrarProductos(data.data.detalles, simboloMoneda);
            } else {
                mostrarMensajeVacio();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarMensajeError();
        });
}

/**
 * Mostrar productos en la tabla
 */
function mostrarProductos(productos, simboloMoneda) {
    const tbody = document.getElementById('productosDetalleBody');
    tbody.innerHTML = '';
    
    productos.forEach((producto, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <span class="producto-codigo">${producto.codigo || '-'}</span>
            </td>
            <td>
                <span class="producto-nombre">${producto.producto}</span>
            </td>
            <td class="text-center">
                <span class="producto-cantidad">${producto.cantidad}</span>
            </td>
            <td class="text-right">
                ${simboloMoneda} ${parseFloat(producto.precio_unitario).toFixed(2)}
            </td>
            <td class="text-right">
                <strong>${simboloMoneda} ${parseFloat(producto.subtotal).toFixed(2)}</strong>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Ocultar loading y mostrar tabla
    document.getElementById('loadingProductos').style.display = 'none';
    document.getElementById('tablaProductosDetalle').style.display = 'table';
}

/**
 * Mostrar mensaje cuando no hay productos
 */
function mostrarMensajeVacio() {
    const tbody = document.getElementById('productosDetalleBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center text-muted py-4">
                <i class="fas fa-box-open fa-2x mb-2"></i>
                <p>No hay productos en esta venta</p>
            </td>
        </tr>
    `;
    
    document.getElementById('loadingProductos').style.display = 'none';
    document.getElementById('tablaProductosDetalle').style.display = 'table';
}

/**
 * Mostrar mensaje de error
 */
function mostrarMensajeError() {
    const tbody = document.getElementById('productosDetalleBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center text-danger py-4">
                <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                <p>Error al cargar los productos</p>
            </td>
        </tr>
    `;
    
    document.getElementById('loadingProductos').style.display = 'none';
    document.getElementById('tablaProductosDetalle').style.display = 'table';
}

/**
 * Función para imprimir el detalle de la venta
 */
function imprimirDetalle() {
    window.print();
}

/**
 * Limpiar modal al cerrar
 */
document.addEventListener('DOMContentLoaded', function() {
    $('#modalDetalleVenta').on('hidden.bs.modal', function() {
        // Restaurar estados
        document.getElementById('loadingProductos').style.display = 'block';
        document.getElementById('tablaProductosDetalle').style.display = 'none';
        document.getElementById('productosDetalleBody').innerHTML = '';
        
        // Limpiar campos
        document.getElementById('detalleCodigoVenta').textContent = '-';
        document.getElementById('detalleCliente').textContent = '-';
        document.getElementById('detalleTelefono').textContent = '-';
        document.getElementById('detalleRazonSocial').textContent = '-';
        document.getElementById('detalleDireccion').textContent = '-';
        document.getElementById('detalleVendedor').textContent = '-';
        document.getElementById('detalleUbicacion').textContent = '-';
        document.getElementById('detalleFecha').textContent = '-';
        document.getElementById('detalleTipoPago').textContent = '-';
        document.getElementById('detalleMoneda').textContent = '-';
        document.getElementById('detalleTipoCambio').textContent = '-';
        document.getElementById('detalleSubtotal').textContent = '-';
        document.getElementById('detalleDescuento').textContent = '-';
        document.getElementById('detalleTotal').textContent = '-';
        document.getElementById('detalleEstadoVenta').innerHTML = '';
    });
});
