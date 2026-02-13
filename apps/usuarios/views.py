from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.contrib import messages

def index(request):
    """Página de inicio - redirige al dashboard si está autenticado"""
    if request.user.is_authenticated:
        return redirect('dashboard')
    return render(request, 'inicio/index.html')

def custom_logout(request):
    """Cerrar sesión del usuario - acepta GET y POST"""
    logout(request)
    messages.success(request, 'Sesión cerrada exitosamente')
    return redirect('index')

@login_required
def dashboard(request):
    """Dashboard principal del sistema - dinámico por rol"""
    # Determinar qué dashboard mostrar según el rol del usuario
    if request.user.is_superuser:
        # Dashboard para administradores
        template = 'dashboard/admin_dashboard.html'
    elif request.user.is_staff:
        # Dashboard para staff
        template = 'dashboard/admin_dashboard.html'  # Por ahora usa el mismo, después crear staff_dashboard.html
    else:
        # Dashboard para usuarios normales
        template = 'dashboard/admin_dashboard.html'  # Por ahora usa el mismo, después crear user_dashboard.html
    
    return render(request, template)

@login_required
def listar_usuarios(request):
    """Listar todos los usuarios"""
    # TODO: Implementar lógica
    return render(request, 'usuarios/listar.html')

@login_required
def crear_usuario(request):
    """Crear nuevo usuario"""
    # TODO: Implementar lógica
    return render(request, 'usuarios/crear.html')

@login_required
def editar_usuario(request, id):
    """Editar usuario existente"""
    # TODO: Implementar lógica
    return render(request, 'usuarios/editar.html')

@login_required
def bloquear_usuario(request, id):
    """Bloquear/desbloquear usuario"""
    # TODO: Implementar lógica
    messages.success(request, 'Usuario bloqueado correctamente')
    return redirect('listar_usuarios')
