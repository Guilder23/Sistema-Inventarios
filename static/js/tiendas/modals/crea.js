// ==========================================
// MODAL CREAR TIENDA
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarModalCrear();
});

function inicializarModalCrear() {
    const formCrearTienda = document.getElementById('formCrearTienda');
    
    if (formCrearTienda) {
        formCrearTienda.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validar campos requeridos
            const nombre = document.getElementById('crearNombre').value.trim();
            const codigo = document.getElementById('crearCodigo').value.trim();
            const tipo = document.getElementById('crearTipo').value;
            const almacen = document.getElementById('crearAlmacen').value;
            const direccion = document.getElementById('crearDireccion').value.trim();
            const ciudad = document.getElementById('crearCiudad').value.trim();
            const departamento = document.getElementById('crearDepartamento').value.trim();
            
            if (!nombre || !codigo || !tipo || !almacen || !direccion || !ciudad || !departamento) {
                alert('Por favor, complete todos los campos requeridos');
                return;
            }
            
            // Si la validación pasó, enviar el formulario
            this.submit();
        });
    }
    
    // Limpiar formulario cuando se cierre el modal
    jQuery('#modalCrearTienda').on('hidden.bs.modal', function() {
        const formCrearTienda = document.getElementById('formCrearTienda');
        if (formCrearTienda) {
            formCrearTienda.reset();
        }
    });
}
