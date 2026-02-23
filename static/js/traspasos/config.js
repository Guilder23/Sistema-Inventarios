// Configuración global para traspasos
// Lee los valores desde los data attributes del elemento traspasos-config

document.addEventListener('DOMContentLoaded', function() {
    const configElement = document.getElementById('traspasos-config');
    
    if (configElement) {
        window.ubicacionActualId = configElement.dataset.ubicacionActualId 
            ? parseInt(configElement.dataset.ubicacionActualId) 
            : null;
        
        window.ubicacionActualNombre = configElement.dataset.ubicacionActualNombre || '';
    } else {
        window.ubicacionActualId = null;
        window.ubicacionActualNombre = '';
    }
    
    console.log('Config cargado:', {
        ubicacionActualId: window.ubicacionActualId,
        ubicacionActualNombre: window.ubicacionActualNombre
    });
});
