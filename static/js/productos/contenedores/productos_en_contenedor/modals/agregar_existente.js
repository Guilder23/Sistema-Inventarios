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
                
                if (!productoId || !cantidad) {
                    alert('Por favor selecciona un producto e ingresa una cantidad');
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
