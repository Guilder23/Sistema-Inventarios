// Script principal para traspasos

// Variables globales compartidas entre módulos
let productosSeleccionados = [];
let productosDisponibles = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeCambiarEstado();
});

function initializeCambiarEstado() {
    const botonesEstado = document.querySelectorAll('.cambiar-estado');
    botonesEstado.forEach(boton => {
        boton.addEventListener('click', cambiarEstadoTraspaso);
    });
}

function cambiarEstadoTraspaso(e) {
    e.preventDefault();
    const traspasoId = this.dataset.id;
    const nuevoEstado = this.dataset.estado;
    const boton = this;

    // Confirmación
    Swal.fire({
        title: '¿Está seguro?',
        text: `El estado se cambiará a "${nuevoEstado}"`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            const formData = new FormData();
            formData.append('estado', nuevoEstado);
            formData.append('csrfmiddlewaretoken', document.querySelector('[name=csrfmiddlewaretoken]').value);

            fetch(`/traspasos/${traspasoId}/cambiar-estado/`, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error en la respuesta del servidor');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    Swal.fire(
                        '¡Éxito!',
                        `Estado actualizado a ${data.nuevo_estado}`,
                        'success'
                    ).then(() => {
                        location.reload();
                    });
                } else {
                    Swal.fire('Error', data.error || 'Error al cambiar el estado', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire('Error', error.message, 'error');
            });
        }
    });
}

// Utilidad para formatear dinero
function formatearDinero(cantidad) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(cantidad);
}

// Utilidad para formatear fecha
function formatearFecha(fecha) {
    const opciones = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(fecha).toLocaleDateString('es-CO', opciones);
}
