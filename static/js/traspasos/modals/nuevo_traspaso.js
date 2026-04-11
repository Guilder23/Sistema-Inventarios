// Script unificado para Nuevo Traspaso (Modal Único)

let traspasoConfig = {
    inicializada: false,
    origenesDisponibles: [],
    destinosDisponibles: [],
    productosSeleccionados: [], // Array de {id, nombre, stock, cantidad, etc}
    ubicacionOrigenActual: null
};

let productosDisponiblesCache = [];

function setInlineAlert(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!message) {
        el.style.display = 'none';
        el.textContent = '';
        return;
    }
    el.textContent = message;
    el.style.display = 'block';
}

function clearAlerts() {
    setInlineAlert('nuevoTraspasoAlert', '');
    setInlineAlert('editarCantidadAlert', '');
}

document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('modalNuevoTraspaso');
    if (!modal) return;

    $(modal).on('shown.bs.modal', function() {
        if (!traspasoConfig.inicializada) {
            inicializarEventosModal();
            traspasoConfig.inicializada = true;
        }
        resetearModal();
        cargarOrigenes();
    });

    const btnGuardar = document.getElementById('btnGuardarTraspaso');
    if (btnGuardar) btnGuardar.onclick = finalizarTraspaso;

    // Soporte para modales apilados (modal dentro de modal)
    const modalEditar = document.getElementById('modalEditarCantidad');
    if (modalEditar) {
        $('#modalEditarCantidad').on('shown.bs.modal', function() {
            // Bootstrap 4: el modal principal puede "robar" el foco (enforceFocus)
            // e impedir escribir en el modal hijo. Desactivamos el handler temporalmente.
            $(document).off('focusin.modal');
            $('body').addClass('modal-open');

            const input = document.getElementById('editarCantidadInput');
            if (input) input.focus();
        });
        $('#modalEditarCantidad').on('hidden.bs.modal', function() {
            // Si el modal principal sigue abierto, mantener modal-open
            if ($('#modalNuevoTraspaso').hasClass('show')) {
                $('body').addClass('modal-open');

                // Restaurar enforceFocus del modal principal
                const main = $('#modalNuevoTraspaso').data('bs.modal');
                const restore = main && (main._enforceFocus || main.enforceFocus);
                if (typeof restore === 'function') {
                    restore.call(main);
                }
            }
            setInlineAlert('editarCantidadAlert', '');
        });
    }
});

function inicializarEventosModal() {
    const buscarProducto = document.getElementById('buscarProducto');
    const selectOrigen = document.getElementById('origenTraspaso');
    const selectTipoDestino = document.getElementById('tipoDestino');

    if (buscarProducto) {
        buscarProducto.onkeyup = function() {
            setInlineAlert('nuevoTraspasoAlert', '');
            filtrarProductos(this.value);
        };
    }

    if (selectOrigen) {
        selectOrigen.onchange = function() {
            setInlineAlert('nuevoTraspasoAlert', '');
            traspasoConfig.ubicacionOrigenActual = obtenerOrigenSeleccionado();
            traspasoConfig.productosSeleccionados = [];
            actualizarListaSeleccionados();
            actualizarInfoOrigen();
            cargarDestinosPorOrigen(selectOrigen.value);
            cargarProductos();
        };
    }

    if (selectTipoDestino) {
        selectTipoDestino.onchange = function() {
            setInlineAlert('nuevoTraspasoAlert', '');
            renderDestinosPorTipo(this.value);
        };
    }

    const btnGuardarCantidad = document.getElementById('btnGuardarCantidad');
    if (btnGuardarCantidad && !btnGuardarCantidad.dataset.listenerBound) {
        btnGuardarCantidad.addEventListener('click', guardarCantidadEditada);
        btnGuardarCantidad.dataset.listenerBound = 'true';
    }

    const editarCantidadInput = document.getElementById('editarCantidadInput');
    if (editarCantidadInput && !editarCantidadInput.dataset.listenerBound) {
        editarCantidadInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                guardarCantidadEditada();
            }
        });
        editarCantidadInput.dataset.listenerBound = 'true';
    }
}

function resetearModal() {
    clearAlerts();
    traspasoConfig.productosSeleccionados = [];
    productosDisponiblesCache = [];

    const form = document.getElementById('formNuevoTraspaso');
    if (form) form.reset();

    const listaProductos = document.getElementById('listaProductos');
    if (listaProductos) {
        listaProductos.innerHTML = `
            <div class="text-center p-5 text-muted">
                <i class="fas fa-box-open fa-3x mb-3"></i>
                <p>Seleccione un origen para ver productos disponibles</p>
            </div>
        `;
    }

    const tipoDestino = document.getElementById('tipoDestino');
    const destino = document.getElementById('destino');
    if (tipoDestino) tipoDestino.innerHTML = '<option value="">Seleccionar tipo...</option>';
    if (destino) destino.innerHTML = '<option value="">Seleccionar destino...</option>';

    generarCodigoYFecha();
    actualizarInfoOrigen();
    actualizarListaSeleccionados();
    prepararResumen();
}

function generarCodigoYFecha() {
    const codigoEl = document.getElementById('codigo');
    const fechaEl = document.getElementById('fechaCreacion');
    if (codigoEl) codigoEl.value = `TRP-${Date.now()}`;
    if (fechaEl) fechaEl.value = new Date().toLocaleString();
}

function actualizarInfoOrigen() {
    const origenDisplay = document.getElementById('origenDisplay');
    const selectOrigen = document.getElementById('origenTraspaso');
    if (!origenDisplay || !selectOrigen) return;
    origenDisplay.value = selectOrigen.value ? selectOrigen.options[selectOrigen.selectedIndex].text : '';
}

function cargarOrigenes() {
    const selectOrigen = document.getElementById('origenTraspaso');
    if (!selectOrigen) return;

    fetch('/traspasos/api/origenes/')
        .then(res => res.json())
        .then(data => {
            traspasoConfig.origenesDisponibles = data;
            selectOrigen.innerHTML = '<option value="">Seleccionar origen...</option>';
            data.forEach(origen => {
                const opt = document.createElement('option');
                opt.value = origen.id;
                opt.textContent = `${origen.nombre_ubicacion || 'Sin nombre'} (${origen.rol || 'Sin rol'})`;
                selectOrigen.appendChild(opt);
            });
            if (data.length === 1) {
                selectOrigen.value = data[0].id;
                selectOrigen.dispatchEvent(new Event('change'));
            }
        });
}

function cargarProductos() {
    const listContainer = document.getElementById('listaProductos');
    const origenId = document.getElementById('origenTraspaso').value;

    if (!origenId) {
        listContainer.innerHTML = '<div class="text-center p-3 text-muted">Seleccione un origen</div>';
        return;
    }

    listContainer.innerHTML = '<div class="text-center p-3"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

    fetch(`/traspasos/api/productos/?origen_id=${origenId}`)
        .then(res => res.json())
        .then(data => {
            productosDisponiblesCache = Array.isArray(data) ? data : [];
            renderListaProductos(productosDisponiblesCache);
        })
        .catch(() => {
            productosDisponiblesCache = [];
            if (listContainer) {
                listContainer.innerHTML = '<div class="text-center p-3 text-muted">No se pudieron cargar productos.</div>';
            }
        });
}

function cargarDestinosPorOrigen(origenId) {
    if (!origenId) return;
    const selectTipo = document.getElementById('tipoDestino');
    const selectDestino = document.getElementById('destino');
    if (!selectTipo || !selectDestino) return;

    selectTipo.innerHTML = '<option value="">Seleccionar tipo...</option>';
    selectDestino.innerHTML = '<option value="">Seleccionar destino...</option>';

    fetch(`/traspasos/api/destinos/?origen_id=${origenId}`)
        .then(res => res.json())
        .then(data => {
            traspasoConfig.destinosDisponibles = Array.isArray(data) ? data : [];
            const tipos = [...new Set(traspasoConfig.destinosDisponibles.filter(d => d.rol).map(d => d.rol))];

            tipos.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
                selectTipo.appendChild(opt);
            });

            if (tipos.length === 1) {
                selectTipo.value = tipos[0];
                renderDestinosPorTipo(tipos[0]);
            }
        })
        .catch(() => {
            selectTipo.innerHTML = '<option value="">Error al cargar</option>';
            selectDestino.innerHTML = '<option value="">Error al cargar</option>';
        });
}

function renderListaProductos(productos) {
    const listContainer = document.getElementById('listaProductos');
    if (productos.length === 0) {
        listContainer.innerHTML = '<div class="text-center p-3 text-muted">No se encontraron productos</div>';
        return;
    }

    listContainer.innerHTML = productos.map(p => `
        <div class="producto-item d-flex justify-content-between align-items-center border-bottom p-2">
            <div>
                <div class="text-muted" style="font-size: 0.85rem;">${p.codigo || ''}</div>
                <strong>${p.nombre}</strong><br>
                <small class="text-muted">Stock: ${p.stock}</small>
            </div>
            <div class="d-flex align-items-center">
                <input type="number" class="form-control form-control-sm mr-2" style="width: 70px;" value="1" min="1" max="${p.stock}" id="cant-${p.id}">
                <button type="button" class="btn btn-sm btn-success" onclick="agregarProducto(${p.id})">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function agregarProducto(id) {
    const producto = productosDisponiblesCache.find(p => p.id === id);
    const cantInput = document.getElementById(`cant-${id}`);
    const cantidad = parseInt(cantInput.value);

    if (!producto) {
        setInlineAlert('nuevoTraspasoAlert', 'Producto no encontrado.');
        return;
    }

    if (isNaN(cantidad) || cantidad <= 0 || cantidad > producto.stock) {
        setInlineAlert('nuevoTraspasoAlert', `Cantidad inválida para "${producto.nombre}". Máximo: ${producto.stock}.`);
        return;
    }

    const existe = traspasoConfig.productosSeleccionados.find(p => p.id === id);
    if (existe) {
        existe.cantidad += cantidad;
        if (existe.cantidad > producto.stock) existe.cantidad = producto.stock;
    } else {
        traspasoConfig.productosSeleccionados.push({
            ...producto,
            cantidad: cantidad
        });
    }
    actualizarListaSeleccionados();
    setInlineAlert('nuevoTraspasoAlert', '');
}

function actualizarListaSeleccionados() {
    const container = document.getElementById('productosSeleccionados');
    if (traspasoConfig.productosSeleccionados.length === 0) {
        container.innerHTML = '<div class="text-center p-5 text-muted"><p>No hay productos seleccionados</p></div>';
        prepararResumen();
        return;
    }

    container.innerHTML = traspasoConfig.productosSeleccionados.map((p, index) => `
        <div class="seleccionado-item bg-white border rounded p-2 mb-2 d-flex justify-content-between align-items-center">
            <div>
                <span class="font-weight-bold">${p.nombre}</span><br>
                <small>Cantidad: ${p.cantidad}</small>
            </div>
            <div class="d-flex align-items-center" style="gap: 6px;">
                <button type="button" class="btn btn-sm btn-link text-primary" title="Editar cantidad" onclick="abrirModalEditarCantidad(${index})">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn btn-sm btn-link text-danger" title="Eliminar" onclick="removerProducto(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    prepararResumen();
}

function removerProducto(index) {
    traspasoConfig.productosSeleccionados.splice(index, 1);
    actualizarListaSeleccionados();
    setInlineAlert('nuevoTraspasoAlert', '');
}

function abrirModalEditarCantidad(index) {
    const item = traspasoConfig.productosSeleccionados[index];
    if (!item) return;

    const max = parseInt(item.stock ?? 0, 10) || 0;
    const actual = parseInt(item.cantidad ?? 0, 10) || 0;

    const titulo = document.getElementById('modalEditarCantidadTitulo');
    const idx = document.getElementById('editarCantidadIndex');
    const input = document.getElementById('editarCantidadInput');
    const help = document.getElementById('editarCantidadHelp');

    if (titulo) titulo.textContent = `Editar cantidad: ${item.nombre}`;
    if (idx) idx.value = String(index);
    if (input) {
        input.value = String(actual);
        input.min = '1';
        input.max = String(max);
    }
    if (help) help.textContent = max ? `Máximo disponible: ${max}` : '';

    setInlineAlert('editarCantidadAlert', '');

    // Mostrar modal pequeño sin backdrop extra para evitar oscurecido/bloqueo
    $('#modalEditarCantidad').modal({ backdrop: false, keyboard: true, focus: true, show: true });

    setTimeout(() => {
        if (input) input.focus();
    }, 150);
}

function guardarCantidadEditada() {
    const idxEl = document.getElementById('editarCantidadIndex');
    const input = document.getElementById('editarCantidadInput');
    if (!idxEl || !input) return;

    const index = parseInt(idxEl.value, 10);
    const item = traspasoConfig.productosSeleccionados[index];
    if (!item) return;

    const max = parseInt(item.stock ?? 0, 10) || 0;
    const nueva = parseInt(input.value, 10);
    if (isNaN(nueva) || nueva < 1 || (max > 0 && nueva > max)) {
        setInlineAlert('editarCantidadAlert', `Cantidad inválida. Debe estar entre 1 y ${max}.`);
        return;
    }

    item.cantidad = nueva;
    actualizarListaSeleccionados();
    $('#modalEditarCantidad').modal('hide');
}

function renderDestinosPorTipo(tipo) {
    const selectDestino = document.getElementById('destino');
    const filtrados = traspasoConfig.destinosDisponibles.filter(d => d.rol === tipo);
    selectDestino.innerHTML = '<option value="">Seleccionar destino...</option>';
    filtrados.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.nombre_ubicacion || 'Sin nombre';
        selectDestino.appendChild(opt);
    });
}

function prepararResumen() {
    const res = document.getElementById('resumenProductos');
    if (!res) return;

    if (!traspasoConfig.productosSeleccionados.length) {
        res.innerHTML = '<div class="text-muted">Sin productos seleccionados.</div>';
        return;
    }

    const fmt = (n) => {
        const num = Number(n);
        if (Number.isNaN(num)) return '0.00';
        return num.toFixed(2);
    };

    const total = traspasoConfig.productosSeleccionados.reduce((acc, p) => {
        const pu = Number(p.precio_unidad ?? 0) || 0;
        const cant = Number(p.cantidad ?? 0) || 0;
        return acc + (pu * cant);
    }, 0);

    res.innerHTML = `
        <div class="table-responsive">
            <table class="table table-sm mb-0">
                <thead>
                    <tr>
                        <th style="width: 120px;">Código</th>
                        <th>Producto</th>
                        <th class="text-right" style="width: 90px;">Stock</th>
                        <th class="text-right" style="width: 90px;">Cant.</th>
                        <th class="text-right" style="width: 110px;">P/U</th>
                        <th class="text-right" style="width: 110px;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${traspasoConfig.productosSeleccionados.map(p => {
                        const pu = Number(p.precio_unidad ?? 0) || 0;
                        const cant = Number(p.cantidad ?? 0) || 0;
                        const sub = pu * cant;
                        return `
                            <tr>
                                <td>${p.codigo || ''}</td>
                                <td>${p.nombre}</td>
                                <td class="text-right">${p.stock ?? ''}</td>
                                <td class="text-right">${p.cantidad}</td>
                                <td class="text-right">${fmt(pu)}</td>
                                <td class="text-right">${fmt(sub)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <th colspan="5" class="text-right">Total</th>
                        <th class="text-right">${fmt(total)}</th>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}

function finalizarTraspaso() {
    const form = document.getElementById('formNuevoTraspaso');
    if (!traspasoConfig.productosSeleccionados.length) {
        setInlineAlert('nuevoTraspasoAlert', 'Debe seleccionar al menos un producto.');
        return;
    }
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const payload = {
        tipo: document.getElementById('tipoTraspaso').value,
        origen: document.getElementById('origenTraspaso').value,
        destino: document.getElementById('destino').value,
        comentario: document.getElementById('comentario').value,
        productos: traspasoConfig.productosSeleccionados.map(p => ({
            id: p.id,
            cantidad: p.cantidad
        })),
        csrfmiddlewaretoken: document.querySelector('[name=csrfmiddlewaretoken]').value
    };

    fetch('/traspasos/crear/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': payload.csrfmiddlewaretoken },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            location.reload();
        } else {
            setInlineAlert('nuevoTraspasoAlert', data.message || 'Ocurrió un error al crear el traspaso.');
        }
    })
    .catch(() => setInlineAlert('nuevoTraspasoAlert', 'Error al procesar el traspaso.'));
}

function filtrarProductos(query) {
    if (!productosDisponiblesCache) return;
    const q = query.toLowerCase();
    const filtrados = productosDisponiblesCache.filter(p =>
        (p.nombre && p.nombre.toLowerCase().includes(q)) ||
        (p.codigo && p.codigo.toLowerCase().includes(q))
    );
    renderListaProductos(filtrados);
}

function obtenerOrigenSeleccionado() {
    const id = parseInt(document.getElementById('origenTraspaso').value);
    return traspasoConfig.origenesDisponibles.find(o => o.id === id);
}
