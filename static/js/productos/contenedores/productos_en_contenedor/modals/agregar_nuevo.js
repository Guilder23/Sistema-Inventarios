// ================================================================
// MODAL AGREGAR NUEVO PRODUCTO A CONTENEDOR
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
    
    // Event listener para el botón Agregar Nuevo Producto
    $(document).ready(function() {
        $('#btnAgregarNuevo').on('click', function() {
            const contenedorId = $(this).data('contenedor-id');
            abrirModalAgregarNuevoProducto(contenedorId);
        });
    });
    
    // Abre modal para agregar NUEVO producto
    function abrirModalAgregarNuevoProducto(contenedorId) {
        console.log('Abriendo modal agregar nuevo producto para contenedor:', contenedorId);
        contenedorActualId = contenedorId;
        document.getElementById('modalContenedorId').value = contenedorId;
        cargarCategorias();
        $('#modalAgregarNuevoProducto').modal('show');
    }
    
    // Hacer accesible globalmente si es necesario
    window.abrirModalAgregarNuevoProducto = abrirModalAgregarNuevoProducto;
    
    // Cargar categorías
    function cargarCategorias() {
        fetch('/productos/categorias/json/', {
            headers: {'X-Requested-With': 'XMLHttpRequest'}
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log('Categorías cargadas:', data);
            if (data.categorias) {
                const selectNuevo = document.getElementById('categoria_modal');
                selectNuevo.innerHTML = '<option value="">-- Sin categoría --</option>';
                data.categorias.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.nombre;
                    selectNuevo.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error cargando categorías:', error);
        });
    }
    
    // Esperar a que el DOM esté listo para asignar event listeners
    document.addEventListener('DOMContentLoaded', function() {
        
        // Botón para abrir modal de nuevo producto
        const btnAgregarNuevo = document.getElementById('btnAgregarNuevo');
        if (btnAgregarNuevo) {
            btnAgregarNuevo.addEventListener('click', function() {
                const contenedorId = this.getAttribute('data-contenedor-id');
                abrirModalAgregarNuevoProducto(contenedorId);
            });
        }
        
        // Envío de formulario - Agregar nuevo producto
        const formAgregarNuevo = document.getElementById('formAgregarNuevoProducto');
        if (formAgregarNuevo) {
            formAgregarNuevo.addEventListener('submit', function(e) {
                e.preventDefault();
                const codigo = document.getElementById('codigo_nuevo_modal').value;
                const nombre = document.getElementById('nombre_nuevo_modal').value;
                const cantidad = document.getElementById('cantidad_nuevo_modal').value;
                
                if (!codigo || !nombre || !cantidad) {
                    alert('Por favor completa todos los campos obligatorios');
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
                        $('#modalAgregarNuevoProducto').modal('hide');
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
    
    console.log('✓ Modal Agregar Nuevo Producto inicializado');
})();
