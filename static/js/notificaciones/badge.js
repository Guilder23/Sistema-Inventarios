// Script para actualizar notificaciones en tiempo real

document.addEventListener('DOMContentLoaded', function() {
    // Actualizar contador de notificaciones
    actualizarBadgeNotificaciones();
    
    // Actualizar cada 30 segundos
    setInterval(actualizarBadgeNotificaciones, 30000);
});

function actualizarBadgeNotificaciones() {
    fetch('/notificaciones/contador/')
        .then(response => response.json())
        .then(data => {
            const cantidad = data.no_leidas || 0;
            
            // Actualizar badge del navbar
            const badgeNavbar = document.getElementById('notificacionesBadge');
            if (badgeNavbar) {
                badgeNavbar.textContent = cantidad;
                badgeNavbar.style.display = cantidad > 0 ? 'flex' : 'none';
            }
            
            // Actualizar badge del sidebar
            const badgeSidebar = document.getElementById('notificacion-badge');
            if (badgeSidebar) {
                badgeSidebar.textContent = cantidad;
                badgeSidebar.style.display = cantidad > 0 ? 'inline-block' : 'none';
            }
        })
        .catch(error => console.log('Error actualizando notificaciones:', error));
}
