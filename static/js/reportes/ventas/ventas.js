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
});

// Función para limpiar todos los filtros
function limpiarFiltros() {
    window.location.href = window.location.pathname;
}
