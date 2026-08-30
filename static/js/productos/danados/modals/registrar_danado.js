document.addEventListener('DOMContentLoaded', function () {
    inicializarModalRegistrarDanado();
});

function inicializarModalRegistrarDanado() {
    const inputFoto = document.getElementById('fotoDanado');
    const imgPreview = document.getElementById('imgPreviewDanado');
    const previewContainer = document.getElementById('previewFotoDanado');
    const placeholder = document.getElementById('placeholderFotoDanado');
    const modal = document.getElementById('modalRegistrarDanado');
    const buscarProducto = document.getElementById('buscarProductoDanado');
    const selectProducto = document.getElementById('productoDanadoSelect');
    const resultados = document.getElementById('resultadosProductoDanado');
    const productoSeleccionado = document.getElementById('productoSeleccionadoDanado');

    const productos = Array.from(selectProducto ? selectProducto.options : []).slice(1).map(option => ({
        id: option.value,
        codigo: option.textContent.split(' - ')[0],
        nombre: option.textContent.includes(' - ') ? option.textContent.split(' - ').slice(1).join(' - ').replace(/\s*\(Stock:.*\)$/, '') : option.textContent,
        label: option.textContent
    }));

    function renderProductosDanados(busqueda) {
        if (!resultados) return;
        const termino = (busqueda || '').trim().toLowerCase();

        if (!termino) {
            resultados.innerHTML = '';
            resultados.style.display = 'none';
            return;
        }

        const filtrados = productos.filter(producto => {
            const texto = `${producto.codigo} ${producto.nombre}`.toLowerCase();
            return texto.includes(termino);
        });

        if (!filtrados.length) {
            resultados.innerHTML = '<div class="list-group-item text-muted">No se encontraron productos</div>';
            resultados.style.display = '';
            return;
        }

        resultados.innerHTML = filtrados.map(producto => `
            <button type="button" class="list-group-item list-group-item-action seleccionar-producto-danado" data-id="${producto.id}">
                ${producto.label}
            </button>
        `).join('');
        resultados.style.display = '';

        resultados.querySelectorAll('.seleccionar-producto-danado').forEach(opcion => {
            opcion.onclick = function() {
                const id = this.dataset.id;
                const producto = productos.find(item => String(item.id) === String(id));
                if (!producto || !selectProducto) return;

                selectProducto.value = producto.id;
                if (buscarProducto) {
                    buscarProducto.value = producto.label;
                }
                resultados.style.display = 'none';
                if (productoSeleccionado) {
                    productoSeleccionado.textContent = `Seleccionado: ${producto.label}`;
                }
            };
        });
    }

    if (buscarProducto) {
        buscarProducto.addEventListener('input', function() {
            if (selectProducto) {
                selectProducto.value = '';
            }
            if (productoSeleccionado) {
                productoSeleccionado.textContent = 'Ningún producto seleccionado.';
            }
            renderProductosDanados(this.value);
        });
    }

    if (modal) {
        $(modal).on('shown.bs.modal', function () {
            if (buscarProducto) {
                buscarProducto.focus();
            }
        });

        $(modal).on('hidden.bs.modal', function () {
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }

            if (buscarProducto) {
                buscarProducto.value = '';
            }
            if (selectProducto) {
                selectProducto.value = '';
            }
            if (resultados) {
                resultados.innerHTML = '';
                resultados.style.display = 'none';
            }
            if (productoSeleccionado) {
                productoSeleccionado.textContent = 'Ningún producto seleccionado.';
            }

            if (imgPreview) imgPreview.src = '';
            if (previewContainer) previewContainer.style.display = 'none';
            if (placeholder) placeholder.style.display = 'flex';
        });
    }

    if (inputFoto) {
        inputFoto.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();

                reader.onload = function(e) {
                    imgPreview.src = e.target.result;
                    previewContainer.style.display = 'block';
                    placeholder.style.display = 'none';
                };

                reader.readAsDataURL(this.files[0]);
            } else {
                previewContainer.style.display = 'none';
                placeholder.style.display = 'flex';
            }
        });
    }
}
