// ==========================================
// MODAL ELIMINAR/CAMBIAR ESTADO DEPÓSITO
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarModalEliminar();
});

function inicializarModalEliminar() {
    // Escuchar evento show.bs.modal del modal Eliminar
    jQuery('#modalEliminarDeposito').on('show.bs.modal', function(e) {
        const button = jQuery(e.relatedTarget);
        const depositoId = button.data('deposito-id');
        const depositoNombre = button.data('deposito-nombre');
        cargarEliminacionDeposito(depositoId, depositoNombre);
        document.getElementById('formEliminarDeposito').action = `/depositos/${depositoId}/cambiar-estado/`;
    });
    
    // Limpiar formulario cuando se cierre el modal
    jQuery('#modalEliminarDeposito').on('hidden.bs.modal', function() {
        const formEliminarDeposito = document.getElementById('formEliminarDeposito');
        if (formEliminarDeposito) {
            formEliminarDeposito.reset();
        }
    });
}

function cargarEliminacionDeposito(depositoId, depositoNombre) {
    fetch(`/depositos/${depositoId}/obtener/`)
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || 'Error al cargar datos');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            document.getElementById('eliminarDepositoId').value = data.id;
            document.getElementById('eliminarDepositoNombre').textContent = depositoNombre;
            
            // Determinar nuevo estado (toggle)
            const estadoActual = data.estado;
            const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
            const textoEstado = estadoActual === 'activo' ? 'será desactivado' : 'será activado';
            
            // Actualizar campo oculto con nuevo estado
            document.getElementById('eliminarDepositoEstado').value = nuevoEstado;
            
            // Actualizar texto del modal
            document.getElementById('textoInfoEstado').textContent = `El depósito ${textoEstado}.`;
        })
        .catch(error => {
            alert('Error al cargar los datos: ' + error.message);
            // Cerrar el modal si hay error
            jQuery('#modalEliminarDeposito').modal('hide');
        });
}
