// ==========================================
// MODAL CREAR ALMACÉN
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarModalCrear();
});

function inicializarModalCrear() {
    const formCrearAlmacen = document.getElementById('formCrearAlmacen');
    if (formCrearAlmacen) {
        formCrearAlmacen.addEventListener('submit', function(e) {
            if (!validarFormularioCrear()) {
                e.preventDefault();
            }
        });
    }
    
    // Limpiar formulario cuando se cierre el modal
    jQuery('#modalCrearAlmacen').on('hidden.bs.modal', function() {
        const form = document.getElementById('formCrearAlmacen');
        if (form) {
            form.reset();
        }
    });
}

function validarFormularioCrear() {
    const nombre = document.getElementById('crearNombre')?.value.trim();
    const direccion = document.getElementById('crearDireccion')?.value.trim();
    const ciudad = document.getElementById('crearCiudad')?.value.trim();
    const departamento = document.getElementById('crearDepartamento')?.value.trim();

    if (!nombre || !direccion || !ciudad || !departamento) {
        alert('Todos los campos requeridos deben estar completos');
        return false;
    }

    return true;
}
