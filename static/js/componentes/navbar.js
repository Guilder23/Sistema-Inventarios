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
            }
            
            // Toggle dropdown de usuario
            usuarioDropdown.classList.toggle('show');
        });
    }

    // Toggle sidebar en móvil
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function(e) {
            e.preventDefault();
            sidebar.classList.toggle('active');
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('active');
            }
        });
    }

    // Cerrar sidebar al hacer click en el overlay
    if (sidebarOverlay && sidebar) {
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }

    // Cerrar dropdowns al hacer click fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.navbar-notificaciones')) {
            if (notificacionesDropdown) {
                notificacionesDropdown.classList.remove('show');
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
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarNavbar);
} else {
    inicializarNavbar();
}
