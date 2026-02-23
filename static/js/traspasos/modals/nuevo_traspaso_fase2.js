// Script para Fase 2: Completar Información del Traspaso

let ubicacionActual = null;
let destinosDisponibles = [];

function inicializarFase2() {
    cargarInformacionAutomatica();
    cargarDestinos();
    mostrarResumenProductos();
    
    const btnVolver = document.getElementById('btnVolverFase1');
    const btnCrear = document.getElementById('btnCrearTraspaso');
    
    if (btnVolver) {
        btnVolver.addEventListener('click', volverAFase1);
    }
    
    if (btnCrear) {
        btnCrear.addEventListener('click', crearTraspaso);
    }
}

function cargarInformacionAutomatica() {
    // Generar código
    const codigo = `TRP-${new Date().getTime()}-${Math.random().toString(36).substr(2, 9)}`;
    document.getElementById('codigo').value = codigo;
    
    // Fecha actual
    const ahora = new Date();
    const opciones = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('fechaCreacion').value = ahora.toLocaleDateString('es-CO', opciones);
    
    //Obtener origen (ubicación actual del usuario desde variable global)
    if (window.ubicacionActualId && window.ubicacionActualNombre) {
        ubicacionActual = {
            id: window.ubicacionActualId,
            nombre: window.ubicacionActualNombre
        };
        document.getElementById('origen').value = window.ubicacionActualNombre;
    } else {
        document.getElementById('origen').value = 'No disponible';
    }
}

function cargarDestinos() {
    const selectDestino = document.getElementById('destino');
    
    if (ubicacionActual) {
        fetch(`/traspasos/api/destinos/?ubicacion_id=${ubicacionActual.id}`)
            .then(response => response.json())
            .then(data => {
                destinosDisponibles = data;
                selectDestino.innerHTML = '<option value="">Seleccionar destino...</option>';
                
                data.forEach(destino => {
                    const option = document.createElement('option');
                    option.value = destino.id;
                    const nombreDestino = destino.nombre_ubicacion || 'Sin nombre';
                    option.textContent = `${nombreDestino} (${destino.rol})`;
                    selectDestino.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error:', error);
                selectDestino.innerHTML = '<option value="">Error al cargar destinos</option>';
            });
    } else {
        // Reintentar después de un tiempo si ubicación aún no cargó
        setTimeout(cargarDestinos, 1000);
    }
}

function mostrarResumenProductos() {
    const resumen = document.getElementById('resumenProductos');
    resumen.innerHTML = '';
    
    if (productosSeleccionados.length === 0) {
        resumen.innerHTML = '<div class="alert alert-info">No hay productos seleccionados</div>';
        return;
    }
    
    let total = 0;
    
    productosSeleccionados.forEach(producto => {
        const precioUnidad = parseFloat(producto.precio_unidad) || 0;
        const subtotal = precioUnidad * producto.cantidad;
        total += subtotal;
        
        const productoElement = document.createElement('div');
        productoElement.className = 'producto-resumen';
        productoElement.innerHTML = `
            <div>
                <strong>${producto.codigo} - ${producto.nombre}</strong><br>
                <small class="text-muted">Cantidad: ${producto.cantidad} x $${precioUnidad.toFixed(2)}</small>
            </div>
            <div style="text-align: right;">
                <strong>$${subtotal.toFixed(2)}</strong>
            </div>
        `;
        resumen.appendChild(productoElement);
    });
    
    const totalElement = document.createElement('div');
    totalElement.className = 'producto-resumen';
    totalElement.style.borderTop = '2px solid #ddd';
    totalElement.style.paddingTop = '10px';
    totalElement.style.marginTop = '10px';
    totalElement.innerHTML = `
        <strong>TOTAL:</strong>
        <strong style="color: #28a745;">$${total.toFixed(2)}</strong>
    `;
    resumen.appendChild(totalElement);
}

function volverAFase1() {
    $('#modalTraspasoFase2').modal('hide');
    
    setTimeout(() => {
        $('#modalNuevoTraspaso').modal('show');
    }, 300);
}

function crearTraspaso() {
    // Validaciones
    const destino = document.getElementById('destino').value;
    
    if (!destino) {
        Swal.fire('Advertencia', 'Debe seleccionar un destino', 'warning');
        return;
    }
    
    if (productosSeleccionados.length === 0) {
        Swal.fire('Advertencia', 'Debe seleccionar al menos un producto', 'warning');
        return;
    }
    
    // Preparar datos del formulario
    const formData = new FormData();
    
    // Obtener tipo de la fase 1
    const tipo = document.getElementById('tipoTraspaso').value || 'normal';
    
    formData.append('tipo', tipo);
    formData.append('destino', destino);
    formData.append('comentario', document.getElementById('comentario').value);
    
    // Agregar productos
    productosSeleccionados.forEach(producto => {
        formData.append('producto_id', producto.id);
        formData.append('cantidad', producto.cantidad);
    });
    
    // Agregar CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    formData.append('csrfmiddlewaretoken', csrfToken);
    
    // Mostrar loading
    const btnCrear = document.getElementById('btnCrearTraspaso');
    const textoOriginal = btnCrear.innerHTML;
    btnCrear.disabled = true;
    btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
    
    // Enviar
    fetch('/traspasos/crear/', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            Swal.fire(
                '¡Éxito!',
                'Traspaso creado exitosamente',
                'success'
            ).then(() => {
                location.reload();
            });
        } else {
            throw new Error(data.error || 'Error desconocido');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        Swal.fire('Error', error.message || 'Error al crear el traspaso', 'error');
        btnCrear.disabled = false;
        btnCrear.innerHTML = textoOriginal;
    });
}
