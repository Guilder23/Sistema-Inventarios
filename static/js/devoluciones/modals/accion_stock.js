document.addEventListener('DOMContentLoaded', function () {
    inicializarModalAccionStock();
});

function inicializarModalAccionStock() {
    const botones = document.querySelectorAll('.btn-accion-stock');
    const form = document.getElementById('formAccionStock');
    const titulo = document.getElementById('tituloAccionStock');
    const nombreProducto = document.getElementById('nombreProductoAccion');
    const maximo = document.getElementById('maximoAccion');
    const labelMaximo = document.getElementById('labelMaximo');
    const cantidadInput = document.getElementById('cantidadAccion');
    const btnConfirmar = document.getElementById('btnConfirmarAccion');
    const labelCantidad = document.getElementById('labelCantidad');
    const helperCantidad = document.getElementById('helperCantidad');

    if (!form || !cantidadInput) return;

    botones.forEach((boton) => {
        boton.addEventListener('click', function () {
            const url = this.dataset.url || '';
            const producto = this.dataset.producto || '-';
            const max = Number(this.dataset.maximo || 0);
            const tituloAccion = this.dataset.titulo || 'Procesar Devolución';
            const accion = this.dataset.accion || 'accion';

            form.action = url;
            titulo.textContent = tituloAccion;
            nombreProducto.textContent = producto;
            maximo.textContent = max;
            cantidadInput.max = String(max);
            cantidadInput.value = max > 0 ? '1' : '0';
            cantidadInput.placeholder = Math.min(5, max) > 0 ? String(Math.min(5, max)) : '1';
            
            if (accion === 'devolucion') {
                if (labelMaximo) labelMaximo.textContent = 'Pendientes:';
                labelCantidad.textContent = '¿Cuántas más devoluciones hay de este producto?';
                helperCantidad.textContent = 'Este número se sumará a las devoluciones actuales (no afecta el stock)';
                btnConfirmar.textContent = '+ Agregar devoluciones';
                btnConfirmar.className = 'btn btn-warning';
            } else if (accion === 'repuesto') {
                if (labelMaximo) labelMaximo.textContent = 'Pendientes:';
                labelCantidad.textContent = '¿Cuántas unidades repones al stock?';
                helperCantidad.textContent = 'Productos repuestos que se agregarán al inventario';
                btnConfirmar.textContent = '↻ Reponer al stock';
                btnConfirmar.className = 'btn btn-primary';
            } else {
                if (labelMaximo) labelMaximo.textContent = 'Pendientes:';
                labelCantidad.textContent = 'Ingresa la cantidad';
                helperCantidad.textContent = 'Indica la cantidad a procesar';
                btnConfirmar.textContent = 'Confirmar';
                btnConfirmar.className = 'btn btn-primary';
            }
        });
    });

    form.addEventListener('submit', function (event) {
        const cantidad = Number(cantidadInput.value || 0);
        const max = Number(cantidadInput.max || 0);

        if (cantidad <= 0 || (max > 0 && cantidad > max)) {
            event.preventDefault();
            alert(`Ingresa una cantidad válida entre 1 y ${max}`);
        }
    });
}
