/**
 * MANEJO DE ANULACIÓN DE VENTAS CON MODALES PERSONALIZADOS
 * Reemplaza todos los alert() y confirm() del navegador
 */

/**
 * Mostrar modal para anular venta
 * @param {number} ventaId - ID de la venta
 * @param {string} ventaCodigo - Código de la venta
 * @param {boolean} esAlmacen - True si el usuario es almacén, False si es tienda
 */
function abrirModalAnularVenta(ventaId, ventaCodigo, esAlmacen = true) {
    const titulo = esAlmacen 
        ? 'Anular Venta - Almacén' 
        : 'Solicitar Anulación de Venta - Tienda';
    
    const etiquetaComentario = esAlmacen 
        ? 'Motivo de la anulación' 
        : 'Motivo de la solicitud de anulación';

    ModalSistema.formulario(titulo, [
        {
            name: 'comentario',
            label: etiquetaComentario,
            type: 'textarea',
            placeholder: esAlmacen 
                ? 'Explica por qué anulas esta venta...' 
                : 'Explica por qué solicitas la anulación...',
            required: true
        }
    ], {
        textoConfirmar: esAlmacen ? 'Anular Venta' : 'Enviar Solicitud',
        onSubmit: (datos) => {
            procesarAnulacionVenta(ventaId, ventaCodigo, datos.comentario);
        }
    });
}

/**
 * Procesar la anulación/solicitud de anulación
 */
function procesarAnulacionVenta(ventaId, ventaCodigo, comentario) {
    ModalSistema.cargando('Procesando solicitud...');

    const formData = new FormData();
    formData.append('comentario', comentario);

    fetch(`/ventas/${ventaId}/anular/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': getCSRFToken()
        }
    })
        .then(response => response.json())
        .then(data => {
            ModalSistema.cerrar('modalCargando');
            
            if (data.success) {
                ModalSistema.notificar(
                    'Éxito',
                    data.message,
                    'success',
                    2500
                );
                
                // Recargar página después de 2s
                setTimeout(() => {
                    location.reload();
                }, 2000);
            } else {
                ModalSistema.notificar(
                    'Error',
                    data.error,
                    'danger'
                );
            }
        })
        .catch(error => {
            ModalSistema.cerrar('modalCargando');
            ModalSistema.notificar(
                'Error de Conexión',
                'No se pudo procesar la solicitud. Intenta de nuevo.',
                'danger'
            );
            console.error('Error:', error);
        });
}

/**
 * Obtener token CSRF desde el DOM o cookies
 */
function getCSRFToken() {
    // Intentar desde input oculto en formulario
    const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
    if (csrfInput) {
        return csrfInput.value;
    }

    // Intentar desde cookies
    const cookies = document.cookie.split('; ');
    const csrfCookie = cookies.find(row => row.startsWith('csrftoken='));
    if (csrfCookie) {
        return csrfCookie.split('=')[1];
    }

    return '';
}

/**
 * Mostrar modal de confirmación genérico
 * (Para otras acciones en ventas)
 */
function confirmarAccion(titulo, mensaje, textoBoton = 'Confirmar', callback) {
    ModalSistema.confirmar(titulo, mensaje, {
        tipo: 'warning',
        textoConfirmar: textoBoton,
        textoCancel: 'Cancelar',
        onConfirm: callback,
        onCancel: () => {}
    });
}
