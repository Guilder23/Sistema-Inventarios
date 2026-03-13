// JavaScript específico para Inventario General

document.addEventListener('DOMContentLoaded', function() {
    // Sincronizar cambio de pestañas con visibilidad de tablas
    const tabNormal = document.querySelector('a[href="#filtros-normales"]');
    const tabAvanzado = document.querySelector('a[href="#filtros-avanzados"]');
    const tablaNormal = document.getElementById('tabla-normal');
    const tablaAvanzada = document.getElementById('tabla-avanzada');
    
    if (tabNormal && tabAvanzado && tablaNormal && tablaAvanzada) {
        tabNormal.addEventListener('click', function() {
            tablaNormal.classList.remove('tabla-oculta');
            tablaNormal.classList.add('tabla-visible');
            tablaAvanzada.classList.remove('tabla-visible');
            tablaAvanzada.classList.add('tabla-oculta');
        });
        
        tabAvanzado.addEventListener('click', function() {
            tablaNormal.classList.remove('tabla-visible');
            tablaNormal.classList.add('tabla-oculta');
            tablaAvanzada.classList.remove('tabla-oculta');
            tablaAvanzada.classList.add('tabla-visible');
        });
    }
    
    // Obtener los formularios
    const filtrosFormNormal = document.getElementById('filtrosFormNormal');
    const filtrosFormAvanzado = document.getElementById('filtrosFormAvanzado');
    const rolFiltro = document.getElementById('rolFiltro');
    const ubicacionFiltro = document.getElementById('ubicacionFiltro');
    
    // Cargar ubicaciones si ya hay un rol seleccionado al cargar la página
    if (rolFiltro && rolFiltro.value) {
        cargarUbicacionesPorRol(rolFiltro.value, '{{ ubicacion_filtro_id }}');
    }
    
    // Evento para cuando cambia el rol
    if (rolFiltro) {
        rolFiltro.addEventListener('change', function() {
            const rol = this.value;
            
            if (rol) {
                // Habilitar select de ubicación y cargar opciones
                ubicacionFiltro.disabled = false;
                cargarUbicacionesPorRol(rol);
            } else {
                // Deshabilitar select de ubicación y limpiar
                ubicacionFiltro.disabled = true;
                ubicacionFiltro.innerHTML = '<option value="">Seleccione primero un rol</option>';
            }
            
            // Enviar formulario cuando cambia el rol
            filtrosFormNormal.submit();
        });
    }
    
    // Aplicar filtros en tiempo real para formulario normal
    if (filtrosFormNormal) {
        const campos = filtrosFormNormal.querySelectorAll('select');
        
        campos.forEach(campo => {
            campo.addEventListener('change', function() {
                // Solo enviar si se ha seleccionado ubicación (o si se limpia)
                filtrosFormNormal.submit();
            });
        });
    }
    
    // Aplicar filtros en tiempo real para formulario avanzado
    if (filtrosFormAvanzado) {
        const campos = filtrosFormAvanzado.querySelectorAll('input, select');
        
        campos.forEach(campo => {
            // Para inputs de texto, usar evento 'input' con debounce
            if (campo.type === 'text') {
                let timeoutId;
                campo.addEventListener('input', function() {
                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => {
                        filtrosFormAvanzado.submit();
                    }, 500); // Esperar 500ms después de que el usuario deje de escribir
                });
            } else {
                // Para selects y números, aplicar inmediatamente
                campo.addEventListener('change', function() {
                    filtrosFormAvanzado.submit();
                });
            }
        });
    }
});

/**
 * Cargar ubicaciones según el rol seleccionado
 */
function cargarUbicacionesPorRol(rol, ubicacionSeleccionada = '') {
    const ubicacionFiltro = document.getElementById('ubicacionFiltro');
    
    if (!rol) {
        ubicacionFiltro.innerHTML = '<option value="">Seleccione primero un rol</option>';
        return;
    }
    
    // Mostrar loading
    ubicacionFiltro.innerHTML = '<option value="">Cargando...</option>';
    
    // Hacer petición AJAX
    fetch(`/inventario/ajax/ubicaciones-por-rol/?rol=${rol}`)
        .then(response => response.json())
        .then(data => {
            // Limpiar select
            ubicacionFiltro.innerHTML = '<option value="">Todas las ubicaciones</option>';
            
            // Agregar opciones
            if (data.ubicaciones && data.ubicaciones.length > 0) {
                data.ubicaciones.forEach(ubicacion => {
                    const option = document.createElement('option');
                    option.value = ubicacion.id;
                    option.textContent = ubicacion.nombre;
                    
                    // Seleccionar si es la ubicación actual
                    if (ubicacionSeleccionada && ubicacion.id == ubicacionSeleccionada) {
                        option.selected = true;
                    }
                    
                    ubicacionFiltro.appendChild(option);
                });
            } else {
                ubicacionFiltro.innerHTML = '<option value="">No hay ubicaciones disponibles</option>';
            }
        })
        .catch(error => {
            console.error('Error al cargar ubicaciones:', error);
            ubicacionFiltro.innerHTML = '<option value="">Error al cargar</option>';
        });
}

/**
 * Función para exportar tabla a Excel/CSV
 */
function exportarTabla() {
    // Detectar cuál tabla está visible usando las clases CSS
    const tablaNormal = document.getElementById('tabla-normal');
    const tablaAvanzada = document.getElementById('tabla-avanzada');
    
    const tablaSimplificada = tablaNormal && tablaNormal.classList.contains('tabla-visible')
        ? tablaNormal.querySelector('.tabla-simplificada') 
        : null;
    const tablaCompleta = tablaAvanzada && tablaAvanzada.classList.contains('tabla-visible')
        ? tablaAvanzada.querySelector('.inventario-general-table')
        : null;
    
    let csvContent = '';
    let nombreArchivo = '';
    const fecha = new Date().toISOString().split('T')[0];
    
    if (tablaSimplificada) {
        // Exportar tabla expandida (vista normal con 9 columnas, foto no se exporta)
        nombreArchivo = `inventario_expandido_${fecha}.csv`;
        
        // Encabezados
        csvContent += 'Código,Producto,Categoría,Rol,Nombre del Rol,Stock,Estado,Actualizado\n';
        
        // Datos
        const filas = tablaSimplificada.querySelectorAll('tbody tr');
        filas.forEach(fila => {
            const celdas = fila.querySelectorAll('td');
            if (celdas.length >= 9) {
                // Ahora la columna 0 es la foto, así que empezamos desde 1
                const codigo = celdas[1].textContent.trim();
                const producto = celdas[2].textContent.trim();
                const categoria = celdas[3].textContent.trim();
                const rol = celdas[4].textContent.trim();
                const nombreRol = celdas[5].textContent.trim();
                const stock = celdas[6].textContent.trim().replace(' unidades', '');
                const estado = celdas[7].textContent.trim();
                const actualizado = celdas[8].textContent.trim();
                
                csvContent += `"${codigo}","${producto}","${categoria}","${rol}","${nombreRol}","${stock}","${estado}","${actualizado}"\n`;
            }
        });
    } else if (tablaCompleta) {
        // Exportar tabla completa (vista avanzada con 12 columnas, foto no se exporta)
        nombreArchivo = `inventario_general_${fecha}.csv`;
        
        // Encabezados
        csvContent += 'Código,Producto,Categoría,Almacén,Stock Almacén,Stock Depósitos,Stock Tiendas,Stock T.Online,Total,Estado\n';
        
        // Datos
        const filas = tablaCompleta.querySelectorAll('tbody tr:not(.collapse)');
        filas.forEach(fila => {
            const celdas = fila.querySelectorAll('td');
            if (celdas.length > 0) {
                // Ahora la columna 0 es la foto, así que empezamos desde 1
                const codigo = celdas[1].textContent.trim();
                const producto = celdas[2].textContent.trim();
                const categoria = celdas[3].textContent.trim();
                const almacen = celdas[4].textContent.trim();
                const stockAlmacen = celdas[5].textContent.trim();
                const stockDepositos = celdas[6].textContent.trim();
                const stockTiendas = celdas[7].textContent.trim();
                const stockOnline = celdas[8].textContent.trim();
                const total = celdas[9].textContent.trim();
                const estado = celdas[10].textContent.trim();
                
                csvContent += `"${codigo}","${producto}","${categoria}","${almacen}",${stockAlmacen},${stockDepositos},${stockTiendas},${stockOnline},${total},"${estado}"\n`;
            }
        });
    } else {
        console.error('No se encontró ninguna tabla para exportar');
        return;
    }
    
    // Crear el archivo y descargarlo
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', nombreArchivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Mostrar mensaje de éxito
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'Exportado!',
            text: 'El inventario se ha exportado correctamente',
            timer: 2000,
            showConfirmButton: false
        });
    } else {
        alert('Inventario exportado correctamente');
    }
}

/**
 * Función para limpiar todos los filtros
 */
function limpiarFiltros() {
    window.location.href = window.location.pathname;
}
