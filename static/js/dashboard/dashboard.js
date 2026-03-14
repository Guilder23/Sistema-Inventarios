/**
 * dashboard.js - Lógica del Dashboard Administrativo
 * Sistema de Inventario
 */

// ========== ACTUALIZAR FECHA Y HORA EN TIEMPO REAL ==========
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = now.toLocaleDateString('es-ES', options);
    }
}

// ========== ANIMACIÓN DE TARJETAS AL CARGAR ==========
function animateCards() {
    const cards = document.querySelectorAll('.stat-card, .dashboard-card');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

// ========== FORMATEAR NÚMEROS ==========
function formatNumber(number) {
    return new Intl.NumberFormat('es-BO').format(number);
}

// ========== FORMATEAR MONEDA ==========
function formatCurrency(amount, currency = 'BOB') {
    const symbol = currency === 'BOB' ? 'Bs.' : '$us';
    return `${symbol} ${parseFloat(amount).toFixed(2)}`;
}

// ========== REFRESCAR ESTADÍSTICAS (FUTURO) ==========
function refreshDashboardStats() {
    console.log('Refrescando estadísticas del dashboard...');
    // Aquí se puede implementar una llamada AJAX para actualizar estadísticas
    // sin recargar la página
}

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar fecha y hora
    updateDateTime();
    
    // Actualizar cada segundo
    setInterval(updateDateTime, 1000);
    
    // Animar tarjetas al cargar
    animateCards();
    
    // Configurar tooltips de Bootstrap si está disponible
    if (typeof $ !== 'undefined' && $.fn.tooltip) {
        $('[data-toggle="tooltip"]').tooltip();
    }
    
    console.log('Dashboard inicializado correctamente');
});

// ========== EXPORT PARA USO GLOBAL ==========
window.dashboardUtils = {
    updateDateTime,
    refreshDashboardStats,
    formatNumber,
    formatCurrency
};
