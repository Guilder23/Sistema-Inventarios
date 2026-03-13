/* ============================================================================
   FUNCIONALIDAD PARA FOOTER
   ============================================================================ */

// El footer es principalmente estático, pero aquí puedes agregar funcionalidad
// como scroll to top, año dinámico, etc.

document.addEventListener('DOMContentLoaded', function() {
    // Actualizar año dinámicamente si es necesario
    const footer = document.querySelector('.footer');
    if (footer) {
        const currentYear = new Date().getFullYear();
        const yearElements = footer.querySelectorAll('[data-year]');
        yearElements.forEach(el => {
            el.textContent = currentYear;
        });
    }
});
