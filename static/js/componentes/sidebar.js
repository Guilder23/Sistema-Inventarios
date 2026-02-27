/* ============================================================================
   SIDEBAR - Funcionalidad de colapso y navegación
   ============================================================================ */

document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const body = document.body;

    // Verificar que los elementos existan
    if (!sidebar || !sidebarOverlay) {
        return;
    }

    // IMPORTANTE: Limpiar estado en móvil PRIMERO, antes de cualquier otra lógica
    if (window.innerWidth <= 992) {
        sidebar.classList.remove('active');
        sidebar.classList.remove('collapsed');
        sidebarOverlay.classList.remove('active');
        body.style.overflow = '';
        body.classList.remove('sidebar-collapsed');
    }

    // Cargar estado guardado del sidebar (solo para desktop)
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebarCollapsed && window.innerWidth > 992) {
        sidebar.classList.add('collapsed');
        body.classList.add('sidebar-collapsed');
    }

    // Toggle collapse del sidebar (botón dentro del sidebar)
    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSidebarCollapse();
        });
    }

    // Toggle sidebar en mobile (botón en navbar)
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebarMobile();
        });
    }

    // Cerrar sidebar al hacer click en el overlay
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            closeSidebarMobile();
        });
    }

    // Acordeón de submenús
    const submenuToggles = sidebar.querySelectorAll('[data-submenu-toggle]');
    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            const submenuId = this.getAttribute('data-submenu-toggle');
            const submenu = document.getElementById(submenuId);
            const href = this.getAttribute('href');

            if (!href || href === '#') {
                e.preventDefault();
            }

            if (!submenu) {
                return;
            }

            const isOpen = submenu.classList.contains('open');
            submenu.classList.toggle('open', !isOpen);
            this.setAttribute('aria-expanded', String(!isOpen));
        });
    });

    // Función para colapsar/expandir el sidebar
    function toggleSidebarCollapse() {
        sidebar.classList.toggle('collapsed');
        body.classList.toggle('sidebar-collapsed');
        
        // Guardar estado en localStorage
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    }

    // Función para abrir/cerrar sidebar en mobile
    function toggleSidebarMobile() {
        // En móvil, asegurarse de que el sidebar no esté colapsado
        if (window.innerWidth <= 992) {
            sidebar.classList.remove('collapsed');
        }
        
        const isActive = sidebar.classList.contains('active');
        
        if (!isActive) {
            // Abrir sidebar
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
            body.style.overflow = 'hidden';
        } else {
            // Cerrar sidebar
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            body.style.overflow = '';
        }
    }

    // Función para cerrar sidebar en mobile
    function closeSidebarMobile() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        body.style.overflow = '';
    }

    // Cerrar sidebar mobile al hacer click en un enlace
    const sidebarLinks = sidebar.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (this.hasAttribute('data-submenu-toggle')) {
                return;
            }
            if (window.innerWidth <= 992) {
                closeSidebarMobile();
            }
        });
    });

    // Ajustar comportamiento según el tamaño de pantalla
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (window.innerWidth > 992) {
                // En desktop, cerrar mobile view
                closeSidebarMobile();
            } else {
                // En mobile, remover estado colapsado y asegurar que no esté activo
                sidebar.classList.remove('collapsed');
                sidebar.classList.remove('active');
                body.classList.remove('sidebar-collapsed');
                sidebarOverlay.classList.remove('active');
                body.style.overflow = '';
            }
        }, 250);
    });

    // Mostrar título completo en tooltip cuando el sidebar está colapsado
    sidebarLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            if (sidebar.classList.contains('collapsed')) {
                const titleAttr = this.getAttribute('title');
                if (titleAttr) {
                    // Mantener el título original
                    return;
                }
            }
        });
    });
});

