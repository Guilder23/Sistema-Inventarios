/* ============================================================================
   FUNCIONALIDAD PARA MODAL VER USUARIO
   ============================================================================ */

async function cargarDetallesUsuario(usuarioId) {
    try {
        const response = await fetch(`/usuarios/${usuarioId}/editar/`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        const data = await response.json();
        
        // Rellenar el modal con los datos del usuario
        document.getElementById('verUsername').textContent = data.username;
        document.getElementById('verNombrecompleto').textContent = 
            `${data.first_name} ${data.last_name}`.trim() || 'Sin nombre';
        document.getElementById('verEmail').textContent = data.email || 'Sin correo';
        
        // Estado
        const estadoElement = document.getElementById('verEstado');
        if (data.is_active) {
            estadoElement.innerHTML = '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Activo</span>';
        } else {
            estadoElement.innerHTML = '<span class="badge badge-danger"><i class="fas fa-times-circle"></i> Inactivo</span>';
        }
        
        // Rol con badges e iconos según tipo
        const tipoElement = document.getElementById('verTipo');
        const rolesConfig = {
            'administrador': { class: 'badge-danger', icon: 'fa-shield-alt', text: 'Administrador' },
            'almacen': { class: 'badge-primary', icon: 'fa-warehouse', text: 'Almacén' },
            'tienda': { class: 'badge-success', icon: 'fa-store', text: 'Tienda' },
            'deposito': { class: 'badge-warning', icon: 'fa-box', text: 'Depósito' },
            'tienda_online': { class: 'badge-info', icon: 'fa-shopping-cart', text: 'Tienda Online' }
        };
        
        const rolConfig = rolesConfig[data.rol] || { class: 'badge-secondary', icon: 'fa-user', text: 'Sin Rol' };
        tipoElement.innerHTML = `<span class="badge ${rolConfig.class}"><i class="fas ${rolConfig.icon}"></i> ${rolConfig.text}</span>`;
        
        document.getElementById('verFecha').textContent = data.date_joined;
        document.getElementById('verUltimoAcceso').textContent = data.last_login;
    } catch (error) {
        console.error('Error al cargar detalles del usuario:', error);
        alert('Error al cargar los detalles del usuario');
    }
}
