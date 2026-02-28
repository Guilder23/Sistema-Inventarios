(function() {
    'use strict';

    window.inicializarModalVerPedido = function() {
        $(document).on('click', '.btn-ver-pedido', function() {
            const pedidoId = $(this).data('pedido-id');
            cargarPedido(pedidoId);
        });
    };

    function cargarPedido(pedidoId) {
        $.ajax({
            url: `/pedidos/${pedidoId}/obtener/`,
            type: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function(data) {
                renderizarPedido(data);
            },
            error: function() {
                alert('No se pudo cargar el pedido');
            }
        });
    }

    function badgeEstado(estado, texto) {
        return `<span class="badge-estado badge-estado-${estado}">${texto}</span>`;
    }

    function renderizarPedido(data) {
        $('#verPedidoCodigo').html(`<span class="codigo-badge">${data.codigo}</span>`);
        $('#verPedidoEstado').html(badgeEstado(data.estado, data.estado_display));
        $('#verPedidoFecha').text(data.fecha_solicitud);
        $('#verPedidoTienda').text(data.solicitante);
        $('#verPedidoAlmacen').text(data.proveedor);
        $('#verPedidoComentario').text(data.comentario || 'Sin comentario');

        const rows = (data.detalles || []).map(item => `
            <tr>
                <td>${item.codigo}</td>
                <td>${item.nombre}</td>
                <td>${item.cantidad}</td>
            </tr>
        `).join('');

        $('#verPedidoItems').html(rows || '<tr><td colspan="3" class="text-center text-muted">Sin items</td></tr>');

        const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]')?.value || '';
        let acciones = '';

        if (data.acciones?.puede_aceptar) {
            acciones += formAccion(`/pedidos/${data.id}/aceptar/`, 'btn-info', 'fa-check', 'Aceptar Pedido', csrfToken);
        }
        if (data.acciones?.puede_enviar) {
            acciones += formAccion(`/pedidos/${data.id}/enviar/`, 'btn-primary', 'fa-truck', 'Marcar Enviado', csrfToken);
        }
        if (data.acciones?.puede_recibir) {
            acciones += formAccion(`/pedidos/${data.id}/recibir/`, 'btn-success', 'fa-box-open', 'Confirmar Recepción', csrfToken);
        }
        if (data.acciones?.puede_cancelar) {
            acciones += formAccion(`/pedidos/${data.id}/cancelar/`, 'btn-outline-danger', 'fa-times', 'Cancelar Pedido', csrfToken);
        }

        if (!acciones) {
            acciones = '<p class="text-muted mb-0">No hay acciones disponibles.</p>';
        }

        $('#accionesPedido').html(acciones);
    }

    function formAccion(url, claseBtn, icono, texto, csrfToken) {
        return `
            <form method="post" action="${url}" class="mb-2">
                <input type="hidden" name="csrfmiddlewaretoken" value="${csrfToken}">
                <button type="submit" class="btn ${claseBtn} btn-sm btn-block">
                    <i class="fas ${icono}"></i> ${texto}
                </button>
            </form>
        `;
    }
})();
