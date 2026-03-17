// modal_imprimir.js
// Lógica para la vista previa e impresión del reporte de contenedores

document.addEventListener('DOMContentLoaded', function() {
    
    // Configurar el modal al abrirse
    if (typeof $ !== 'undefined') {
        $('#modalImprimir').on('shown.bs.modal', function() {
            inicializarVistaPrevia();
        });
    } else {
        const modal = document.getElementById('modalImprimir');
        if (modal) {
            modal.addEventListener('shown.bs.modal', function() {
                inicializarVistaPrevia();
            });
        }
    }

    // Configurar listeners para los checkboxes de columnas
    const checkboxes = document.querySelectorAll('.columna-imprimir');
    checkboxes.forEach(chk => {
        chk.addEventListener('change', function() {
            actualizarVistaPrevia();
            actualizarCheckboxTodasImprimir();
        });
    });
});

function seleccionarTodasColumnasImprimir(checked) {
    const checkboxes = document.querySelectorAll('.columna-imprimir');
    checkboxes.forEach(chk => {
        chk.checked = checked;
    });
    actualizarVistaPrevia();
}

function actualizarCheckboxTodasImprimir() {
    const checkboxes = document.querySelectorAll('.columna-imprimir');
    const todas = document.getElementById('colImpTodas');
    if(todas) {
        todas.checked = Array.from(checkboxes).every(c => c.checked);
    }
}

function inicializarVistaPrevia() {
    // 1. Clonar la tabla original
    const tablaOriginal = document.getElementById('tablaContenedores');
    const contenedorPreview = document.querySelector('.preview-paper .table-responsive');
    
    if (!tablaOriginal || !contenedorPreview) return;
    
    // Limpiar contenedor previo
    contenedorPreview.innerHTML = '';
    
    // Clonar tabla
    const tablaClonada = tablaOriginal.cloneNode(true);
    tablaClonada.id = 'tablaImpresion';
    
    // Remover clases de Bootstrap y atributos inline de ancho
    tablaClonada.classList.remove('table-hover', 'mb-0'); 
    tablaClonada.classList.add('table-sm', 'table-bordered');
    tablaClonada.style.width = '100%';
    
    // Remover estilos de ancho inline para permitir un auto-layout adaptativo
    const elementosConEstilo = tablaClonada.querySelectorAll('[style="width: 4%"], [style*="width:"]');
    elementosConEstilo.forEach(el => {
        el.style.width = ''; // Limpiar anchos inline
    });
    
    // Ajustar imágenes para impresión
    const imagenes = tablaClonada.querySelectorAll('img');
    imagenes.forEach(img => {
        img.style.maxWidth = '25px';
        img.style.height = 'auto';
        img.className = 'img-thumbnail border-0 bg-transparent p-0';
    });
    
    // Eliminar contenido innecesario para impresión (ej: botones, divs vacíos)
    const elementosOcultos = tablaClonada.querySelectorAll('.btn, .fa, .fas, .far');
    elementosOcultos.forEach(el => el.remove());
    
    // Insertar en el contenedor
    contenedorPreview.appendChild(tablaClonada);
    
    // 2. Aplicar visibilidad inicial según checkboxes e inyectar estilo de página
    actualizarVistaPrevia();
    actualizarOrientacionPagina();
}

function actualizarVistaPrevia() {
    const tabla = document.getElementById('tablaImpresion');
    if (!tabla) return;
    
    // Contar cuántas columnas están seleccionadas
    const checkboxes = document.querySelectorAll('.columna-imprimir');
    const checkedBoxes = Array.from(checkboxes).filter(chk => chk.checked);
    const numColumnas = checkedBoxes.length;

    // Actualizar orientación según número de columnas visibles
    actualizarOrientacionPagina(numColumnas);

    // Actualizar indicador visual
    const indicador = document.getElementById('indicadorOrientacion');
    if (indicador) {
        if (numColumnas > 7) {
            indicador.innerHTML = '<i class="fas fa-arrows-alt-h mr-1"></i> Orientación: Horizontal';
        } else {
            indicador.innerHTML = '<i class="fas fa-arrows-alt-v mr-1"></i> Orientación: Vertical';
        }
    }

    // Mapear qué índices de columna deben ser visibles
    const indicesVisibles = new Set();
    checkedBoxes.forEach(chk => {
        indicesVisibles.add(parseInt(chk.value));
    });
    
    // Recorrer filas y celdas
    const filas = tabla.querySelectorAll('tr');
    filas.forEach(fila => {
        const celdas = fila.children; // th o td
        for (let i = 0; i < celdas.length; i++) {
            if (indicesVisibles.has(i)) {
                celdas[i].style.display = '';
            } else {
                celdas[i].style.display = 'none';
            }
        }
    });

    // Ajustar visibilidad de la imagen según la columna de foto
    const fotoCheckbox = document.getElementById('colImpFoto');
    if (fotoCheckbox && !fotoCheckbox.checked) {
        // Lógica adicional si fuera necesaria
    }
}

/**
 * Define la orientación de la página (Horizontal/Vertical) automáticamente
 * basándose en la cantidad de columnas visibles.
 */
function actualizarOrientacionPagina(numColumnas = null) {
    if (numColumnas === null) {
        numColumnas = document.querySelectorAll('.columna-imprimir:checked').length;
    }

    // Umbral: Si hay más de 7 columnas, usar horizontal. Si no, vertical.
    // (Total columnas disponibles es 11)
    const esHorizontal = numColumnas > 7;
    
    let estiloPagina = document.getElementById('estilo-orientacion-dinamica');
    if (!estiloPagina) {
        estiloPagina = document.createElement('style');
        estiloPagina.id = 'estilo-orientacion-dinamica';
        document.head.appendChild(estiloPagina);
    }
    
    if (esHorizontal) {
        estiloPagina.innerHTML = `
            @media print {
                @page {
                    size: landscape;
                    margin: 5mm 0mm; /* Aún menos margen arriba/abajo */
                }
            }
        `;
    } else {
        estiloPagina.innerHTML = `
            @media print {
                @page {
                    size: portrait; /* Vertical */
                    margin: 5mm 0mm;
                }
            }
        `;
    }
}

function ejecutarImpresion() {
    window.print();
}
