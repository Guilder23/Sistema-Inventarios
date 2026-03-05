document.addEventListener('DOMContentLoaded', function () {
    inicializarModalAccionStock();
});

function inicializarModalAccionStock() {
    const botones = document.querySelectorAll('.btn-accion-stock');
    const form = document.getElementById('formAccionStock');
    const titulo = document.getElementById('tituloAccionStock');
    const nombreProducto = document.getElementById('nombreProductoAccion');
    const maximo = document.getElementById('maximoAccion');
    const cantidadInput = document.getElementById('cantidadAccion');
    const btnConfirmar = document.getElementById('btnConfirmarAccion');

    if (!form || !cantidadInput) return;

    botones.forEach((boton) => {
        boton.addEventListener('click', function () {
            const url = this.dataset.url || '';
            const producto = this.dataset.producto || '-';
            const max = Number(this.dataset.maximo || 0);
            const tituloAccion = this.dataset.titulo || 'Acción de Stock';
            const accion = this.dataset.accion || 'accion';

            form.action = url;
            titulo.textContent = tituloAccion;
            nombreProducto.textContent = producto;
            maximo.textContent = max;
            cantidadInput.max = String(max);
            cantidadInput.value = max > 0 ? '1' : '0';
            if (accion === 'danado') {
                btnConfirmar.textContent = 'Agregar dañados';
            } else if (accion === 'reponer') {
                btnConfirmar.textContent = 'Reponer al stock';
            } else {
                btnConfirmar.textContent = 'Confirmar';
            }
        });
    });

    form.addEventListener('submit', function (event) {
        const cantidad = Number(cantidadInput.value || 0);
        const max = Number(cantidadInput.max || 0);

        if (cantidad <= 0 || (max > 0 && cantidad > max)) {
            event.preventDefault();
            alert(`Ingrese una cantidad válida entre 1 y ${max}`);
        }
    });
}
