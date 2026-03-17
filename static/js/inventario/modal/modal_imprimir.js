document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM
    const modal = document.getElementById('modalImprimir');
    const btnImprimir = document.querySelector('.btn-imprimir-modal'); 
    const tablaVistaPrevia = document.getElementById('tablaVistaPrevia');
    const contenedorVistaPrevia = document.getElementById('contenedorVistaPrevia');
    
    // Checkboxes de columnas
    const checkboxes = {
        0: document.getElementById('colImpFoto'),
        1: document.getElementById('colImpCodigo'),
        2: document.getElementById('colImpProducto'),
        3: document.getElementById('colImpCategoria'),
        4: document.getElementById('colImpRol'),
        5: document.getElementById('colImpNombreRol'),
        6: document.getElementById('colImpStock'),
        7: document.getElementById('colImpEstado'),
        8: document.getElementById('colImpActualizado')
    };

    // Configuración
    const opciones = {
        orientacion: 'portrait', // 'portrait' o 'landscape'
        titulo: 'Reporte de Inventario General',
        mostrarFecha: true,
        filasPorPagina: 25 // Aprox para A4
    };

    // ==========================================
    // 1. Inicialización
    // ==========================================
    // Usamos jQuery para eventos de Bootstrap 4
    if (typeof $ !== 'undefined') {
        $('#modalImprimir').on('show.bs.modal', function () {
            cargarVistaPrevia();
        });
    }

    // ==========================================
    // 2. Event Listeners
    // ==========================================
    
    // Cambios en checkboxes de columnas
    Object.values(checkboxes).forEach(checkbox => {
        if(checkbox) {
            checkbox.addEventListener('change', actualizarVisibilidadColumnas);
        }
    });

    // Botón Imprimir (si existe el listener manual, aunque onclick en HTML también sirve)
    if(btnImprimir) {
        btnImprimir.addEventListener('click', function() {
            window.print();
        });
    }

    // Botón Orientación
    const btnOrientacion = document.getElementById('btnCambiarOrientacion');
    if(btnOrientacion) {
        btnOrientacion.addEventListener('click', function() {
            opciones.orientacion = opciones.orientacion === 'portrait' ? 'landscape' : 'portrait';
            
            // Actualizar UI del botón
            const icono = this.querySelector('i');
            const texto = this.querySelector('span');
            
            if (opciones.orientacion === 'landscape') {
                if(icono) {
                    icono.className = 'fas fa-sync-alt fa-spin';
                    setTimeout(() => icono.className = 'fas fa-image', 500);
                }
                if(texto) texto.textContent = ' Cambiar a Vertical';
                
                // Rotar hoja visualmente
                const paper = document.querySelector('.preview-paper');
                if(paper) {
                    paper.style.width = '297mm';
                    paper.style.minHeight = '210mm';
                }
                
                actualizarEstiloImpresion('landscape');
            } else {
                if(icono) {
                    icono.className = 'fas fa-sync-alt fa-spin';
                    setTimeout(() => icono.className = 'fas fa-file-alt', 500);
                }
                if(texto) texto.textContent = ' Cambiar a Horizontal';
                
                // Restaurar hoja visualmente
                const paper = document.querySelector('.preview-paper');
                if(paper) {
                    paper.style.width = '210mm';
                    paper.style.minHeight = '297mm';
                }
                
                actualizarEstiloImpresion('portrait');
            }
        });
    }

    // ==========================================
    // 3. Funciones Lógicas
    // ==========================================

    function cargarVistaPrevia() {
        // Detectar tabla activa (Normal vs Avanzada)
        const wrapperNormal = document.getElementById('tabla-normal');
        const wrapperAvanzada = document.getElementById('tabla-avanzada');
        
        let tablaFuente = null;
        let esVistaNormal = false;

        if (wrapperNormal && wrapperNormal.classList.contains('tabla-visible')) {
            tablaFuente = document.getElementById('tablaInventarioNormal');
            esVistaNormal = true;
        } else if (wrapperAvanzada && wrapperAvanzada.classList.contains('tabla-visible')) {
            tablaFuente = document.getElementById('tablaInventarioAvanzado');
            esVistaNormal = false;
        }

        // Si no se encuentra la tabla de origen o destino
        if (!tablaFuente) {
             console.error('No se encontró la tabla de origen activa');
             return;
        }
        if (!tablaVistaPrevia) {
             console.error('No se encontró la tabla de vista previa');
             return;
        }

        // Limpiar tabla destino
        const theadDest = tablaVistaPrevia.querySelector('thead');
        const tbodyDest = tablaVistaPrevia.querySelector('tbody');
        if(theadDest) theadDest.innerHTML = '';
        if(tbodyDest) tbodyDest.innerHTML = '';

        // Configurar UI según el tipo de vista
        manejarModoVista(esVistaNormal);

        // Copiar Encabezado
        const theadOrig = tablaFuente.querySelector('thead');
        if (theadOrig && theadDest) {
            // Clonar todas las filas del header (soporte para rowspan/colspan)
            Array.from(theadOrig.rows).forEach(row => {
               theadDest.appendChild(row.cloneNode(true)); 
            });
        }

        // Copiar Cuerpo
        // Tomamos todas las filas del <tbody>
        const filas = Array.from(tablaFuente.querySelectorAll('tbody tr'));
        
        filas.forEach(filaOriginal => {
            // No copiar filas colapsables ocultas (detalles)
            if (filaOriginal.classList.contains('collapse') && !filaOriginal.classList.contains('show')) {
                return;
            }
            if(tbodyDest) {
                const nuevaFila = filaOriginal.cloneNode(true);
                // Limpiar botones de acción o elementos no imprimibles de la fila clonada si existen
                const botonesDetalle = nuevaFila.querySelectorAll('.btn, .ubicaciones-detalle-btn');
                botonesDetalle.forEach(btn => btn.remove());
                
                tbodyDest.appendChild(nuevaFila);
            }
        });

        // Actualizar Info General
        const contador = document.getElementById('totalFilasImp');
        if(contador && tbodyDest) contador.textContent = tbodyDest.rows.length;
        
        const fechaEl = document.getElementById('fechaImpresion');
        if(fechaEl) fechaEl.textContent = new Date().toLocaleDateString();

        // Aplicar visibilidad de columnas (Solo Vista Normal)
        if (esVistaNormal) {
            actualizarVisibilidadColumnas();
        } else {
            // En Vista Avanzada, asegurar que todo sea visible
            Array.from(tablaVistaPrevia.querySelectorAll('th, td')).forEach(celda => celda.style.display = '');
        }
    }

    function manejarModoVista(esVistaNormal) {
        const configPanel = document.querySelector('.config-columns-scroll');
        const headerPanel = document.querySelector('.config-panel-header');
        
        // Limpiar mensaje anterior si existiera
        const oldMsg = document.getElementById('msg-vista-avanzada');
        if(oldMsg) oldMsg.remove();
        
        if (esVistaNormal) {
            // VISTA NORMAL: Mostrar checkboxes
            if(configPanel) configPanel.style.display = 'block';
        } else {
            // VISTA AVANZADA: Ocultar checkboxes y mostrar mensaje
            if(configPanel) configPanel.style.display = 'none';
            
            // Solo crear mensaje si no existe ya
            const msg = document.createElement('div');
            msg.id = 'msg-vista-avanzada';
            msg.className = 'alert alert-info small m-3 text-center';
            msg.innerHTML = '<i class="fas fa-info-circle mr-1"></i><br>La personalización de columnas solo está disponible para la Vista Normal.<br><br>El reporte imprimirá la tabla consolidada completa.';
            
            // Insertar mensaje explicativo
            if(headerPanel && headerPanel.parentNode) {
                headerPanel.parentNode.insertBefore(msg, headerPanel.nextSibling);
            }
        }
    }

    function actualizarVisibilidadColumnas() {
        const headerRow = tablaVistaPrevia.querySelector('thead tr');
        const bodyRows = tablaVistaPrevia.querySelectorAll('tbody tr');

        if(!headerRow) return;

        // Iterar sobre todos los checkboxes configurados
        Object.keys(checkboxes).forEach(index => {
            const checkbox = checkboxes[index];
            if(!checkbox) return; // Validación por seguridad
            
            const mostrar = checkbox.checked;
            const colIndex = parseInt(index);

            // 1. Header (Solo afecta a la primera fila del header en vista normal)
            if (headerRow && headerRow.cells[colIndex]) {
                headerRow.cells[colIndex].style.display = mostrar ? '' : 'none';
            }

            // 2. Body
            if(bodyRows) {
                bodyRows.forEach(row => {
                    if (row.cells[colIndex]) {
                        row.cells[colIndex].style.display = mostrar ? '' : 'none';
                    }
                });
            }
        });
    }

    function actualizarEstiloImpresion(orientacion) {
        // Eliminar estilo previo si existe
        const oldStyle = document.getElementById('print-orientation-style');
        if (oldStyle) oldStyle.remove();

        const style = document.createElement('style');
        style.id = 'print-orientation-style';
        style.type = 'text/css';
        
        const css = `
            @media print {
                @page {
                    size: ${orientacion === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
                    margin: 5mm;
                }
                .preview-paper {
                    width: 100% !important;
                }
            }
        `;
        
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }
});
