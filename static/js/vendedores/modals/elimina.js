// ================================================================
// MODAL ELIMINAR VENDEDOR
// ================================================================

(function() {
    'use strict';
    
    let vendedorIdActual = null;
    
    $(document).ready(function() {
        inicializarModalEliminar();
    });
    
    function inicializarModalEliminar() {
        $(document).on('click', '.btn-eliminar-vendedor', function(e) {
            e.preventDefault();
            vendedorIdActual = $(this).data('vendedor-id');
            const nombreVendedor = $(this).data('vendedor-nombre');
            
            $('#nombreVendedor').text(nombreVendedor);
            $('#modalEliminarVendedor').modal('show');
        });
        
        $(document).on('submit', '#formEliminarVendedor', function(e) {
            if (vendedorIdActual) {
                const form = $(this);
                form.attr('action', '/vendedores/eliminar/' + vendedorIdActual + '/');
            }
        });
    }
    
})();
