// ==========================================
// MODAL EDITAR ALMACÉN
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarModalEditar();
});

function inicializarModalEditar() {
    jQuery('#modalEditarAlmacen').on('show.bs.modal', function(e) {
        const button = e.relatedTarget;
        const almacenId = button.getAttribute('data-almacen-id');
        if (almacenId) {
            cargarEdicionAlmacen(almacenId);
            document.getElementById('formEditarAlmacen').action = '/almacenes/' + almacenId + '/editar/';
        }
    });
    
    const formEditarAlmacen = document.getElementById('formEditarAlmacen');
    if (formEditarAlmacen) {
        formEditarAlmacen.addEventListener('submit', function(e) {
            if (!validarFormularioEditar()) {
                e.preventDefault();
            }
        });
    }
    
    // Limpiar formulario cuando se cierre el modal
    jQuery('#modalEditarAlmacen').on('hidden.bs.modal', function() {
        const form = document.getElementById('formEditarAlmacen');
        if (form) {
            form.reset();
        }
    });
}

function cargarEdicionAlmacen(almacenId) {
    fetch('/almacenes/' + almacenId + '/obtener/')
        .then(response => response.json())
        .then(data => {
            document.getElementById('editarId').value = data.id;
            document.getElementById('editarNombre').value = data.nombre;
            document.getElementById('editarCodigo').value = data.codigo;
            document.getElementById('editarDescripcion').value = data.descripcion || '';
            document.getElementById('editarDireccion').value = data.direccion;
            document.getElementById('editarCiudad').value = data.ciudad;
            document.getElementById('editarDepartamento').value = data.departamento;
            document.getElementById('editarPais').value = data.pais;
            document.getElementById('editarCodigoPostal').value = data.codigo_postal || '';
            document.getElementById('editarTelefono').value = data.telefono || '';
            document.getElementById('editarEmail').value = data.email || '';
            document.getElementById('editarCapacidadM2').value = data.capacidad_m2 || '';
            document.getElementById('editarCapacidadProductos').value = data.capacidad_productos || '';
            document.getElementById('editarEstado').value = data.estado;
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al cargar los datos para edición');
        });
}

function validarFormularioEditar() {
    const nombre = document.getElementById('editarNombre')?.value.trim();
    const codigo = document.getElementById('editarCodigo')?.value.trim();
    const direccion = document.getElementById('editarDireccion')?.value.trim();
    const ciudad = document.getElementById('editarCiudad')?.value.trim();
    const departamento = document.getElementById('editarDepartamento')?.value.trim();

    if (!nombre || !codigo || !direccion || !ciudad || !departamento) {
        alert('Todos los campos requeridos deben estar completos');
        return false;
    }

    return true;
}
