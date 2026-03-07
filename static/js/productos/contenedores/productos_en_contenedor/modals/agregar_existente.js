// ================================================================
// MODAL AGREGAR PRODUCTO EXISTENTE A CONTENEDOR
// ================================================================

(function() {
    'use strict';
    
    let contenedorActualId = null;
    
    // Función para obtener token CSRF de forma segura
    function obtenerCSRFToken() {
        // Buscar en el formulario actual (dentro del modal)
        let token = document.querySelector('[name=csrfmiddlewaretoken]');
        if (token && token.value) {
            console.log('✓ CSRF token encontrado en el formulario');
            return token.value;
        }
        
        // Buscar en meta tags
        token = document.querySelector('meta[name="csrf-token"]');
        if (token && token.getAttribute('content')) {
            console.log('✓ CSRF token encontrado en meta tag');
            return token.getAttribute('content');
        }
        
        // Buscar en cookies
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                console.log('✓ CSRF token encontrado en cookies');
                return decodeURIComponent(value);
            }
        }
        
        console.warn('⚠️ CSRF token NO ENCONTRADO en formulario, meta tags, ni cookies');
        return '';
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
                    selectExistente.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error cargando productos:', error);
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
        
        // Envío de formulario - Agregar producto existente
        const formAgregarExistente = document.getElementById('formAgregarProductoExistente');
        if (formAgregarExistente) {
            formAgregarExistente.addEventListener('submit', function(e) {
                e.preventDefault();
                const productoId = document.getElementById('producto_id_modal').value;
                const cantidad = document.getElementById('cantidad_existente_modal').value;
                
                console.log('Enviando formulario:', {
                    productoId,
                    cantidad,
                    contenedorActualId
                });
                
                if (!productoId || !cantidad) {
                    alert('Por favor selecciona un producto e ingresa una cantidad');
                    return;
                }
                
                if (!contenedorActualId) {
                    alert('Error: No se especificó el contenedor');
                    return;
                }
                
                // Usar FormData para enviar todos los campos
                const formData = new FormData(this);
                // Asegurar que el tipo está correcto
                formData.set('tipo', 'existente');
                formData.set('producto_id', productoId);
                formData.set('cantidad', cantidad);
                
                const url = `/productos/contenedores/${contenedorActualId}/agregar-producto/`;
                console.log('POST URL:', url);
                
                fetch(url, {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': obtenerCSRFToken()
                    },
                    body: formData
                })
                .then(response => {
                    console.log('Response:', response.status, response.statusText);
                    if (!response.ok) {
                        return response.text().then(text => {
                            throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Response data:', data);
                    if (data.success) {
                        $('#modalAgregarProductoExistente').modal('hide');
                        alert(data.mensaje || 'Producto agregado exitosamente');
                        setTimeout(() => location.reload(), 500);
                    } else {
                        alert('Error: ' + (data.error || 'No se pudo agregar el producto'));
                    }
                })
                .catch(error => {
                    console.error('Full error:', error);
                    alert('Error al agregar el producto: ' + error.message);
                });
            });
        }
    });
    
    console.log('✓ Modal Agregar Producto Existente inicializado');
})();
