(function() {
    'use strict';

    window.inicializarModalCrearPedido = function() {
        const form = document.getElementById('formCrearPedido');
        const buscarProducto = document.getElementById('buscarProductoPedido');
        const listaProductos = document.getElementById('listaProductosPedido');
        const tablaBody = document.querySelector('#tablaItemsPedido tbody');
        const filaVacia = document.getElementById('filaVaciaPedido');

        const productosDisponibles = Array.from(document.querySelectorAll('#pedidoProductoSelect option'))
            .map(option => ({
                id: option.value,
                codigo: option.dataset.codigo || '',
                nombre: option.dataset.nombre || '',
                stock: parseInt(option.dataset.stock || '0', 10),
                unidades: parseInt(option.dataset.unidades || '1', 10)
            }));

        if (!form || !buscarProducto || !listaProductos || !tablaBody) {
            return;
        }

        function renderListaProductosPedido(productos) {
            if (!listaProductos) return;
            if (!productos.length) {
                listaProductos.innerHTML = '<div class="text-center p-4 text-muted">No se encontraron productos</div>';
                return;
            }

            listaProductos.innerHTML = productos.map(producto => {
                return `
                    <div class="producto-item d-flex justify-content-between align-items-center border-bottom py-2">
                        <div>
                            <div class="text-muted" style="font-size: 0.85rem;">${producto.codigo}</div>
                            <strong>${producto.nombre}</strong>
                            <div class="text-muted" style="font-size: 0.85rem;">Stock: ${producto.stock} | Unidades x Caja: ${producto.unidades}</div>
                        </div>
                        <div class="d-flex align-items-center" style="gap: 8px;">
                            <input
                                type="number"
                                class="form-control form-control-sm"
                                style="width: 90px;"
                                min="1"
                                max="${producto.stock}"
                                value="1"
                                id="pedidoCantidad-${producto.id}"
                            >
                            <button type="button" class="btn btn-sm btn-primary btn-agregar-pedido" data-producto-id="${producto.id}">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            listaProductos.querySelectorAll('.btn-agregar-pedido').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.dataset.productoId;
                    const input = document.getElementById(`pedidoCantidad-${id}`);
                    const cantidad = parseInt(input ? input.value || '0' : '0', 10);
                    const producto = productosDisponibles.find(p => p.id === id);
                    if (!producto) {
                        alert('Producto no encontrado');
                        return;
                    }
                    agregarProductoPedido(producto, cantidad);
                });
            });
        }

        function agregarProductoPedido(producto, cantidad) {
            if (!producto) return;
            if (cantidad <= 0) {
                alert('La cantidad debe ser mayor a 0');
                return;
            }
            if (cantidad > producto.stock) {
                alert(`La cantidad supera el stock disponible (${producto.stock})`);
                return;
            }
            if (tablaBody.querySelector(`tr[data-producto-id="${producto.id}"]`)) {
                alert('Ese producto ya está agregado.');
                return;
            }

            if (filaVacia) {
                filaVacia.remove();
            }

            const tr = document.createElement('tr');
            tr.dataset.productoId = producto.id;
            tr.innerHTML = `
                <td>${producto.codigo}</td>
                <td>${producto.nombre}</td>
                <td>${producto.stock}</td>
                <td>${producto.unidades}</td>
                <td>${cantidad}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-item">Quitar</button>
                    <input type="hidden" name="producto_id" value="${producto.id}">
                    <input type="hidden" name="cantidad" value="${cantidad}">
                </td>
            `;
            tablaBody.appendChild(tr);
        }

        function actualizarFilaVacia() {
            if (!tablaBody.querySelector('tr')) {
                const empty = document.createElement('tr');
                empty.id = 'filaVaciaPedido';
                empty.innerHTML = '<td colspan="5" class="text-center text-muted">Aún no agregaste productos</td>';
                tablaBody.appendChild(empty);
            }
        }

        function iniciarListaProductos() {
            if (productosDisponibles.length === 0) {
                listaProductos.innerHTML = '<div class="text-center p-4 text-muted">No hay productos disponibles</div>';
                return;
            }
            renderListaProductosPedido(productosDisponibles);
        }

        buscarProducto.addEventListener('input', function() {
            const query = buscarProducto.value.trim().toLowerCase();
            const filtrados = productosDisponibles.filter(producto =>
                producto.codigo.toLowerCase().includes(query) ||
                producto.nombre.toLowerCase().includes(query)
            );
            renderListaProductosPedido(filtrados);
        });

        tablaBody.addEventListener('click', function(event) {
            if (!event.target.classList.contains('btn-eliminar-item')) {
                return;
            }

            const tr = event.target.closest('tr');
            if (tr) {
                tr.remove();
            }
            actualizarFilaVacia();
        });

        form.addEventListener('submit', function(event) {
            const items = form.querySelectorAll('input[name="producto_id"]');
            if (!items.length) {
                event.preventDefault();
                alert('Debe agregar al menos un producto');
            }
        });

        $('#modalCrearPedido').on('hidden.bs.modal', function() {
            form.reset();
            tablaBody.innerHTML = '<tr id="filaVaciaPedido"><td colspan="5" class="text-center text-muted">Aún no agregaste productos</td></tr>';
            iniciarListaProductos();
        });

        iniciarListaProductos();
    };
})();
