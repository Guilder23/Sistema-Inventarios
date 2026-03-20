// ================================================================
// MODAL AGREGAR PRODUCTO EXISTENTE A CONTENEDOR
// ================================================================

(function() {
    'use strict';
    
    let contenedorActualId = null;
    
    // Función para obtener token CSRF de forma segura
    function obtenerCSRFToken() {
        const token = document.querySelector('[name=csrfmiddlewaretoken]');
        if (!token) {
            console.warn('Token CSRF no encontrado en el formulario');
            return '';
        }
        return token.value || '';
    }
    
    // Event listener para el botón Agregar Producto Existente
    $(document).ready(function() {
        $('#btnAgregarExistente').on('click', function() {
            const contenedorId = $(this).data('contenedor-id');
            abrirModalAgregarProductoExistente(contenedorId);
        });
    });
    
    // Abre modal para agregar PRODUCTO EXISTENTE
    function abrirModalAgregarProductoExistente(contenedorId) {
        console.log('Abriendo modal agregar producto existente para contenedor:', contenedorId);
        contenedorActualId = contenedorId;
        document.getElementById('modalContenedorId2').value = contenedorId;

        const productSelect = document.getElementById('producto_id_modal');
        const unidadesInput = document.getElementById('unidades_por_caja_existente_modal');
        const cajasInput = document.getElementById('cantidad_cajas_existente_modal');
        const totalInput = document.getElementById('cantidad_existente_modal');
        if (productSelect) productSelect.value = '';
        if (unidadesInput) unidadesInput.value = 1;
        if (cajasInput) cajasInput.value = 1;
        if (totalInput) totalInput.value = 1;

        cargarProductosDisponibles(contenedorId);
        $('#modalAgregarProductoExistente').modal('show');
    }
    
    // Hacer accesible globalmente si es necesario
    window.abrirModalAgregarProductoExistente = abrirModalAgregarProductoExistente;
    
    // Cargar productos disponibles
    function cargarProductosDisponibles(contenedorId) {
        fetch(`/productos/contenedores/${contenedorId}/productos-disponibles/json/`, {
            headers: {'X-Requested-With': 'XMLHttpRequest'}
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log('Productos disponibles:', data);
            if (data.productos) {
                const selectExistente = document.getElementById('producto_id_modal');
                selectExistente.innerHTML = '<option value="">-- Seleccione un producto --</option>';
                data.productos.forEach(prod => {
                    const option = document.createElement('option');
                    option.value = prod.id;
                    option.textContent = `${prod.codigo} - ${prod.nombre}`;
                    option.dataset.unidadesPorCaja = prod.unidades_por_caja || 1;
                    selectExistente.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error cargando productos:', error);
        });
    }
    
        // Función para calcular unidades totales en base a cajas
        function calcularUnidadesTotalExistente() {
            const cantidadCajas = parseInt(document.getElementById('cantidad_cajas_existente_modal').value) || 0;
            const unidadesPorCaja = parseInt(document.getElementById('unidades_por_caja_existente_modal').value) || 1;
            const totalUnidades = cantidadCajas * unidadesPorCaja;
        
            const cantidadInput = document.getElementById('cantidad_existente_modal');
            cantidadInput.value = totalUnidades;
        }
    
        // Función para cargar datos del producto seleccionado
        function cargarDatosProductoSeleccionado(productoId) {
            if (!productoId) {
                document.getElementById('unidades_por_caja_existente_modal').value = 1;
                calcularUnidadesTotalExistente();
                return;
            }

            const select = document.getElementById('producto_id_modal');
            const selectedOption = select ? select.options[select.selectedIndex] : null;
            const unidadesDesdeLista = selectedOption ? parseInt(selectedOption.dataset.unidadesPorCaja || '0') : 0;

            if (unidadesDesdeLista > 0) {
                document.getElementById('unidades_por_caja_existente_modal').value = unidadesDesdeLista;
                calcularUnidadesTotalExistente();
                return;
            }

            fetch(`/productos/${productoId}/datos-basicos/`, {
                headers: {'X-Requested-With': 'XMLHttpRequest'}
            })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                const unidades = parseInt(data.unidades_por_caja || 1);
                document.getElementById('unidades_por_caja_existente_modal').value = unidades > 0 ? unidades : 1;
                calcularUnidadesTotalExistente();
            })
            .catch(error => {
                console.error('Error cargando datos del producto:', error);
                document.getElementById('unidades_por_caja_existente_modal').value = 1;
                calcularUnidadesTotalExistente();
            });
        }
    
    // Esperar a que el DOM esté listo para asignar event listeners
    document.addEventListener('DOMContentLoaded', function() {
        
        // Botón para abrir modal de producto existente
        const btnAgregarExistente = document.getElementById('btnAgregarExistente');
        if (btnAgregarExistente) {
            btnAgregarExistente.addEventListener('click', function() {
                const contenedorId = this.getAttribute('data-contenedor-id');
                abrirModalAgregarProductoExistente(contenedorId);
            });
        }
        
            // Event listener para cambio de producto
            const productSelect = document.getElementById('producto_id_modal');
            if (productSelect) {
                productSelect.addEventListener('change', function() {
                    cargarDatosProductoSeleccionado(this.value);
                });
            }
        
            // Event listeners para cálculo automático de unidades
            const cantidadCajasInput = document.getElementById('cantidad_cajas_existente_modal');
            const unidadesPorCajaInput = document.getElementById('unidades_por_caja_existente_modal');
        
            if (cantidadCajasInput) {
                cantidadCajasInput.addEventListener('input', calcularUnidadesTotalExistente);
                cantidadCajasInput.addEventListener('change', calcularUnidadesTotalExistente);
            }
        
            if (unidadesPorCajaInput) {
                unidadesPorCajaInput.addEventListener('input', calcularUnidadesTotalExistente);
                unidadesPorCajaInput.addEventListener('change', calcularUnidadesTotalExistente);
            }
        
        // Envío de formulario - Agregar producto existente
        const formAgregarExistente = document.getElementById('formAgregarProductoExistente');
        if (formAgregarExistente) {
            formAgregarExistente.addEventListener('submit', function(e) {
                e.preventDefault();
                const productoId = document.getElementById('producto_id_modal').value;
                const cantidad = document.getElementById('cantidad_existente_modal').value;
                    const cantidadCajas = document.getElementById('cantidad_cajas_existente_modal').value;
                
                    if (!productoId || !cantidadCajas || cantidad < 1) {
                        alert('Por favor selecciona un producto e ingresa una cantidad válida de cajas');
                    return;
                }
                
                const formData = new FormData(this);
                const url = `/productos/contenedores/${contenedorActualId}/agregar-producto/`;
                
                fetch(url, {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': obtenerCSRFToken()
                    },
                    body: formData
                })
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        $('#modalAgregarProductoExistente').modal('hide');
                        alert(data.mensaje || 'Producto agregado exitosamente');
                        setTimeout(() => location.reload(), 500);
                    } else {
                        alert('Error: ' + (data.error || 'No se pudo agregar el producto'));
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error al agregar el producto: ' + error.message);
                });
            });
        }
    });
    
    console.log('✓ Modal Agregar Producto Existente inicializado');
})();
