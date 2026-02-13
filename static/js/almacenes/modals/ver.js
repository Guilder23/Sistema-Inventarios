// ==========================================
// MODAL VER ALMACÉN
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarModalVer();
});

function inicializarModalVer() {
    jQuery('#modalVerAlmacen').on('show.bs.modal', function(e) {
        const button = e.relatedTarget;
        const almacenId = button.getAttribute('data-almacen-id');
        if (almacenId) {
            cargarDetallesAlmacen(almacenId);
        }
    });
}

function cargarDetallesAlmacen(almacenId) {
    fetch('/almacenes/' + almacenId + '/obtener/')
        .then(response => response.json())
        .then(data => {
            document.getElementById('verNombre').textContent = data.nombre;
            document.getElementById('verCodigo').textContent = data.codigo;
            document.getElementById('verDescripcion').textContent = data.descripcion || '-';
            document.getElementById('verDireccion').textContent = data.direccion;
            document.getElementById('verCiudad').textContent = data.ciudad;
            document.getElementById('verDepartamento').textContent = data.departamento;
            document.getElementById('verPais').textContent = data.pais;
            document.getElementById('verCodigoPostal').textContent = data.codigo_postal || '-';
            document.getElementById('verTelefono').textContent = data.telefono || '-';
            document.getElementById('verEmail').textContent = data.email || '-';
            document.getElementById('verCapacidadM2').textContent = data.capacidad_m2 || '-';
            document.getElementById('verCapacidadProductos').textContent = data.capacidad_productos || '-';
            document.getElementById('verCreadoPor').textContent = data.creado_por || '-';
            document.getElementById('verFechaCreacion').textContent = data.fecha_creacion || '-';
            document.getElementById('verFechaActualizacion').textContent = data.fecha_actualizacion || '-';
            
            let estado = document.getElementById('verEstado');
            if (estado) {
                estado.textContent = data.estado_display || (data.estado === 'activo' ? 'Activo' : 'Inactivo');
                estado.className = 'mb-0 estado-almacen estado-' + data.estado;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al cargar los detalles del almacén');
        });
}
