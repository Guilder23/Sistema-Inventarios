// JavaScript para Reporte de Contenedores y Productos

document.addEventListener('DOMContentLoaded', function() {
    // Obtener referencias a elementos del DOM
    const filtrosForm = document.getElementById('filtrosForm');
    const buscarInput = document.getElementById('buscarInput');
    const contenedorFiltro = document.getElementById('contenedorFiltro');
    const categoriaFiltro = document.getElementById('categoriaFiltro');
    const proveedorFiltro = document.getElementById('proveedorFiltro');
    const estadoFiltro = document.getElementById('estadoFiltro');
    const stockMinimoInput = document.getElementById('stockMinimoInput');
    const fechaDesdeInput = document.getElementById('fechaDesdeInput');
    const fechaHastaInput = document.getElementById('fechaHastaInput');
    const ordenarFiltro = document.getElementById('ordenarFiltro');
    
    // Aplicar filtros en tiempo real
    if (filtrosForm) {
        // Para inputs de texto, usar debounce
        let timeoutId;
        
        if (buscarInput) {
            buscarInput.addEventListener('input', function() {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    filtrosForm.submit();
                }, 600); // Esperar 600ms después de que el usuario deje de escribir
            });
        }
        
        if (stockMinimoInput) {
            stockMinimoInput.addEventListener('input', function() {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    filtrosForm.submit();
                }, 600);
            });
        }
        
        // Para selects, aplicar inmediatamente
        const selectElements = [
            contenedorFiltro,
            categoriaFiltro,
            proveedorFiltro,
            estadoFiltro,
            ordenarFiltro
        ];
        
        selectElements.forEach(select => {
            if (select) {
                select.addEventListener('change', function() {
                    filtrosForm.submit();
                });
            }
        });
        
        // Para inputs de fecha, aplicar al cambiar
        if (fechaDesdeInput) {
            fechaDesdeInput.addEventListener('change', function() {
                filtrosForm.submit();
            });
        }
        
        if (fechaHastaInput) {
            fechaHastaInput.addEventListener('change', function() {
                filtrosForm.submit();
            });
        }
    }
    
    // Inicializar tooltips de Bootstrap (si existen)
    if (typeof $ !== 'undefined' && $.fn.tooltip) {
        $('[data-toggle="tooltip"]').tooltip();
    }
    
    // Resaltar filas al pasar el mouse
    const rows = document.querySelectorAll('.tabla-contenedores tbody tr');
    rows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f8f9fa';
        });
        
        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });
});

/**
 * Limpiar todos los filtros y recargar la página
 */
function limpiarFiltros() {
    // Redirigir a la URL base sin parámetros
    window.location.href = window.location.pathname;
}

/**
 * Exportar tabla a Excel/CSV
 * Usa punto y coma (;) como separador para mejor compatibilidad con Excel en español
 */
function exportarTabla() {
    const tabla = document.getElementById('tablaContenedores');
    
    if (!tabla) {
        return;
    }
    
    // Obtener los datos de la tabla
    let csvContent = '';
    const rows = tabla.querySelectorAll('tr');
    
    rows.forEach((row, rowIndex) => {
        const cols = row.querySelectorAll('th, td');
        const rowData = [];
        
        cols.forEach((col, colIndex) => {
            // Saltar la columna de foto (primera columna)
            if (colIndex === 0) {
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
        
        // Usar punto y coma como separador (mejor para Excel en español)
        csvContent += rowData.join(';') + '\r\n';
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
    link.setAttribute('download', `reporte_contenedores_${fechaStr}_${horaStr}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpiar la URL del objeto
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    // Mostrar mensaje de éxito
    if (typeof mostrarNotificacion === 'function') {
        mostrarNotificacion('Reporte exportado exitosamente', 'success');
    } else {
        alert('Reporte exportado exitosamente');
    }
}

/**
 * Función auxiliar para formatear números con separadores de miles
 */
function formatearNumero(numero) {
    return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Función para imprimir el reporte
 */
function imprimirReporte() {
    window.print();
}

/**
 * Función para copiar datos de una fila específica
 */
function copiarDatosFila(boton) {
    const fila = boton.closest('tr');
    
    if (!fila) {
        return;
    }
    
    const codigo = fila.querySelector('td:nth-child(2)').textContent.trim();
    const producto = fila.querySelector('td:nth-child(3)').textContent.trim();
    const contenedor = fila.querySelector('td:nth-child(5)').textContent.trim();
    const stock = fila.querySelector('td:nth-child(7)').textContent.trim();
    
    const texto = `Código: ${codigo}\nProducto: ${producto}\nContenedor: ${contenedor}\nStock: ${stock}`;
    
    // Copiar al portapapeles
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(() => {
            if (typeof mostrarNotificacion === 'function') {
                mostrarNotificacion('Datos copiados al portapapeles', 'success');
            } else {
                alert('Datos copiados al portapapeles');
            }
        }).catch(err => {
            console.error('Error al copiar:', err);
        });
    } else {
        // Fallback para navegadores antiguos
        const textarea = document.createElement('textarea');
        textarea.value = texto;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            if (typeof mostrarNotificacion === 'function') {
                mostrarNotificacion('Datos copiados al portapapeles', 'success');
            } else {
                alert('Datos copiados al portapapeles');
            }
        } catch (err) {
            console.error('Error al copiar:', err);
        }
        
        document.body.removeChild(textarea);
    }
}

/**
 * Función para obtener filtros activos como objeto
 */
function obtenerFiltrosActivos() {
    const form = document.getElementById('filtrosForm');
    
    if (!form) {
        return {};
    }
    
    const formData = new FormData(form);
    const filtros = {};
    
    for (let [key, value] of formData.entries()) {
        if (value.trim() !== '') {
            filtros[key] = value;
        }
    }
    
    return filtros;
}

/**
 * Función para resaltar texto en la búsqueda
 */
function resaltarBusqueda() {
    const buscar = document.getElementById('buscarInput').value.trim().toLowerCase();
    
    if (!buscar) {
        return;
    }
    
    const celdas = document.querySelectorAll('.tabla-contenedores tbody td');
    
    celdas.forEach(celda => {
        const texto = celda.textContent;
        if (texto.toLowerCase().includes(buscar)) {
            celda.style.backgroundColor = '#fff3cd';
        }
    });
}

/**
 * Validar formato de fechas
 */
function validarFechas() {
    const fechaDesde = document.getElementById('fechaDesdeInput');
    const fechaHasta = document.getElementById('fechaHastaInput');
    
    if (!fechaDesde || !fechaHasta) {
        return true;
    }
    
    const desde = new Date(fechaDesde.value);
    const hasta = new Date(fechaHasta.value);
    
    if (fechaDesde.value && fechaHasta.value && desde > hasta) {
        alert('La fecha "Desde" no puede ser mayor que la fecha "Hasta"');
        return false;
    }
    
    return true;
}

/**
 * Función para manejar el evento de submit del formulario
 */
if (document.getElementById('filtrosForm')) {
    document.getElementById('filtrosForm').addEventListener('submit', function(e) {
        if (!validarFechas()) {
            e.preventDefault();
            return false;
        }
    });
}
