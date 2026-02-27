(function() {
    'use strict';

    window.inicializarModalCrearPedido = function() {
        const form = document.getElementById('formCrearPedido');
        const selectProducto = document.getElementById('pedidoProductoSelect');
        const inputCantidad = document.getElementById('pedidoCantidadInput');
        const btnAgregar = document.getElementById('btnAgregarItemPedido');
        const tablaBody = document.querySelector('#tablaItemsPedido tbody');
        const filaVacia = document.getElementById('filaVaciaPedido');

        if (!form || !selectProducto || !inputCantidad || !btnAgregar || !tablaBody) {
            return;
        }

        btnAgregar.addEventListener('click', function() {
            const option = selectProducto.options[selectProducto.selectedIndex];
            const id = option.value;
            if (!id) {
                alert('Seleccione un producto');
                return;
            }

            const codigo = option.dataset.codigo;
            const nombre = option.dataset.nombre;
            const stock = parseInt(option.dataset.stock || '0', 10);
            const cantidad = parseInt(inputCantidad.value || '0', 10);

            if (cantidad <= 0) {
                alert('La cantidad debe ser mayor a 0');
                return;
            }

            if (cantidad > stock) {
                alert(`La cantidad supera el stock disponible (${stock})`);
                return;
            }

            if (tablaBody.querySelector(`tr[data-producto-id="${id}"]`)) {
                alert('Ese producto ya está agregado.');
                return;
            }

            if (filaVacia) {
                filaVacia.remove();
            }

            const tr = document.createElement('tr');
            tr.dataset.productoId = id;
            tr.innerHTML = `
                <td>${codigo}</td>
                <td>${nombre}</td>
                <td>${stock}</td>
                <td>${cantidad}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-item">Quitar</button>
                    <input type="hidden" name="producto_id" value="${id}">
                    <input type="hidden" name="cantidad" value="${cantidad}">
                </td>
            `;
            tablaBody.appendChild(tr);

            selectProducto.value = '';
            inputCantidad.value = '1';
        });

        tablaBody.addEventListener('click', function(event) {
            if (!event.target.classList.contains('btn-eliminar-item')) {
                return;
            }

            const tr = event.target.closest('tr');
            if (tr) {
                tr.remove();
            }

            if (!tablaBody.querySelector('tr')) {
                const empty = document.createElement('tr');
                empty.id = 'filaVaciaPedido';
                empty.innerHTML = '<td colspan="5" class="text-center text-muted">Aún no agregaste productos</td>';
                tablaBody.appendChild(empty);
            }
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
        });
    };
})();
