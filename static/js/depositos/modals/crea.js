// ==========================================
// MODAL CREAR DEPÓSITO
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarModalCrear();
});

function inicializarModalCrear() {
    const formCrearDeposito = document.getElementById('formCrearDeposito');
    
    if (formCrearDeposito) {
        formCrearDeposito.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validar campos requeridos
            const nombre = document.getElementById('crearNombre').value.trim();
            const codigo = document.getElementById('crearCodigo').value.trim();
            const tipo = document.getElementById('crearTipo').value;
            const tienda = document.getElementById('crearTienda').value;
            const direccion = document.getElementById('crearDireccion').value.trim();
            const ciudad = document.getElementById('crearCiudad').value.trim();
            const departamento = document.getElementById('crearDepartamento').value.trim();
            
            if (!nombre || !codigo || !tipo || !tienda || !direccion || !ciudad || !departamento) {
                alert('Por favor, complete todos los campos requeridos');
                return;
            }
            
            // Si la validación pasó, enviar el formulario
            this.submit();
        });
    }
    
    // Limpiar formulario cuando se cierre el modal
    jQuery('#modalCrearDeposito').on('hidden.bs.modal', function() {
        const formCrearDeposito = document.getElementById('formCrearDeposito');
        if (formCrearDeposito) {
            formCrearDeposito.reset();
        }
    });
}
