/* Edición de productos de un traspaso que aún no fue enviado. */
(() => {
    const config = window.traspasoEditable;
    const boton = document.getElementById('btnEditarProductos');
    if (!config || !boton) return;

    let productos = config.productos.map(producto => ({ ...producto }));
    let disponibles = [];
    const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
    const csrfToken = () => document.querySelector('[name=csrfmiddlewaretoken]').value;
    const textoCajas = producto => {
        const unidades = Number(producto.unidades_por_caja) || 1;
        const cajas = (Number(producto.cantidad) || 0) / unidades;
        return `${unidades} und. x caja = ${Number.isInteger(cajas) ? cajas : cajas.toFixed(2)} cj`;
    };

    function render() {
        const filas = productos.map((p, index) => `<tr><td>${escapeHtml(p.codigo)}</td><td>${escapeHtml(p.nombre)}</td>
            <td style="width:170px"><input class="form-control form-control-sm cantidad-traspaso" data-index="${index}" type="number" min="1" value="${p.cantidad}"><small class="text-muted cajas-producto" data-index="${index}">${textoCajas(p)}</small></td>
            <td><button class="btn btn-sm btn-outline-danger eliminar-producto" data-index="${index}" type="button"><i class="fas fa-trash"></i></button></td></tr>`).join('');
        document.getElementById('filasEditarTraspaso').innerHTML = filas || '<tr><td colspan="4" class="text-center text-muted">Agregue un producto</td></tr>';
    }
    function renderBusqueda(modal, texto) {
        const termino = texto.trim().toLowerCase();
        const resultados = disponibles.filter(p => !productos.some(seleccionado => seleccionado.id === p.id) && (!termino || String(p.nombre || '').toLowerCase().includes(termino) || String(p.codigo || '').toLowerCase().includes(termino)));
        const contenedor = modal.querySelector('#resultadosBusquedaTraspaso');
        contenedor.innerHTML = resultados.length ? resultados.map(p => `<div class="d-flex justify-content-between align-items-center border-bottom p-2"><div><strong>${escapeHtml(p.nombre)}</strong><br><small class="text-muted">${escapeHtml(p.codigo)} · Disponible: ${p.stock} · ${p.unidades_por_caja || 1} und. x caja</small></div><button type="button" class="btn btn-sm btn-success agregar-producto-busqueda" data-id="${p.id}"><i class="fas fa-plus"></i></button></div>`).join('') : '<div class="p-3 text-center text-muted">No hay productos disponibles para añadir</div>';
    }
    function abrir() {
        const modal = document.createElement('div');
        modal.className = 'modal fade'; modal.id = 'modalEditarProductosTraspaso'; modal.tabIndex = -1;
        modal.innerHTML = `<div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content"><div class="modal-header bg-primary text-white"><h5 class="modal-title">Editar productos del traspaso</h5><button type="button" class="close text-white" data-dismiss="modal">&times;</button></div><div class="modal-body"><div id="editarTraspasoError" class="alert alert-danger d-none"></div><div class="form-group mb-2"><label for="buscarProductoTraspaso">Buscar producto para añadir</label><div class="input-group"><div class="input-group-prepend"><span class="input-group-text"><i class="fas fa-search"></i></span></div><input id="buscarProductoTraspaso" class="form-control" placeholder="Buscar por nombre o código"></div></div><div id="resultadosBusquedaTraspaso" class="border rounded mb-3" style="max-height:180px; overflow-y:auto"></div><table class="table table-bordered"><thead><tr><th>Código</th><th>Producto</th><th>Cantidad</th><th></th></tr></thead><tbody id="filasEditarTraspaso"></tbody></table></div><div class="modal-footer"><button class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button id="guardarProductosTraspaso" class="btn btn-primary"><i class="fas fa-save"></i> Guardar cambios</button></div></div></div>`;
        document.body.appendChild(modal);
        $(modal).on('hidden.bs.modal', () => modal.remove()).modal('show');
        render(); cargarDisponibles(modal);
        modal.querySelector('#filasEditarTraspaso').addEventListener('input', event => {
            if (!event.target.matches('.cantidad-traspaso')) return;
            productos[event.target.dataset.index].cantidad = event.target.value;
            modal.querySelector(`.cajas-producto[data-index="${event.target.dataset.index}"]`).textContent = textoCajas(productos[event.target.dataset.index]);
        });
        modal.querySelector('#filasEditarTraspaso').addEventListener('click', event => { const eliminar = event.target.closest('.eliminar-producto'); if (eliminar) { productos.splice(eliminar.dataset.index, 1); render(); renderBusqueda(modal, modal.querySelector('#buscarProductoTraspaso').value); } });
        modal.querySelector('#buscarProductoTraspaso').addEventListener('input', event => renderBusqueda(modal, event.target.value));
        modal.querySelector('#resultadosBusquedaTraspaso').addEventListener('click', event => { const agregar = event.target.closest('.agregar-producto-busqueda'); const producto = agregar && disponibles.find(p => p.id === Number(agregar.dataset.id)); if (producto) { productos.push({ ...producto, cantidad: 1 }); render(); renderBusqueda(modal, modal.querySelector('#buscarProductoTraspaso').value); } });
        modal.querySelector('#guardarProductosTraspaso').addEventListener('click', () => guardar(modal));
    }
    function cargarDisponibles(modal) { fetch(`/traspasos/api/productos/?origen_id=${config.origenId}`).then(r => r.json()).then(data => { disponibles = Array.isArray(data) ? data : []; renderBusqueda(modal, ''); }); }
    function guardar(modal) {
        const error = modal.querySelector('#editarTraspasoError'); const payload = productos.map(p => ({ id: p.id, cantidad: Number(p.cantidad) }));
        if (!payload.length || payload.some(p => !Number.isInteger(p.cantidad) || p.cantidad < 1)) { error.textContent = 'Debe dejar al menos un producto con cantidad válida.'; error.classList.remove('d-none'); return; }
        fetch(`/traspasos/${config.id}/editar-productos/`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() }, body: JSON.stringify({ productos: payload }) }).then(r => r.json()).then(data => { if (!data.success) throw new Error(data.error || 'No se pudo actualizar'); $(modal).modal('hide'); location.reload(); }).catch(err => { error.textContent = err.message; error.classList.remove('d-none'); });
    }
    boton.addEventListener('click', abrir);
})();
