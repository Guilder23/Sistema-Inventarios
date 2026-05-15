// ================================================================
// MODAL AGREGAR PRODUCTO EXISTENTE A CONTENEDOR
// ================================================================

(function() {
    'use strict';
    
    let contenedorActualId = null;
    let productosDisponiblesCache = [];
    
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
                // Guardar copia en caché para filtrado dinámico
                productosDisponiblesCache = data.productos.slice();
                const buscarInput = document.getElementById('producto_buscar_modal');
                const hiddenInput = document.getElementById('producto_id_modal');
                const listaContenedor = document.getElementById('producto_lista_modal');

                    // Evento de filtrado en tiempo real (mostrar coincidencias sólo con texto)
                    if (buscarInput) {
                        buscarInput.addEventListener('input', function() {
                            // limpiar id seleccionado cuando el texto cambia
                            if (hiddenInput) hiddenInput.value = '';
                            filtrarProductos(this.value);
                        });

                        // Enter selecciona la primera coincidencia válida
                        buscarInput.addEventListener('keydown', function(e) {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const primeras = listaContenedor.querySelectorAll('button.producto-item');
                                if (primeras && primeras.length > 0) {
                                    primeras[0].click();
                                }
                            }
                        });

                        // Ocultar la lista al perder foco, con pequeño retraso para permitir clicks
                        buscarInput.addEventListener('blur', function() {
                            setTimeout(() => { listaContenedor.innerHTML = ''; }, 150);
                        });
                    }
            }
        })
        .catch(error => {
            console.error('Error cargando productos:', error);
        });
    }

    // Filtra la lista de productos en memoria y reconstruye la lista desplegable
    function filtrarProductos(termino) {
        termino = (termino || '').toString().trim().toLowerCase();
        const listaContenedor = document.getElementById('producto_lista_modal');
        const buscarInput = document.getElementById('producto_buscar_modal');
        const hiddenInput = document.getElementById('producto_id_modal');
        if (!listaContenedor || !buscarInput) return;

        // Limpiar contenedor
        listaContenedor.innerHTML = '';

        // Si no hay término de búsqueda, no mostrar nada
        if (!termino) {
            listaContenedor.innerHTML = '';
            return;
        }

        // Filtrar
        const filtrados = productosDisponiblesCache.filter(prod => {
            const texto = `${prod.codigo} ${prod.nombre}`.toLowerCase();
            return texto.indexOf(termino) !== -1;
        });

        if (filtrados.length === 0) {
            const noFound = document.createElement('div');
            noFound.className = 'p-2 text-muted';
            noFound.textContent = 'No se encontraron productos';
            // mostrar como overlay
            const wrapper = document.createElement('div');
            wrapper.style.position = 'absolute';
            wrapper.style.top = '100%';
            wrapper.style.left = '0';
            wrapper.style.right = '0';
            wrapper.style.zIndex = '2000';
            wrapper.style.maxHeight = '240px';
            wrapper.style.overflow = 'auto';
            wrapper.appendChild(noFound);
            listaContenedor.innerHTML = '';
            listaContenedor.appendChild(wrapper);
            return;
        }

        const list = document.createElement('div');
        list.className = 'list-group';
        // contenedor overlay
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.top = '100%';
        wrapper.style.left = '0';
        wrapper.style.right = '0';
        wrapper.style.zIndex = '2000';
        wrapper.style.maxHeight = '240px';
        wrapper.style.overflow = 'auto';

        filtrados.forEach(prod => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'list-group-item list-group-item-action producto-item';
            btn.textContent = `${prod.codigo} - ${prod.nombre}`;
            btn.dataset.prodId = prod.id;
            btn.dataset.unidadesPorCaja = prod.unidades_por_caja || 1;

            btn.addEventListener('click', function() {
                // establecer valor visible y oculto
                buscarInput.value = this.textContent;
                if (hiddenInput) hiddenInput.value = this.dataset.prodId || '';
                // cargar unidades por caja y calcular totales
                const unidades = parseInt(this.dataset.unidadesPorCaja || '1');
                document.getElementById('unidades_por_caja_existente_modal').value = unidades > 0 ? unidades : 1;
                calcularUnidadesTotalExistente();
                // asegurar que se carguen datos adicionales si es necesario
                if (hiddenInput && hiddenInput.value) cargarDatosProductoSeleccionado(hiddenInput.value);
                // limpiar lista
                listaContenedor.innerHTML = '';
            });

            list.appendChild(btn);
        });

        wrapper.appendChild(list);
        listaContenedor.innerHTML = '';
        listaContenedor.appendChild(wrapper);
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
            // Intentar obtener el producto desde la caché
            const prod = productosDisponiblesCache.find(p => String(p.id) === String(productoId));
            if (prod) {
                const unidades = parseInt(prod.unidades_por_caja || 1);
                document.getElementById('unidades_por_caja_existente_modal').value = unidades > 0 ? unidades : 1;
                calcularUnidadesTotalExistente();
                return;
            }

            // Si no está en caché, solicitar al servidor
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
