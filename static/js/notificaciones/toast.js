/**
 * ToastManager - Gestor de Notificaciones en Tiempo Real
 */

class ToastManager {
    constructor() {
        this.toastContainer = null;
        this.eventSource = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.initContainer();
        this.connect();
    }
    
/**
 * Crear contenedor de toasts si no existe
 */
    initContainer() {
        let container = document.getElementById('toast-container');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        this.toastContainer = container;
    }
    
/**
 * Conectar a SSE
 */
    connect() {
        if (this.eventSource) {
            this.eventSource.close();
        }
        
        this.eventSource = new EventSource('/notificaciones/stream/');
        
        this.eventSource.onopen = () => {
            console.log('[v0] SSE conectado exitosamente');
            this.isConnected = true;
            this.reconnectAttempts = 0;
        };
        
        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Ignorar pings
                if (data.tipo === 'ping') {
                    return;
                }
                
                // Mostrar notificación
                this.mostrarToast(data);
                
                // Actualizar badge
                this.actualizarBadge();
                
            } catch (error) {
                console.error('[v0] Error parseando SSE:', error);
            }
        };
        
        this.eventSource.onerror = () => {
            console.warn('[v0] SSE desconectado, intentando reconectar...');
            this.isConnected = false;
            this.eventSource.close();
            
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => this.connect(), 3000);
            }
        };
    }
    
/**
 * Mostrar toast en pantalla
 */
    mostrarToast(data) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${data.tipo}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${data.icono} toast-icon"></i>
                <div class="toast-text">
                    <strong class="toast-titulo">${data.titulo}</strong>
                    <p class="toast-mensaje">${data.mensaje}</p>
                </div>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        this.toastContainer.appendChild(toast);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
    
    /**
     * Actualizar badge de notificaciones
     */
    actualizarBadge() {
        fetch('/notificaciones/contador/')
            .then(response => response.json())
            .then(data => {
                const cantidad = data.no_leidas || 0;
                
                // Badge navbar
                const badgeNavbar = document.getElementById('notificacionesBadge');
                if (badgeNavbar) {
                    badgeNavbar.textContent = cantidad;
                    badgeNavbar.style.display = cantidad > 0 ? 'flex' : 'none';
                }
                
                // Badge sidebar
                const badgeSidebar = document.getElementById('notificacion-badge');
                if (badgeSidebar) {
                    badgeSidebar.textContent = cantidad;
                    badgeSidebar.style.display = cantidad > 0 ? 'inline-block' : 'none';
                }
            })
            .catch(error => console.error('[v0] Error actualizando badge:', error));
    }
}