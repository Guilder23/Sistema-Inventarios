// ========================================
// REPORTE DE TRASPASOS - JAVASCRIPT
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Auto-submit al cambiar filtros de select
    const selectFiltros = document.querySelectorAll('#estadoFiltro, #tipoFiltro, #origenFiltro, #destinoFiltro, #creadoPorFiltro, #ordenarFiltro');
    selectFiltros.forEach(select => {
        select.addEventListener('change', function() {
            document.getElementById('filtrosForm').submit();
        });
    });

    // Submit al presionar Enter en campos de texto
    const inputsFiltros = document.querySelectorAll('#buscarInput, #fechaDesdeInput, #fechaHastaInput');
    inputsFiltros.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('filtrosForm').submit();
            }
        });
    });
});

/**
 * Limpia todos los filtros del formulario
 */
function limpiarFiltros() {
    const form = document.getElementById('filtrosForm');
    const inputs = form.querySelectorAll('input, select');
    
    inputs.forEach(input => {
        if (input.type === 'text' || input.type === 'date') {
            input.value = '';
        } else if (input.tagName === 'SELECT') {
            input.selectedIndex = 0;
        }
    });
    
    // Remover parámetros de paginación
    const url = new URL(window.location.href);
    url.search = '';
    window.location.href = url.toString();
}

/**
 * Exporta la tabla a formato CSV para Excel
 */
function exportarTabla() {
    const tabla = document.getElementById('tablaTraspasos');
    const filas = tabla.querySelectorAll('tr');
    let csv = '\ufeff'; // BOM para UTF-8
    
    filas.forEach(fila => {
        const celdas = fila.querySelectorAll('th, td');
        const filaDatos = [];
        
        celdas.forEach(celda => {
            // Limpiar el contenido de la celda
            let texto = celda.innerText.trim();
            // Remover saltos de línea extras y espacios múltiples
            texto = texto.replace(/\n+/g, ' ').replace(/\s+/g, ' ');
            // Escapar comillas dobles
            texto = texto.replace(/"/g, '""');
            // Encapsular en comillas
            filaDatos.push('"' + texto + '"');
        });
        
        csv += filaDatos.join(';') + '\n';
    });
    
    // Crear blob y descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fecha = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_traspasos_${fecha}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
