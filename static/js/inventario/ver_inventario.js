document.addEventListener("DOMContentLoaded", function () {
    const tablaBody = document.getElementById("tablaInventario");
    const inputBuscar = document.getElementById("buscar");
    const filtroUnidad = document.getElementById("filtros");
    const filtroStock = document.getElementById("filtroStock");
    const btnAnterior = document.getElementById("btnAnterior");
    const btnSiguiente = document.getElementById("btnSiguiente");
    const totalRegistros = document.getElementById("totalRegistros");

    let paginaNext = null;
    let paginaPrev = null;
    const urlBase = '/inventario/api/inventario/';
    const imgGrisBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC0AAAAtCAYAAAAp87u7AAAAAXNSR0IArs4c6QAAAFZJREFUWAnt00EKACAMA0H9/6dtX8Cl9CDYmUvAnS0rqvba896X+TzOnp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp7+ng8X4AIBAUvNawAAAABJRU5ErkJggg==";

    function extraerPagina(url) {
        if (!url) return null;
        const match = url.match(/[?&]page=(\d+)/);
        return match ? match[1] : null;
    }

    function cargarDatos(pagina = null) {
        const params = {
            search: inputBuscar.value,
            unidad_operativa: filtroUnidad.value,
            stock_estado: filtroStock.value
        };
        if (pagina) params.page = pagina;

        axios.get(urlBase, { params })
            .then(response => {
                const data = response.data;
                const items = data.results || data;

                paginaNext = extraerPagina(data.next);
                paginaPrev = extraerPagina(data.previous);

                // IMPORTANTE: Guardamos en window para que el modal (ver.js) pueda encontrarlos
                window.inventarioDatos = items;

                renderTabla(items);
                actualizarInterfazPaginacion(data);
            })
            .catch(err => console.error("❌ Error cargando datos:", err));
    }

    function renderTabla(datos) {
        tablaBody.innerHTML = "";
        datos.forEach(item => {
            const fotoSrc = (item.fotos && typeof item.fotos === 'string' && item.fotos.startsWith('http'))
                ? item.fotos
                : imgGrisBase64;

            const fila = document.createElement("tr");
            if (item.stock <= item.stock_critico) fila.classList.add('fila-stock-critico');
            else if (item.stock <= item.stock_bajo) fila.classList.add('fila-stock-bajo');

            fila.innerHTML = `
                <td class="text-center align-middle"><img src="${fotoSrc}" width="45" height="45" style="object-fit:cover; border-radius:5px;" onerror="this.src='${imgGrisBase64}'"></td>
                <td class="align-middle"><strong>${item.codigo}</strong></td>
                <td class="align-middle">${item.nombre}</td>
                <td class="align-middle">${item.stock}</td>
                <td class="align-middle">${item.cajas || 0}</td>
                <td class="align-middle">${item.unidad_operativa || 'N/A'}</td>
                <td class="text-center align-middle">
                    <button class="btn btn-info btn-sm btn-ver-producto" data-producto-id="${item.codigo}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tablaBody.appendChild(fila);
        });
    }

    function actualizarInterfazPaginacion(data) {
        totalRegistros.textContent = data.count || 0;
        btnAnterior.parentElement.classList.toggle('disabled', !paginaPrev);
        btnSiguiente.parentElement.classList.toggle('disabled', !paginaNext);
    }

    // Eventos de filtros
    let debounceTimer;
    inputBuscar.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => cargarDatos(), 350);
    });
    filtroUnidad.addEventListener("change", () => cargarDatos());
    filtroStock.addEventListener("change", () => cargarDatos());

    // Eventos de paginación
    btnAnterior.addEventListener('click', (e) => {
        e.preventDefault();
        if (paginaPrev) cargarDatos(paginaPrev);
    });

    btnSiguiente.addEventListener('click', (e) => {
        e.preventDefault();
        if (paginaNext) cargarDatos(paginaNext);
    });

    cargarDatos();
});