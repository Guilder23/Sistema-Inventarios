// Script para Fase 1: Seleccionar Productos

let fase1Inicializada = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Cargado - Inicializando modal fase 1');
    
    // Escuchar cuando se abre el modal de Fase 1
    const modalFase1 = document.getElementById('modalNuevoTraspaso');
    if (modalFase1) {
        console.log('Modal fase 1 encontrado');
        
        // Usar 'shown.bs.modal' en lugar de 'show.bs.modal'
        $(modalFase1).on('shown.bs.modal', function() {
            console.log('Modal fase 1 mostrado');
            if (!fase1Inicializada) {
                inicializarFase1();
                fase1Inicializada = true;
            } else {
                // Recargar productos si ya estaba inicializado
                cargarProductos();
            }
        });
    } else {
        console.error('Modal fase 1 NO encontrado');
    }
});

function inicializarFase1() {
    cargarProductos();
    
    const btnContinuar = document.getElementById('btnContinuarFase2');
    const buscarProducto = document.getElementById('buscarProducto');
    
    if (btnContinuar) {
        btnContinuar.addEventListener('click', validarYContinuarFase2);
    }
    
    if (buscarProducto) {
        buscarProducto.addEventListener('keyup', filtrarProductos);
    }
}

function cargarProductos() {
    console.log('Cargando productos desde API...');
    
    fetch('/traspasos/api/productos/')
        .then(response => {
            console.log('Respuesta recibida:', response.status);
            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('Productos recibidos:', data.length);
            productosDisponibles = data;
            mostrarProductos(data);
        })
        .catch(error => {
            console.error('Error al cargar productos:', error);
            const listaProductos = document.getElementById('listaProductos');
            listaProductos.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        });
}

function mostrarProductos(productos) {
    const listaProductos = document.getElementById('listaProductos');
    
    if (productos.length === 0) {
        listaProductos.innerHTML = '<div class="alert alert-info">No hay productos disponibles</div>';
        return;
    }
    
    listaProductos.innerHTML = '';
    
    productos.forEach(producto => {
        const productoElement = document.createElement('div');
        productoElement.className = 'producto-item';
        productoElement.innerHTML = `
            <div class="producto-item-info">
                <div class="codigo">${producto.codigo}</div>
                <div class="nombre">${producto.nombre}</div>
                <div class="stock">Stock: ${producto.stock}</div>
            </div>
            <div class="producto-item-acciones">
                <input type="number" class="form-control producto-item-cantidad" 
                       placeholder="Cantidad" min="1" max="${producto.stock}" data-id="${producto.id}">
                <button type="button" class="btn btn-sm btn-success" onclick="agregarProducto(${producto.id})">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
        listaProductos.appendChild(productoElement);
    });
}

function filtrarProductos(e) {
    const texto = e.target.value.toLowerCase();
    
    const productosFiltrados = productosDisponibles.filter(p => 
        p.nombre.toLowerCase().includes(texto) || 
        p.codigo.toLowerCase().includes(texto)
    );
    
    mostrarProductos(productosFiltrados);
}

function agregarProducto(productoId) {
    const inputCantidad = document.querySelector(`input[data-id="${productoId}"]`);
    const cantidad = parseInt(inputCantidad.value);
    
    if (!cantidad || cantidad <= 0) {
        Swal.fire('Advertencia', 'Ingrese una cantidad válida', 'warning');
        return;
    }
    
    const producto = productosDisponibles.find(p => p.id === productoId);
    
    if (cantidad > producto.stock) {
        Swal.fire('Advertencia', `Stock insuficiente. Stock disponible: ${producto.stock}`, 'warning');
        return;
    }
    
    // Verificar si ya está seleccionado
    const yaSeleccionado = productosSeleccionados.find(p => p.id === productoId);
    
    if (yaSeleccionado) {
        yaSeleccionado.cantidad += cantidad;
        Swal.fire('Éxito', 'Cantidad actualizada', 'success');
    } else {
        productosSeleccionados.push({
            id: producto.id,
            codigo: producto.codigo,
            nombre: producto.nombre,
            precio_unidad: parseFloat(producto.precio_unidad) || 0,
            cantidad: cantidad
        });
        Swal.fire('Éxito', 'Producto agregado', 'success');
    }
    
    inputCantidad.value = '';
    actualizarListaSeleccionados();
}

function actualizarListaSeleccionados() {
    const contenedor = document.getElementById('productosSeleccionados');
    
    if (productosSeleccionados.length === 0) {
        contenedor.innerHTML = '<div class="alert alert-info">Sin productos seleccionados</div>';
        return;
    }
    
    contenedor.innerHTML = '';
    
    productosSeleccionados.forEach((producto, index) => {
        const productoElement = document.createElement('div');
        productoElement.className = 'producto-seleccionado';
        productoElement.innerHTML = `
            <div class="producto-seleccionado-info">
                <div class="nombre">${producto.codigo} - ${producto.nombre}</div>
                <div class="cantidad">Cantidad: <strong>${producto.cantidad}</strong></div>
            </div>
            <div class="producto-seleccionado-acciones">
                <button type="button" class="btn btn-sm btn-warning" onclick="editarProductoSeleccionado(${index})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button type="button" class="btn btn-sm btn-danger" onclick="removerProducto(${index})">
                    <i class="fas fa-trash"></i> Remover
                </button>
            </div>
        `;
        contenedor.appendChild(productoElement);
    });
}

function editarProductoSeleccionado(index) {
    const producto = productosSeleccionados[index];
    const productoOriginal = productosDisponibles.find(p => p.id === producto.id);
    
    Swal.fire({
        title: 'Editar cantidad',
        input: 'number',
        inputValue: producto.cantidad,
        inputAttributes: {
            min: 1,
            max: productoOriginal.stock
        },
        showCancelButton: true,
        confirmButtonText: 'Actualizar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value || value <= 0) {
                return 'Ingrese una cantidad válida';
            }
            if (value > productoOriginal.stock) {
                return `Stock insuficiente. Stock disponible: ${productoOriginal.stock}`;
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            producto.cantidad = parseInt(result.value);
            actualizarListaSeleccionados();
        }
    });
}

function removerProducto(index) {
    productosSeleccionados.splice(index, 1);
    actualizarListaSeleccionados();
}

function validarYContinuarFase2() {
    if (productosSeleccionados.length === 0) {
        Swal.fire('Advertencia', 'Debe seleccionar al menos un producto', 'warning');
        return;
    }
    
    const tipoTraspaso = document.getElementById('tipoTraspaso').value;
    if (!tipoTraspaso) {
        Swal.fire('Advertencia', 'Debe seleccionar el tipo de traspaso', 'warning');
        return;
    }
    
    const modalFase1 = $('#modalNuevoTraspaso');
    const modalFase2 = $('#modalTraspasoFase2');

    if (document.activeElement) {
        document.activeElement.blur();
    }

    modalFase1.one('hidden.bs.modal', function() {
        modalFase2.modal('show');
        inicializarFase2();
    });

    modalFase1.modal('hide');
}
