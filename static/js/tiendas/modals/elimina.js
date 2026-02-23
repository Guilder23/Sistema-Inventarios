// ==========================================
// MODAL ELIMINAR/CAMBIAR ESTADO TIENDA
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarModalEliminar();
});

function inicializarModalEliminar() {
    // Escuchar evento show.bs.modal del modal Eliminar
    jQuery('#modalEliminarTienda').on('show.bs.modal', function(e) {
        const button = jQuery(e.relatedTarget);
        const tiendaId = button.data('tienda-id');
        const tiendaNombre = button.data('tienda-nombre');
        cargarEliminacionTienda(tiendaId, tiendaNombre);
        document.getElementById('formEliminarTienda').action = `/tiendas/${tiendaId}/cambiar-estado/`;
    });
    
    // Validar y enviar formulario
    const formEliminarTienda = document.getElementById('formEliminarTienda');
    if (formEliminarTienda) {
        formEliminarTienda.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Mostrar confirmación
            const tiendaNombre = document.getElementById('eliminarTiendaNombre').textContent;
            const estado = document.getElementById('eliminarTiendaEstado').value;
            const textoEstado = estado === 'activo' ? 'activada' : 'desactivada';
            
            if (confirm(`¿Desea cambiar el estado de "${tiendaNombre}" a "${textoEstado}"?`)) {
                this.submit();
            }
        });
    }
    
    // Limpiar formulario cuando se cierre el modal
    jQuery('#modalEliminarTienda').on('hidden.bs.modal', function() {
        const formEliminarTienda = document.getElementById('formEliminarTienda');
        if (formEliminarTienda) {
            formEliminarTienda.reset();
        }
    });
}

function cargarEliminacionTienda(tiendaId, tiendaNombre) {
    fetch(`/tiendas/${tiendaId}/obtener/`)
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar datos');
            return response.json();
        })
        .then(data => {
            document.getElementById('eliminarTiendaId').value = data.id;
            document.getElementById('eliminarTiendaNombre').textContent = tiendaNombre;
            
            // Determinar nuevo estado (toggle)
            const estadoActual = data.estado;
            const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
            const textoEstado = estadoActual === 'activo' ? 'será desactivada' : 'será activada';
            
            // Actualizar campo oculto con nuevo estado
            document.getElementById('eliminarTiendaEstado').value = nuevoEstado;
            
            // Actualizar texto del modal
            const bodyText = document.querySelector('#modalEliminarTienda .modal-body p:nth-of-type(1)');
            if (bodyText) {
                bodyText.innerHTML = `¿Está seguro de que desea cambiar el estado de la tienda <strong>${tiendaNombre}</strong>?<br><small class="text-muted">La tienda ${textoEstado}.</small>`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al cargar los datos');
        });
}
