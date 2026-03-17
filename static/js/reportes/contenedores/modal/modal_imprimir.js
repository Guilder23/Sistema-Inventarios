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

// Variables globales para la orientación (por si no existen)
window.orientacionManual = null; // null = automático, 'landscape' = horizontal, 'portrait' = vertical

// Función para alternar orientación manualmente (conectada al botón)
document.addEventListener('DOMContentLoaded', function() {
    const btnOrientacion = document.getElementById('btnCambiarOrientacion');
    if (btnOrientacion) {
        btnOrientacion.addEventListener('click', function() {
            // Alternar entre landscape y portrait
            const estiloActual = window.orientacionManual || 'landscape'; // Default inicial suele ser landscape si hay muchas columnas
            
            if (estiloActual === 'landscape' || (window.orientacionManual === null && esOrientacionAutomaticaHorizontal())) {
                window.orientacionManual = 'portrait';
            } else {
                window.orientacionManual = 'landscape';
            }
            
            actualizarOrientacionPagina(); // Forzar actualización
        });
    }
});

function esOrientacionAutomaticaHorizontal() {
    const checkboxes = document.querySelectorAll('.columna-imprimir');
    const checkedBoxes = Array.from(checkboxes).filter(chk => chk.checked);
    return checkedBoxes.length > 7;
}

function actualizarVistaPrevia() {
    const tabla = document.getElementById('tablaImpresion');
    if (!tabla) return;
    
    // Contar cuántas columnas están seleccionadas
    const checkboxes = document.querySelectorAll('.columna-imprimir');
    const checkedBoxes = Array.from(checkboxes).filter(chk => chk.checked);
    const numColumnas = checkedBoxes.length;

    // Actualizar orientación si no es manual
    if (window.orientacionManual === null) {
        actualizarOrientacionPagina(numColumnas);
    } else {
        actualizarOrientacionPagina(); // Usa la manual
    }

    // Ya no usamos el indicador viejo, pero por si acaso
    const indicador = document.getElementById('indicadorOrientacion');
    if (indicador) {
        // ... (código legado omitido)
    }

    // Mapear qué índices de columna deben ser visibles
    const indicesVisibles = new Set();
    checkedBoxes.forEach(chk => {
        // Asegurar que value exista, si no, usar data-target o índice
        let val = parseInt(chk.value);
        if (isNaN(val)) val = parseInt(chk.getAttribute('data-target'));
        if (!isNaN(val)) indicesVisibles.add(val);
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
}

/**
 * Define la orientación de la página
 */
function actualizarOrientacionPagina(numColumnas = null) {
    let esHorizontal = false;

    if (window.orientacionManual !== null) {
        esHorizontal = (window.orientacionManual === 'landscape');
    } else {
        if (numColumnas === null) {
            numColumnas = document.querySelectorAll('.columna-imprimir:checked').length;
        }
        // Automático: > 7 columnas = Horizontal
        esHorizontal = numColumnas > 7;
    }
    
    // Actualizar texto del botón si existe
    const btnTexto = document.querySelector('#btnCambiarOrientacion span');
    if (btnTexto) {
        btnTexto.textContent = esHorizontal ? 'Cambiar a Vertical' : 'Cambiar a Horizontal';
    }

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
                    margin: 5mm 0mm;
                }
            }
            /* Vista previa visual rotada o ancha */
            .preview-paper {
                width: 297mm !important; 
                min-height: 210mm !important;
            }
        `;
    } else {
        estiloPagina.innerHTML = `
            @media print {
                @page {
                    size: portrait;
                    margin: 5mm 0mm;
                }
            }
            .preview-paper {
                width: 210mm !important;
                min-height: 297mm !important;
            }
        `;
    }
}

function ejecutarImpresion() {
    window.print();
}
