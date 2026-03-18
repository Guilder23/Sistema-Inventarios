// ==========================================
// MODAL CAMBIAR ESTADO ALMACÉN
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarModalEliminar();
});

function inicializarModalEliminar() {
    jQuery('#modalEliminarAlmacen').on('show.bs.modal', function(e) {
        const button = e.relatedTarget;
        const almacenId = button.getAttribute('data-almacen-id');
        const almacenNombre = button.getAttribute('data-almacen-nombre');
        if (almacenId) {
            cargarEliminacionAlmacen(almacenId, almacenNombre);
            document.getElementById('formEliminarAlmacen').action = '/almacenes/' + almacenId + '/cambiar-estado/';
        }
    });
    
    const formEliminarAlmacen = document.getElementById('formEliminarAlmacen');
    if (formEliminarAlmacen) {
        formEliminarAlmacen.addEventListener('submit', function(e) {
            // El formulario se envía normalmente
        });
    }
}

function cargarEliminacionAlmacen(almacenId, almacenNombre) {
    fetch('/almacenes/' + almacenId + '/obtener/')
        .then(response => response.json())
        .then(data => {
            document.getElementById('eliminarAlmacenId').value = almacenId;
            document.getElementById('eliminarAlmacenNombre').textContent = almacenNombre;
            
            const nuevoEstado = data.estado === 'activo' ? 'inactivo' : 'activo';
            document.getElementById('eliminarAlmacenEstado').value = nuevoEstado;
            
            const modalBody = document.querySelector('#modalEliminarAlmacen .modal-body');
            const parrafoEstado = modalBody.querySelector('p.text-muted');
            if (parrafoEstado) {
                const estadoTexto = nuevoEstado === 'activo' ? 'activado' : 'desactivado';
                parrafoEstado.innerHTML = 'El almacén será <strong>' + estadoTexto + '</strong>';
            }
        })
        .catch(error => {
            alert('Error al cargar el almacén');
        });
}
