document.addEventListener("DOMContentLoaded", function () {
    const tablaBody = document.getElementById("tablaInventario");
    const inputBuscar = document.getElementById("buscar");
    const filtroUnidad = document.getElementById("filtros");
    const filtroStock = document.getElementById("filtroStock");
    const btnAnterior = document.getElementById("btnAnterior");
    const btnSiguiente = document.getElementById("btnSiguiente");
    const totalRegistros = document.getElementById("totalRegistros");

    let urlNext = null;
    let urlPrev = null;
    const urlBase = '/inventario/api/inventario/';
    const imgGrisBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC0AAAAtCAYAAAAp87u7AAAAAXNSR0IArs4c6QAAAFZJREFUWAnt00EKACAMA0H9/6dtX8Cl9CDYmUvAnS0rqvba896X+TzOnp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp7+ng8X4AIBAUvNawAAAABJRU5ErkJggg==";

    function cargarDatos(url = urlBase) {
        // Obtenemos los valores de los filtros para enviarlos al backend
        const params = {
            search: inputBuscar.value,
            unidad_operativa: filtroUnidad.value,
            stock_estado: filtroStock.value
        };

        axios.get(url, { params })
            .then(response => {
                const data = response.data;
                const items = data.results || data; 
                
                urlNext = data.next;
                urlPrev = data.previous;

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
            let fotoSrc = imgGrisBase64;
            if (item.fotos && (Array.isArray(item.fotos) ? item.fotos.length > 0 : item.fotos.length > 5)) {
                fotoSrc = Array.isArray(item.fotos) ? item.fotos[0] : item.fotos;
            }

            const fila = document.createElement("tr");
            if (item.stock <= item.stock_critico) fila.classList.add('fila-stock-critico');
            else if (item.stock <= item.stock_bajo) fila.classList.add('fila-stock-bajo');

            // USAMOS data-producto-id para que coincida con ver.js
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
        // Habilitar/Deshabilitar botones de Li
        btnAnterior.parentElement.classList.toggle('disabled', !urlPrev);
        btnSiguiente.parentElement.classList.toggle('disabled', !urlNext);
    }

    // Eventos de filtros y paginación
    inputBuscar.addEventListener("input", () => cargarDatos());
    filtroUnidad.addEventListener("change", () => cargarDatos());
    filtroStock.addEventListener("change", () => cargarDatos());

    btnAnterior.addEventListener('click', (e) => {
        e.preventDefault();
        if (urlPrev) cargarDatos(urlPrev);
    });

    btnSiguiente.addEventListener('click', (e) => {
        e.preventDefault();
        if (urlNext) cargarDatos(urlNext);
    });

    cargarDatos();
});