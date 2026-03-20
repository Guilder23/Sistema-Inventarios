document.addEventListener('DOMContentLoaded', function() {
    if (typeof $ !== 'undefined') {
        $('#modalImprimir').on('shown.bs.modal', function() {
            inicializarVistaPreviaVentas();
        });
    } else {
        const modal = document.getElementById('modalImprimir');
        if (modal) {
            modal.addEventListener('shown.bs.modal', function() {
                inicializarVistaPreviaVentas();
            });
        }
    }

    const checkboxes = document.querySelectorAll('.columna-imprimir');
    checkboxes.forEach(chk => {
        chk.addEventListener('change', function() {
            actualizarVistaPreviaVentas();
        });
    });

    const btnOrientacion = document.getElementById('btnCambiarOrientacion');
    if (btnOrientacion) {
        btnOrientacion.addEventListener('click', function() {
            const actual = window.orientacionManualVentas || 'landscape';
            if (actual === 'landscape' || (window.orientacionManualVentas === null && esHorizontalAutoVentas())) {
                window.orientacionManualVentas = 'portrait';
            } else {
                window.orientacionManualVentas = 'landscape';
            }
            actualizarOrientacionPaginaVentas();
        });
    }
});

window.orientacionManualVentas = null;

function esHorizontalAutoVentas() {
    return document.querySelectorAll('.columna-imprimir:checked').length > 7;
}

function inicializarVistaPreviaVentas() {
    const tablaOriginal = document.getElementById('tablaVentas');
    const contenedorPreview = document.querySelector('.preview-paper .table-responsive');
    if (!tablaOriginal || !contenedorPreview) return;

    contenedorPreview.innerHTML = '';

    const tablaClonada = tablaOriginal.cloneNode(true);
    tablaClonada.id = 'tablaImpresionVentas';
    tablaClonada.classList.remove('table-hover', 'mb-0');
    tablaClonada.classList.add('table-sm', 'table-bordered');
    tablaClonada.style.width = '100%';

    const estilosAncho = tablaClonada.querySelectorAll('[style*="width:"]');
    estilosAncho.forEach(el => {
        el.style.width = '';
    });

    const iconos = tablaClonada.querySelectorAll('.fa, .fas, .far');
    iconos.forEach(icono => icono.remove());

    const botones = tablaClonada.querySelectorAll('.btn, button');
    botones.forEach(btn => btn.remove());

    contenedorPreview.appendChild(tablaClonada);

    actualizarVistaPreviaVentas();
    actualizarOrientacionPaginaVentas();
}

function actualizarVistaPreviaVentas() {
    const tabla = document.getElementById('tablaImpresionVentas');
    if (!tabla) return;

    const checkedBoxes = Array.from(document.querySelectorAll('.columna-imprimir:checked'));
    const indicesVisibles = new Set();
    checkedBoxes.forEach(chk => {
        const idx = parseInt(chk.value, 10);
        if (!isNaN(idx)) indicesVisibles.add(idx);
    });

    const filas = tabla.querySelectorAll('tr');
    filas.forEach(fila => {
        const celdas = fila.children;
        for (let i = 0; i < celdas.length; i++) {
            celdas[i].style.display = indicesVisibles.has(i) ? '' : 'none';
        }
    });

    if (window.orientacionManualVentas === null) {
        actualizarOrientacionPaginaVentas(checkedBoxes.length);
    } else {
        actualizarOrientacionPaginaVentas();
    }
}

function actualizarOrientacionPaginaVentas(numColumnas = null) {
    let horizontal = false;

    if (window.orientacionManualVentas !== null) {
        horizontal = window.orientacionManualVentas === 'landscape';
    } else {
        if (numColumnas === null) numColumnas = document.querySelectorAll('.columna-imprimir:checked').length;
        horizontal = numColumnas > 7;
    }

    const btnTexto = document.querySelector('#btnCambiarOrientacion span');
    if (btnTexto) {
        btnTexto.textContent = horizontal ? 'Cambiar a Vertical' : 'Cambiar a Horizontal';
    }

    let estilo = document.getElementById('estilo-orientacion-dinamica-ventas');
    if (!estilo) {
        estilo = document.createElement('style');
        estilo.id = 'estilo-orientacion-dinamica-ventas';
        document.head.appendChild(estilo);
    }

    if (horizontal) {
        estilo.innerHTML = '@media print { @page { size: landscape; margin: 5mm 0mm; } } .preview-paper { width: 297mm !important; min-height: 210mm !important; }';
    } else {
        estilo.innerHTML = '@media print { @page { size: portrait; margin: 5mm 0mm; } } .preview-paper { width: 210mm !important; min-height: 297mm !important; }';
    }
}

function ejecutarImpresionVentas() {
    window.print();
}
