// JavaScript para el reporte de ventas

document.addEventListener('DOMContentLoaded', function() {
    // Auto-aplicar filtros al cambiar cualquier select o input
    document.querySelectorAll('#filtrosForm select, #filtrosForm input[type="date"]').forEach(element => {
        element.addEventListener('change', function() {
            document.getElementById('filtrosForm').submit();
        });
    });

    // Aplicar filtro de búsqueda al presionar Enter
    const buscarInput = document.getElementById('buscarInput');
    if (buscarInput) {
        buscarInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('filtrosForm').submit();
            }
        });
    }

    // Aplicar filtros de monto al presionar Enter
    ['montoMinimoInput', 'montoMaximoInput'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('filtrosForm').submit();
                }
            });
        }
    });

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

// Función para limpiar todos los filtros
function limpiarFiltros() {
    window.location.href = window.location.pathname;
}

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
        exportarTabla(columnasSeleccionadas);
    }, 300);
}

/**
 * Exportar tabla a Excel/CSV
 * Usa punto y coma (;) como separador para mejor compatibilidad con Excel en español
 */
function exportarTabla(columnasSeleccionadas = null) {
    const tabla = document.getElementById('tablaVentas');
    
    if (!tabla) {
        return;
    }
    
    // Si no se especifican columnas, exportar todas
    if (!columnasSeleccionadas) {
        columnasSeleccionadas = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    }
    
    // Obtener los datos de la tabla
    let csvContent = '';
    const rows = tabla.querySelectorAll('tr');
    
    rows.forEach((row, rowIndex) => {
        const cols = row.querySelectorAll('th, td');
        const rowData = [];
        
        cols.forEach((col, colIndex) => {
            // Solo incluir si la columna está en las seleccionadas
            if (!columnasSeleccionadas.includes(colIndex)) {
                return;
            }
            
            // Obtener el texto limpio
            let text = col.textContent.trim();
            
            // Limpiar espacios en blanco múltiples y saltos de línea
            text = text.replace(/\s+/g, ' ');
            text = text.replace(/\n/g, ' ');
            
            // Escapar comillas dobles
            text = text.replace(/"/g, '""');
            
            // Siempre encerrar en comillas para mayor seguridad
            text = `"${text}"`;
            
            rowData.push(text);
        });
        
        // Solo agregar la fila si tiene datos
        if (rowData.length > 0) {
            // Usar punto y coma como separador (mejor para Excel en español)
            csvContent += rowData.join(';') + '\r\n';
        }
    });
    
    // Crear blob con BOM UTF-8 para correcta visualización de caracteres especiales
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Obtener fecha y hora actual para el nombre del archivo
    const fecha = new Date();
    const fechaStr = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    const horaStr = `${String(fecha.getHours()).padStart(2, '0')}${String(fecha.getMinutes()).padStart(2, '0')}`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_ventas_${fechaStr}_${horaStr}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpiar la URL del objeto
    setTimeout(() => URL.revokeObjectURL(url), 100);
}
