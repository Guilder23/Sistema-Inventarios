/* ============================================================================
   FUNCIONALIDAD PARA NAVBAR - DROPDOWNS MODERNOS
   ============================================================================ */

function inicializarNavbar() {
    const notificacionesBtn = document.getElementById('notificacionesBtn');
    const notificacionesDropdown = document.getElementById('notificacionesDropdown');
    const usuarioBtn = document.getElementById('usuarioBtn');
    const usuarioDropdown = document.getElementById('usuarioDropdown');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const marcarTodasBtn = document.getElementById('marcarTodasBtn');

    // Cargar notificaciones al iniciar
    cargarNotificaciones();
    
    // Recargar notificaciones cada 10 segundos
    setInterval(cargarNotificaciones, 10000);

    // Toggle dropdown de notificaciones
    if (notificacionesBtn && notificacionesDropdown) {
        notificacionesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Cerrar dropdown de usuario si está abierto
            if (usuarioDropdown) {
                usuarioDropdown.classList.remove('show');
            }
            
            // Toggle dropdown de notificaciones
            notificacionesDropdown.classList.toggle('show');
            notificacionesDropdown.classList.toggle('mostrar');
            
            // Recargar cuando se abre
            if (notificacionesDropdown.classList.contains('show')) {
                cargarNotificaciones();
            }
        });
    }

    // Toggle dropdown de usuario
    if (usuarioBtn && usuarioDropdown) {
        usuarioBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Cerrar dropdown de notificaciones si está abierto
            if (notificacionesDropdown) {
                notificacionesDropdown.classList.remove('show');
                notificacionesDropdown.classList.remove('mostrar');
            }
            
            // Toggle dropdown de usuario
            usuarioDropdown.classList.toggle('show');
        });
    }

    // NOTA: La funcionalidad del sidebar está manejada por sidebar.js
    // No se debe duplicar el código aquí para evitar conflictos

    // Cerrar dropdowns al hacer click fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.navbar-notificaciones')) {
            if (notificacionesDropdown) {
                notificacionesDropdown.classList.remove('show');
                notificacionesDropdown.classList.remove('mostrar');
            }
        }
        
        if (!e.target.closest('.navbar-usuario')) {
            if (usuarioDropdown) {
                usuarioDropdown.classList.remove('show');
            }
        }
    });

    // Cerrar dropdowns al presionar ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (notificacionesDropdown) {
                notificacionesDropdown.classList.remove('show');
                notificacionesDropdown.classList.remove('mostrar');
            }
            if (usuarioDropdown) {
                usuarioDropdown.classList.remove('show');
            }
            if (sidebar && sidebarOverlay) {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            }
        }
    });

    // Botón marcar todas como leídas
    if (marcarTodasBtn) {
        marcarTodasBtn.addEventListener('click', marcarTodasLeidas);
    }
}

// ============================================================================
// FUNCIONES PARA NOTIFICACIONES
// ============================================================================

function cargarNotificaciones() {
    fetch('/notificaciones/obtener/')
        .then(response => response.json())
        .then(data => {
            actualizarBadgeNotificaciones(data.no_leidas);
            actualizarListaNotificaciones(data.notificaciones);
        })
        .catch(error => console.error('Error al cargar notificaciones:', error));
}

function actualizarBadgeNotificaciones(cantidad) {
    const badge = document.getElementById('notificacionesBadge');
    const contador = document.getElementById('notificacionesContador');
    
    if (badge) {
        badge.textContent = cantidad;
        if (cantidad > 0) {
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
    
    if (contador) {
        const plural = cantidad === 1 ? 'nueva' : 'nuevas';
        contador.textContent = `${cantidad} ${plural}`;
    }
}

function actualizarListaNotificaciones(notificaciones) {
    const dropdownItems = document.getElementById('notificacionesLista');
    if (!dropdownItems) return;
    
    // Limpiar notificaciones anteriores
    dropdownItems.innerHTML = '';
    
    if (notificaciones.length === 0) {
        dropdownItems.innerHTML = '<div class="no-notificaciones"><p>No hay notificaciones</p></div>';
        return;
    }
    
    // Agregar notificaciones
    notificaciones.forEach(notif => {
        const notifElement = document.createElement('a');
        notifElement.href = notif.url;
        notifElement.className = `dropdown-item ${notif.leida ? 'notificacion-leida' : 'notificacion-nueva'}`;
        notifElement.dataset.id = notif.id;
        
        // Extraer clase de color del icono
        const iconClasses = notif.icono.split(' ');
        const bgColor = iconClasses.length > 1 ? iconClasses[1] : 'bg-info';
        
        notifElement.innerHTML = `
            <div class="notification-icon ${bgColor}">
                <i class="fas ${iconClasses[0]}"></i>
            </div>
            <div class="notification-content">
                <strong>${notif.titulo}</strong>
                <p>${notif.mensaje}</p>
                <small>${notif.tiempo}</small>
            </div>
        `;
        
        // Click para marcar como leída
        notifElement.addEventListener('click', function(e) {
            if (!notif.leida) {
                e.preventDefault();
                marcarComoLeida(notif.id);
            }
        });
        
        dropdownItems.appendChild(notifElement);
    });
}

function marcarComoLeida(id) {
    fetch(`/notificaciones/marcar-leida/${id}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            cargarNotificaciones();
        }
    })
    .catch(error => console.error('Error al marcar como leída:', error));
}

function marcarTodasLeidas() {
    fetch('/notificaciones/marcar-todas-leidas/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            cargarNotificaciones();
            mostrarNotificacion('Todas las notificaciones marcadas como leídas', 'success', 2000);
        }
    })
    .catch(error => console.error('Error al marcar todas como leídas:', error));
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

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarNavbar);
} else {
    inicializarNavbar();
}
