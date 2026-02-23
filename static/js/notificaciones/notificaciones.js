// Inicializar contador de notificaciones no leídas
document.addEventListener('DOMContentLoaded', function() {
    actualizarContadores();
});

function actualizarContadores() {
    const noLeidas = document.querySelectorAll('[data-leida="false"]').length;
    const total = document.querySelectorAll('[data-notificacion-id]').length;
    
    const contadorNoLeidas = document.getElementById('contador-no-leidas');
    if (contadorNoLeidas) {
        contadorNoLeidas.textContent = noLeidas;
    }
}

function marcarLeidaNotificacion(id) {
    fetch(`/notificaciones/marcar-leida/${id}/`, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const item = document.querySelector(`[data-notificacion-id="${id}"]`);
            item.classList.remove('no-leida');
            item.classList.add('notificacion-leida');
            item.setAttribute('data-leida', 'true');
            
            // Remover botón de marcar como leída
            const btn = item.querySelector(`button[onclick="marcarLeidaNotificacion(${id})"]`);
            if (btn) btn.remove();
            
            actualizarContadores();
        }
    })
    .catch(error => console.error('Error:', error));
}

function marcarTodasLeidas() {
    if (confirm('¿Marcar todas las notificaciones como leídas?')) {
        fetch('/notificaciones/marcar-todas-leidas/', {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Actualizar todas las notificaciones
                document.querySelectorAll('[data-notificacion-id]').forEach(item => {
                    item.classList.remove('no-leida');
                    item.classList.add('notificacion-leida');
                    item.setAttribute('data-leida', 'true');
                    
                    // Remover botones de marcar como leída
                    const btn = item.querySelector('button[class*="btn-outline-primary"]');
                    if (btn && btn.innerHTML.includes('Marcar como leída')) {
                        btn.remove();
                    }
                });
                
                actualizarContadores();
                
                // Mostrar mensaje de éxito
                const alerta = document.createElement('div');
                alerta.className = 'alert alert-success alert-dismissible fade show mt-3';
                alerta.innerHTML = '<strong>¡Listo!</strong> Todas las notificaciones han sido marcadas como leídas. <button type="button" class="close" data-dismiss="alert">&times;</button>';
                document.querySelector('.container').insertBefore(alerta, document.querySelector('.container').firstChild);
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

function filtrarNotificaciones(filtro) {
    // Actualizar botones de filtro
    document.querySelectorAll('.filtros-notificaciones .btn').forEach(btn => {
        btn.classList.remove('filtro-activo');
    });
    event.target.classList.add('filtro-activo');

    // Filtrar notificaciones
    const items = document.querySelectorAll('[data-notificacion-id]');
    
    items.forEach(item => {
        let mostrar = false;
        const leida = item.getAttribute('data-leida') === 'true';
        
        if (filtro === 'todas') {
            mostrar = true;
        } else if (filtro === 'no-leidas' && !leida) {
            mostrar = true;
        } else if (filtro === 'leidas' && leida) {
            mostrar = true;
        }
        
        item.style.display = mostrar ? '' : 'none';
    });
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Actualizar contador en tiempo real (cada 30 segundos)
setInterval(actualizarContadores, 30000);
