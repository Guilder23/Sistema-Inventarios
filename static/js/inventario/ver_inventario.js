document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ ver_inventario.js cargado correctamente");

    // Elementos del DOM
    const tablaBody = document.getElementById("tablaInventario");
    const inputBuscar = document.getElementById("buscar");
    const filtroUnidad = document.getElementById("filtros");       // Select de unidades (id="filtros")
    const filtroStock = document.getElementById("filtroStock");   // Select de stock
    const paginacion = document.getElementById("paginacion");
    const mostrandoDesde = document.getElementById("mostrandoDesde");
    const mostrandoHasta = document.getElementById("mostrandoHasta");
    const totalRegistros = document.getElementById("totalRegistros");
    const btnAnterior = document.getElementById("btnAnterior");
    const btnSiguiente = document.getElementById("btnSiguiente");

    // Variables de paginación
    let datosOriginales = [];
    let datosFiltrados = [];
    let paginaActual = 1;
    const registrosPorPagina = 5; // Cambia según necesites

    // Cargar datos
    axios.get('/static/json/inventario/productosPrueba.json?t=' + Date.now())
        .then(response => {
            console.log("📦 Datos recibidos:", response.data.length);
            datosOriginales = response.data;
            window.inventarioDatos = datosOriginales; // Para el modal

            // Poblar select de unidades con valores únicos (después de la opción "Todas")
            const unidades = [...new Set(datosOriginales.map(item => item.unidad_operativa).filter(Boolean))];
            unidades.forEach(unidad => {
                const option = document.createElement('option');
                option.value = unidad;
                option.textContent = unidad;
                filtroUnidad.appendChild(option);
            });

            datosFiltrados = [...datosOriginales];
            renderTablaConPaginacion();

            // Eventos de filtros (usando la misma función para todos)
            inputBuscar.addEventListener("keyup", aplicarFiltros);
            filtroUnidad.addEventListener("change", aplicarFiltros);
            filtroStock.addEventListener("change", aplicarFiltros);
        })
        .catch(err => console.error("❌ Error cargando inventario:", err));

    // ===== FUNCIÓN QUE APLICA TODOS LOS FILTROS (texto + unidad + stock) =====
    function aplicarFiltros() {
        const texto = inputBuscar.value.toLowerCase();
        const unidadSel = filtroUnidad.value;
        const stockSel = filtroStock.value;

        datosFiltrados = datosOriginales.filter(item => {
            // Filtro de búsqueda por texto
            const coincideTexto = texto === '' ||
                (item.codigo || '').toLowerCase().includes(texto) ||
                (item.nombre || '').toLowerCase().includes(texto) ||
                (item.unidad_operativa || '').toLowerCase().includes(texto);

            // Filtro por unidad operativa
            const coincideUnidad = unidadSel === '' || item.unidad_operativa === unidadSel;

            // Filtro por estado de stock
            let coincideStock = true;
            if (stockSel === 'critico') {
                coincideStock = item.stock <= item.stock_critico;
            } else if (stockSel === 'bajo') {
                coincideStock = item.stock > item.stock_critico && item.stock <= item.stock_bajo;
            } else if (stockSel === 'normal') {
                coincideStock = item.stock > item.stock_bajo;
            }

            return coincideTexto && coincideUnidad && coincideStock;
        });

        paginaActual = 1;
        renderTablaConPaginacion();
    }

    // ===== FUNCIONES PRINCIPALES =====
    function renderTablaConPaginacion() {
        const inicio = (paginaActual - 1) * registrosPorPagina;
        const fin = inicio + registrosPorPagina;
        const datosPaginados = datosFiltrados.slice(inicio, fin);
        
        actualizarInfoPaginacion();
        renderTabla(datosPaginados);
        renderPaginacion();
    }

    function renderTabla(datos) {
        tablaBody.innerHTML = "";
        if (datos.length === 0) {
            tablaBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">No se encontraron productos</td></tr>`;
            return;
        }
        datos.forEach(item => {
            const fotoSrc = item.fotos?.[0] || 'https://via.placeholder.com/45';
            const fila = document.createElement("tr");

            // Determinar clase de fila según stock
            let claseFila = '';
            if (item.stock <= item.stock_critico) {
                claseFila = 'fila-stock-critico';
            } else if (item.stock <= item.stock_bajo) {
                claseFila = 'fila-stock-bajo';
            }
            if (claseFila) fila.classList.add(claseFila);
            
            // Badge de stock
            let badgeClass = 'badge-secondary';
            if (item.stock <= item.stock_critico) {
                badgeClass = 'badge-danger';
            } else if (item.stock <= item.stock_bajo) {
                badgeClass = 'badge-warning';
            }
            console.log(`Producto: ${item.nombre}, Stock: ${item.stock}, Clase de fila: ${claseFila}, Badge: ${badgeClass}`);

            fila.innerHTML = `
                <td class="text-center align-middle">
                    <img src="${fotoSrc}" width="45" height="45" style="object-fit:cover; border-radius:5px;" onerror="this.src='https://via.placeholder.com/45'">
                </td>
                <td class="align-middle">${item.codigo}</td>
                <td class="align-middle">${item.nombre}</td>
                <td class="align-middle">${item.stock}</td>
                <td class="align-middle">${item.cajas || 0}</td>
                <td class="align-middle">${item.unidad_operativa || 'N/A'}</td>
                <td class="text-center">
                    <button class="btn btn-info btn-sm btn-ver-producto" data-producto-id="${item.codigo}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tablaBody.appendChild(fila);
        });
    }

    function actualizarInfoPaginacion() {
        const total = datosFiltrados.length;
        const inicio = total === 0 ? 0 : (paginaActual - 1) * registrosPorPagina + 1;
        const fin = Math.min(paginaActual * registrosPorPagina, total);
        mostrandoDesde.textContent = inicio;
        mostrandoHasta.textContent = fin;
        totalRegistros.textContent = total;
    }

    function renderPaginacion() {
        const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina);
        
        // Eliminar números de página existentes (excepto anterior y siguiente)
        while (paginacion.children.length > 2) {
            paginacion.removeChild(paginacion.children[1]);
        }

        // Insertar números de página después del botón anterior
        for (let i = 1; i <= totalPaginas; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === paginaActual ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" data-pagina="${i}">${i}</a>`;
            paginacion.insertBefore(li, btnSiguiente);
        }

        btnAnterior.classList.toggle('disabled', paginaActual === 1);
        btnSiguiente.classList.toggle('disabled', paginaActual === totalPaginas || totalPaginas === 0);
    }

    // ===== EVENTOS DE PAGINACIÓN =====
    btnAnterior.addEventListener('click', (e) => {
        e.preventDefault();
        if (paginaActual > 1) {
            paginaActual--;
            renderTablaConPaginacion();
        }
    });

    btnSiguiente.addEventListener('click', (e) => {
        e.preventDefault();
        const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina);
        if (paginaActual < totalPaginas) {
            paginaActual++;
            renderTablaConPaginacion();
        }
    });

    paginacion.addEventListener('click', (e) => {
        const link = e.target.closest('.page-link');
        if (!link) return;
        if (link.closest('#btnAnterior') || link.closest('#btnSiguiente')) return;
        e.preventDefault();
        const pagina = link.dataset.pagina;
        if (pagina) {
            paginaActual = parseInt(pagina);
            renderTablaConPaginacion();
        }
    });
});