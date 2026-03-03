// ================================================================
// MODAL AGREGAR NUEVO PRODUCTO A CONTENEDOR
// ================================================================

(function() {
    'use strict';
    
    let contenedorActualId = null;
    
    // Función para obtener token CSRF de forma segura
    function obtenerCSRFToken() {
        const form = document.getElementById('formAgregarNuevoProducto');
        const token = form ? form.querySelector('[name=csrfmiddlewaretoken]') : null;
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
        limpiarFormulario();
        cargarCategorias();
        $('#modalAgregarNuevoProducto').modal('show');
    }
    
    // Limpiar formulario
    function limpiarFormulario() {
        const form = document.getElementById('formAgregarNuevoProducto');
        if (form) {
            form.reset();
            document.getElementById('previewFotoModal').innerHTML = '';
        }
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
                selectNuevo.innerHTML = '<option value="">Seleccione una categoría</option>';
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
        
        // Preview de imagen
        const inputFoto = document.getElementById('foto_modal');
        if (inputFoto) {
            inputFoto.addEventListener('change', function(e) {
                const file = e.target.files[0];
                const preview = document.getElementById('previewFotoModal');
                
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        preview.innerHTML = `
                            <div class="position-relative d-inline-block">
                                <img src="${event.target.result}" class="img-thumbnail" style="max-width: 150px; max-height: 150px;">
                                <button type="button" class="btn btn-sm btn-danger position-absolute" style="top: 5px; right: 5px;" onclick="
                                    document.getElementById('foto_modal').value = '';
                                    document.getElementById('previewFotoModal').innerHTML = '';
                                ">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `;
                    };
                    reader.readAsDataURL(file);
                } else {
                    preview.innerHTML = '';
                }
            });
        }
        
        // Envío de formulario - Agregar nuevo producto
        const formAgregarNuevo = document.getElementById('formAgregarNuevoProducto');
        if (formAgregarNuevo) {
            formAgregarNuevo.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Validar campos obligatorios
                const codigo = document.getElementById('codigo_modal').value.trim();
                const nombre = document.getElementById('nombre_modal').value.trim();
                const categoria = document.getElementById('categoria_modal').value;
                const unidadesPorCaja = document.getElementById('unidades_por_caja_modal').value;
                const precioUnidad = document.getElementById('precio_unidad_modal').value;
                const cantidad = document.getElementById('cantidad_modal').value;
                
                if (!codigo || !nombre) {
                    alert('Por favor completa el código y nombre del producto');
                    return;
                }
                
                if (!categoria) {
                    alert('Por favor selecciona una categoría');
                    return;
                }
                
                if (!unidadesPorCaja || unidadesPorCaja < 1) {
                    alert('Las unidades por caja deben ser mayor a 0');
                    return;
                }
                
                if (!precioUnidad || precioUnidad < 0) {
                    alert('El precio unitario debe ser un número válido y mayor o igual a 0');
                    return;
                }
                
                if (!cantidad || cantidad < 1) {
                    alert('La cantidad debe ser mayor a 0');
                    return;
                }
                
                // Mostrar indicador de carga
                const btnSubmit = formAgregarNuevo.querySelector('button[type="submit"]');
                const textoOriginal = btnSubmit.innerHTML;
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
                
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
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = textoOriginal;
                    
                    if (data.success) {
                        $('#modalAgregarNuevoProducto').modal('hide');
                        // Mostrar notificación y recargar
                        const alertDiv = document.createElement('div');
                        alertDiv.className = 'alert alert-success alert-dismissible fade show';
                        alertDiv.innerHTML = `
                            ${data.mensaje || 'Producto creado y agregado exitosamente'}
                            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                        `;
                        document.body.insertBefore(alertDiv, document.body.firstChild);
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        btnSubmit.disabled = false;
                        btnSubmit.innerHTML = textoOriginal;
                        alert('Error: ' + (data.error || 'No se pudo agregar el producto'));
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = textoOriginal;
                    alert('Error al agregar el producto: ' + error.message);
                });
            });
        }
    });
    
    console.log('✓ Modal Agregar Nuevo Producto inicializado');
})();
