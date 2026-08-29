// ================================================================
// JAVASCRIPT MODAL - REGISTRAR DEVOLUCIÓN
// ================================================================

(function() {
    'use strict';

    function inicializarModalRegistrar() {
        const modal = document.getElementById('modalRegistrarDevolucion');
        const buscarProducto = document.getElementById('buscarProductoDevolucion');
        const selectProducto = document.getElementById('productoDevolucionSelect');
        const resultados = document.getElementById('resultadosProductoDevolucion');
        const productoSeleccionado = document.getElementById('productoSeleccionadoDevolucion');
        const productos = Array.from(selectProducto ? selectProducto.options : []).slice(1).map(option => ({
            id: option.value,
            codigo: option.textContent.split(' - ')[0],
            nombre: option.textContent.includes(' - ') ? option.textContent.split(' - ').slice(1).join(' - ').replace(/\s*\(Stock:.*\)$/, '') : option.textContent,
            label: option.textContent
        }));

        function renderProductos(busqueda) {
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
                <button type="button" class="list-group-item list-group-item-action seleccionar-producto-devolucion" data-id="${producto.id}">
                    ${producto.label}
                </button>
            `).join('');
            resultados.style.display = '';

            resultados.querySelectorAll('.seleccionar-producto-devolucion').forEach(opcion => {
                opcion.onclick = function() {
                    const producto = productos.find(item => String(item.id) === String(this.dataset.id));
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
                renderProductos(this.value);
            });
        }

        $(modal).on('shown.bs.modal', function() {
            if (buscarProducto) {
                buscarProducto.focus();
            }
        });

        $('#modalRegistrarDevolucion').on('show.bs.modal', function() {
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
        });

        // Guardar devolución
        $(document).on('click', '#btnGuardarDevolucion', function() {
            if (!validarFormulario()) {
                return false;
            }

            const formData = {
                producto_id: $('#productoDevolucionSelect').val(),
                cantidad: $('#cantidadDevolucion').val(),
                comentario: $('#comentarioDevolucion').val()
            };

            $.ajax({
                url: '/devoluciones/registrar/',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(formData),
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        $('#modalRegistrarDevolucion').modal('hide');
                        location.reload();
                    }
                },
                error: function() {
                }
            });
        });

        // Limpiar al cerrar
        $('#modalRegistrarDevolucion').on('hidden.bs.modal', function() {
            limpiarFormulario();
        });
    }

    function validarFormulario() {
        const productoId = $('#productoDevolucionSelect').val();
        const cantidad = $('#cantidadDevolucion').val();

        if (!productoId) {
            return false;
        }

        if (!cantidad || parseInt(cantidad) <= 0) {
            return false;
        }

        return true;
    }

    function limpiarFormulario() {
        const form = document.getElementById('formRegistrarDevolucion');
        if (form) form.reset();
        $('#productoDevolucionSelect').val('');
        $('#buscarProductoDevolucion').val('');
        $('#resultadosProductoDevolucion').html('').hide();
        $('#productoSeleccionadoDevolucion').text('Ningún producto seleccionado.');
        $('#cantidadDevolucion').val('');
        $('#comentarioDevolucion').val('');
    }

    window.inicializarModalRegistrar = inicializarModalRegistrar;

})();
