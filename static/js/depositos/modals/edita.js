// ==========================================
// MODAL EDITAR DEPÓSITO
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarModalEditar();
});

function inicializarModalEditar() {
    // Escuchar evento show.bs.modal del modal Editar
    jQuery('#modalEditarDeposito').on('show.bs.modal', function(e) {
        const button = jQuery(e.relatedTarget);
        const depositoId = button.data('deposito-id');
        cargarEdicionDeposito(depositoId);
        document.getElementById('formEditarDeposito').action = `/depositos/${depositoId}/editar/`;
    });
    
    // Validar y enviar formulario
    const formEditarDeposito = document.getElementById('formEditarDeposito');
    if (formEditarDeposito) {
        formEditarDeposito.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validar campos requeridos
            const nombre = document.getElementById('editarNombre').value.trim();
            const codigo = document.getElementById('editarCodigo').value.trim();
            const tipo = document.getElementById('editarTipo').value;
            const tienda = document.getElementById('editarTienda').value;
            const direccion = document.getElementById('editarDireccion').value.trim();
            const ciudad = document.getElementById('editarCiudad').value.trim();
            const departamento = document.getElementById('editarDepartamento').value.trim();
            
            if (!nombre || !codigo || !tipo || !tienda || !direccion || !ciudad || !departamento) {
                alert('Por favor, complete todos los campos requeridos');
                return;
            }
            
            // Si la validación pasó, enviar el formulario
            this.submit();
        });
    }
    
    // Limpiar formulario cuando se cierre el modal
    jQuery('#modalEditarDeposito').on('hidden.bs.modal', function() {
        const formEditarDeposito = document.getElementById('formEditarDeposito');
        if (formEditarDeposito) {
            formEditarDeposito.reset();
        }
    });
}

function cargarEdicionDeposito(depositoId) {
    fetch(`/depositos/${depositoId}/obtener/`)
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar datos');
            return response.json();
        })
        .then(data => {
            document.getElementById('editarId').value = data.id;
            document.getElementById('editarNombre').value = data.nombre || '';
            document.getElementById('editarCodigo').value = data.codigo || '';
            document.getElementById('editarDescripcion').value = data.descripcion || '';
            document.getElementById('editarTipo').value = data.tipo || '';
            document.getElementById('editarTienda').value = data.tienda_id || '';
            document.getElementById('editarDireccion').value = data.direccion || '';
            document.getElementById('editarCiudad').value = data.ciudad || '';
            document.getElementById('editarDepartamento').value = data.departamento || '';
            document.getElementById('editarPais').value = data.pais || 'Colombia';
            document.getElementById('editarCodigoPostal').value = data.codigo_postal || '';
            document.getElementById('editarTelefono').value = data.telefono || '';
            document.getElementById('editarEmail').value = data.email || '';
            document.getElementById('editarAreaM2').value = data.area_m2 || '';
            document.getElementById('editarHorarioApertura').value = data.horario_apertura || '';
            document.getElementById('editarHorarioCierre').value = data.horario_cierre || '';
            document.getElementById('editarFechaApertura').value = data.fecha_apertura || '';
            document.getElementById('editarEstado').value = data.estado || 'activo';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al cargar los datos para edición');
        });
}
