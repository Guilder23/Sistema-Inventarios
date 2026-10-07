/**
 * modal_exportar.js - Lógica para el modal de exportación de ventas
 * Gestiona la selección de columnas y la exportación a CSV/Excel
 */

document.addEventListener('DOMContentLoaded', function() {
    // Configurar listeners para checkboxes de columnas cuando el modal exista
    const configurarCheckboxes = function() {
        const checkboxesColumnas = document.querySelectorAll('.columna-exportar');
        const checkboxTodas = document.getElementById('colTodas');
        
        if (checkboxesColumnas.length > 0 && checkboxTodas) {
            // Remover listeners anteriores si existen
            checkboxesColumnas.forEach(checkbox => {
                const newCheckbox = checkbox.cloneNode(true);
                checkbox.parentNode.replaceChild(newCheckbox, checkbox);
            });
            
            // Agregar nuevos listeners
            document.querySelectorAll('.columna-exportar').forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    actualizarCheckboxTodas();
                });
            });
            
            // Inicializar estado del checkbox "Seleccionar Todas"
            actualizarCheckboxTodas();
        }
    };
    
    // Listener para cuando se abre el modal
    if (typeof $ !== 'undefined') {
        $('#modalExportar').on('shown.bs.modal', function() {
            configurarCheckboxes();
        });
        
        // Listener para cuando se cierra el modal
        $('#modalExportar').on('hidden.bs.modal', function() {
            // Restaurar foco al botón de exportar
            const botonExportar = document.querySelector('.btn-accion.btn-exportar');
            if (botonExportar) {
                setTimeout(() => botonExportar.focus(), 100);
            }
        });
    } else {
        // Para Bootstrap 5 sin jQuery
        const modalElement = document.getElementById('modalExportar');
        if (modalElement) {
            modalElement.addEventListener('shown.bs.modal', function() {
                configurarCheckboxes();
            });
            
            modalElement.addEventListener('hidden.bs.modal', function() {
                // Restaurar foco al botón de exportar
                const botonExportar = document.querySelector('.btn-accion.btn-exportar');
                if (botonExportar) {
                    setTimeout(() => botonExportar.focus(), 100);
                }
            });
        }
    }
});

/**
 * Seleccionar o deseleccionar todas las columnas
 */
function seleccionarTodasColumnas(checked) {
    const checkboxes = document.querySelectorAll('.columna-exportar');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
}

/**
 * Actualizar el estado del checkbox "Seleccionar Todas"
 */
function actualizarCheckboxTodas() {
    const checkboxes = document.querySelectorAll('.columna-exportar');
    const checkboxTodas = document.getElementById('colTodas');
    
    if (!checkboxTodas || checkboxes.length === 0) return;
    
    const todasSeleccionadas = Array.from(checkboxes).every(cb => cb.checked);
    const algunaSeleccionada = Array.from(checkboxes).some(cb => cb.checked);
    
    checkboxTodas.checked = todasSeleccionadas;
    checkboxTodas.indeterminate = !todasSeleccionadas && algunaSeleccionada;
}

/**
 * Confirmar y ejecutar la exportación con las columnas seleccionadas
 */
function confirmarExportacion() {
    // Obtener columnas seleccionadas
    const checkboxes = document.querySelectorAll('.columna-exportar:checked');
    
    if (checkboxes.length === 0) {
        alert('Por favor, selecciona al menos una columna para exportar.');
        return;
    }
    
    // Obtener los índices de las columnas seleccionadas
    const columnasSeleccionadas = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    // Cerrar el modal de forma segura
    const modal = document.getElementById('modalExportar');
    if (modal) {
        // Intentar con jQuery/Bootstrap primero
        if (typeof $ !== 'undefined' && $.fn.modal) {
            $('#modalExportar').modal('hide');
        } else if (typeof bootstrap !== 'undefined') {
            // Bootstrap 5 nativo
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        } else {
            // Fallback manual
            modal.classList.remove('show');
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            modal.removeAttribute('aria-modal');
            document.body.classList.remove('modal-open');
            
            // Remover backdrop si existe
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
        }
    }
    
    // Ejecutar la exportación con un pequeño delay para evitar problemas de foco
    setTimeout(() => {
        exportarTablaVentas(columnasSeleccionadas);
    }, 300);
}

/**
 * Exportar tabla de ventas a Excel/CSV
 * Usa punto y coma (;) como separador para mejor compatibilidad con Excel en español
 */
function exportarTablaVentas(columnasSeleccionadas = null) {
    const tabla = document.getElementById('tablaVentas');
    
    if (!tabla) {
        return;
    }
    
    // Si no se especifican columnas, exportar todas
    if (!columnasSeleccionadas) {
        // La tabla tiene 13 columnas: 0-11 son datos y 12 es Acciones.
        columnasSeleccionadas = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    }
    
    const url = new URL(tabla.dataset.exportUrl, window.location.origin);
    const parametros = new URLSearchParams(window.location.search);
    parametros.delete('page');
    parametros.set('columnas', columnasSeleccionadas.join(','));
    url.search = parametros.toString();

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('No se pudo generar el reporte.');
            return response.blob();
        })
        .then(blob => {
            const enlace = document.createElement('a');
            const urlBlob = URL.createObjectURL(blob);
            enlace.href = urlBlob;
            enlace.download = 'reporte_ventas.csv';
            enlace.click();
            URL.revokeObjectURL(urlBlob);
        })
        .catch(error => {
            console.error(error);
            alert('No se pudo exportar el reporte de ventas.');
        });
}
