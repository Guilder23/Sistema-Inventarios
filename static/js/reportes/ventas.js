// JavaScript para el reporte de ventas

// Auto-aplicar filtros al cambiar cualquier select o input
document.querySelectorAll('#filtrosForm select, #filtrosForm input[type="date"]').forEach(element => {
    element.addEventListener('change', function() {
        document.getElementById('filtrosForm').submit();
    });
});

// Aplicar filtro de búsqueda al presionar Enter
document.getElementById('buscarInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('filtrosForm').submit();
    }
});

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

// Función para limpiar todos los filtros
function limpiarFiltros() {
    window.location.href = window.location.pathname;
}

/**
 * Exportar tabla a Excel/CSV
 * Usa punto y coma (;) como separador para mejor compatibilidad con Excel en español
 */
function exportarTabla() {
    const tabla = document.getElementById('tablaVentas');
    
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
    link.setAttribute('download', `reporte_ventas_${fechaStr}_${horaStr}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpiar la URL del objeto
    setTimeout(() => URL.revokeObjectURL(url), 100);
}
