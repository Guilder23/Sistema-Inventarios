// ================================================================
// MODAL ELIMINAR VENDEDOR
// ================================================================

(function() {
    'use strict';
    
    let vendedorIdActual = null;
    
    function inicializarModalEliminar() {
        $(document).on('click', '.btn-eliminar-vendedor', function(e) {
            e.preventDefault();
            vendedorIdActual = $(this).data('vendedor-id');
            const nombreVendedor = $(this).data('vendedor-nombre');
            
            $('#nombreVendedor').text(nombreVendedor);
            $('#modalEliminarVendedor').modal('show');
        });
        
        $(document).on('click', '#btnConfirmarEliminar', function() {
            if (!vendedorIdActual) return;
            
            $.ajax({
                url: '/vendedores/eliminar/' + vendedorIdActual + '/',
                type: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        $('#modalEliminarVendedor').modal('hide');
                        location.reload();
                    }
                },
                error: function() {
                }
            });
        });
    }
    
    // Exponer función para inicialización
    window.inicializarModalEliminar = inicializarModalEliminar;
    
})();
