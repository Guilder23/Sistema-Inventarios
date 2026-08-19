(function () {
    'use strict';
    const getCookie = (name) => document.cookie.split('; ').reduce((value, item) => {
        const [key, ...rest] = item.split('=');
        return key === name ? decodeURIComponent(rest.join('=')) : value;
    }, '');
    const money = (value) => `Bs ${Number(value || 0).toLocaleString('es-BO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    const dollars = (value) => `$ ${Number(value || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    const showError = (payload) => {
        const errors = payload.errors ? Object.values(payload.errors).flat().join(' ') : payload.error;
        if (window.Swal) Swal.fire('No se pudo realizar la operaci\u00f3n', errors || 'Intente nuevamente.', 'error'); else alert(errors || 'Error');
    };
    const loadSummary = async () => {
        const box = document.getElementById('resumenCaja');
        if (!box) return;
        try {
            const response = await fetch(box.dataset.resumenUrl, {headers: {'X-Requested-With': 'XMLHttpRequest'}});
            const payload = await response.json();
            if (!payload.success) return;
            const d = payload.data;
            document.getElementById('montoInicial').textContent = money(d.monto_inicial);
            document.getElementById('ventasEfectivo').textContent = money(d.ventas_efectivo);
            document.getElementById('cobrosEfectivo').textContent = money(d.cobros_efectivo);
            document.getElementById('egresosManuales').textContent = money(d.egresos_manuales);
            document.getElementById('totalQr').textContent = money(d.total_qr);
            document.getElementById('montoEsperado').textContent = money(d.monto_esperado_efectivo);
            document.getElementById('cierreEsperado').textContent = money(d.monto_esperado_efectivo);
            document.getElementById('ventasEfectivoUsd').textContent = dollars(d.ventas_efectivo_usd);
            document.getElementById('cobrosEfectivoUsd').textContent = dollars(d.cobros_efectivo_usd);
            document.getElementById('egresosManualesUsd').textContent = dollars(d.egresos_manuales_usd);
            document.getElementById('montoEsperadoUsd').textContent = dollars(d.monto_esperado_efectivo_usd);
            document.getElementById('cierreEsperadoUsd').textContent = dollars(d.monto_esperado_efectivo_usd);
        } catch (_) { /* conserva los datos renderizados si falla la actualizacion */ }
    };
    document.querySelectorAll('.caja-form').forEach((form) => form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = form.querySelector('[type="submit"]');
        button.disabled = true;
        const payload = Object.fromEntries(new FormData(form).entries());
        try {
            const response = await fetch(form.dataset.url, {method: 'POST', headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken')}, body: JSON.stringify(payload)});
            const data = await response.json();
            if (!response.ok || !data.success) { showError(data); return; }
            if (form.dataset.action === 'gasto') {
                $('#gastoCajaModal').modal('hide'); form.reset(); await loadSummary();
                if (window.Swal) Swal.fire({title: 'Gasto registrado', icon: 'success', timer: 1400, showConfirmButton: false});
            } else { window.location.reload(); }
        } catch (_) { showError({error: 'No se pudo conectar con el servidor.'}); }
        finally { button.disabled = false; }
    }));
    loadSummary();
}());
