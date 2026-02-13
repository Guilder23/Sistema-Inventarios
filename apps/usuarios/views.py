from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.contrib import messages
from django.contrib.auth.models import User
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import PerfilUsuario

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
    """Listar todos los usuarios con filtros"""
    # Obtener parámetros de búsqueda
    buscar = request.GET.get('buscar', '')
    estado = request.GET.get('estado', '')
    rol = request.GET.get('rol', '')
    
    # Query base - incluir perfil con select_related para optimización
    usuarios = User.objects.select_related('perfil').all().order_by('-date_joined')
    
    # Aplicar filtros
    if buscar:
        usuarios = usuarios.filter(
            Q(username__icontains=buscar) |
            Q(first_name__icontains=buscar) |
            Q(last_name__icontains=buscar) |
            Q(email__icontains=buscar)
        )
    
    if estado == 'activo':
        usuarios = usuarios.filter(is_active=True)
    elif estado == 'inactivo':
        usuarios = usuarios.filter(is_active=False)
    
    if rol:
        usuarios = usuarios.filter(perfil__rol=rol)
    
    context = {
        'usuarios': usuarios,
        'buscar': buscar,
        'estado': estado,
        'rol': rol,
    }
    
    return render(request, 'usuarios/usuarios.html', context)

@login_required
@require_http_methods(["GET", "POST"])
def crear_usuario(request):
    """Crear nuevo usuario"""
    if request.method == 'POST':
        try:
            # Obtener datos del formulario
            username = request.POST.get('username')
            email = request.POST.get('email')
            first_name = request.POST.get('first_name', '')
            last_name = request.POST.get('last_name', '')
            password = request.POST.get('password')
            password2 = request.POST.get('password2')
            is_active = request.POST.get('is_active') == 'on'
            
            # Datos del perfil
            rol = request.POST.get('rol')
            nombre_ubicacion = request.POST.get('nombre_ubicacion', '')
            
            # Validar contraseñas
            if password != password2:
                messages.error(request, 'Las contraseñas no coinciden')
                return redirect('listar_usuarios')
            
            if len(password) < 8:
                messages.error(request, 'La contraseña debe tener al menos 8 caracteres')
                return redirect('listar_usuarios')
            
            # Validar que el usuario no exista
            if User.objects.filter(username=username).exists():
                messages.error(request, f'El usuario "{username}" ya existe')
                return redirect('listar_usuarios')
            
            # Validar email único
            if email and User.objects.filter(email=email).exists():
                messages.error(request, f'El correo "{email}" ya está registrado')
                return redirect('listar_usuarios')
            
            # Validar rol
            if not rol:
                messages.error(request, 'Debe seleccionar un rol')
                return redirect('listar_usuarios')
            
            # La ubicación es opcional por ahora (hasta crear gestión de almacenes/tiendas)
            # rolesConUbicacion = ['almacen', 'tienda', 'deposito', 'tienda_online']
            # if rol in rolesConUbicacion and not nombre_ubicacion:
            #     messages.error(request, 'Debe especificar el nombre de la ubicación para este rol')
            #     return redirect('listar_usuarios')
            
            # Crear usuario
            usuario = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_active=is_active,
                is_staff=(rol == 'administrador'),  # Solo administradores son staff
                is_superuser=(rol == 'administrador')  # Solo administradores son superuser
            )
            
            # Crear perfil de usuario
            PerfilUsuario.objects.create(
                usuario=usuario,
                rol=rol,
                nombre_ubicacion=nombre_ubicacion if nombre_ubicacion else f'{rol.title()} - {username}',
                activo=is_active
            )
            
            messages.success(request, f'Usuario "{username}" creado exitosamente con rol de {dict(PerfilUsuario.ROLES)[rol]}')
            return redirect('listar_usuarios')
            
        except Exception as e:
            messages.error(request, f'Error al crear usuario: {str(e)}')
            return redirect('listar_usuarios')
    
    return redirect('listar_usuarios')

@login_required
@require_http_methods(["GET", "POST"])
def editar_usuario(request, id):
    """Editar usuario existente"""
    usuario = get_object_or_404(User, id=id)
    
    if request.method == 'POST':
        try:
            # Actualizar datos
            usuario.username = request.POST.get('username', usuario.username)
            usuario.email = request.POST.get('email', usuario.email)
            usuario.first_name = request.POST.get('first_name', '')
            usuario.last_name = request.POST.get('last_name', '')
            usuario.is_active = request.POST.get('is_active') == 'on'
            
            # Actualizar rol
            nuevo_rol = request.POST.get('rol')
            if nuevo_rol:
                # Actualizar permisos según rol
                usuario.is_staff = (nuevo_rol == 'administrador')
                usuario.is_superuser = (nuevo_rol == 'administrador')
                
                # Actualizar perfil si existe, sino crear
                if hasattr(usuario, 'perfil'):
                    usuario.perfil.rol = nuevo_rol
                    usuario.perfil.save()
                else:
                    PerfilUsuario.objects.create(
                        usuario=usuario,
                        rol=nuevo_rol,
                        nombre_ubicacion=f'{nuevo_rol.title()} - {usuario.username}',
                        activo=usuario.is_active
                    )
            
            # Actualizar contraseña solo si se proporciona
            nueva_password = request.POST.get('password')
            if nueva_password:
                usuario.set_password(nueva_password)
            
            usuario.save()
            
            messages.success(request, f'Usuario "{usuario.username}" actualizado exitosamente')
            return redirect('listar_usuarios')
            
        except Exception as e:
            messages.error(request, f'Error al actualizar usuario: {str(e)}')
            return redirect('listar_usuarios')
    
    # Si es GET, retornar datos del usuario en JSON
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        data = {
            'id': usuario.id,
            'username': usuario.username,
            'email': usuario.email,
            'first_name': usuario.first_name,
            'last_name': usuario.last_name,
            'is_active': usuario.is_active,
            'is_staff': usuario.is_staff,
            'rol': usuario.perfil.rol if hasattr(usuario, 'perfil') else '',
            'last_login': usuario.last_login.strftime('%d/%m/%Y %H:%M') if usuario.last_login else 'Nunca',
            'date_joined': usuario.date_joined.strftime('%d/%m/%Y %H:%M'),
        }
        return JsonResponse(data)
    
    return redirect('listar_usuarios')

@login_required
@require_http_methods(["POST"])
def bloquear_usuario(request, id):
    """Bloquear/desbloquear usuario"""
    usuario = get_object_or_404(User, id=id)
    
    try:
        # Cambiar estado
        usuario.is_active = not usuario.is_active
        usuario.save()
        
        estado = 'activado' if usuario.is_active else 'bloqueado'
        messages.success(request, f'Usuario "{usuario.username}" {estado} correctamente')
        
    except Exception as e:
        messages.error(request, f'Error al cambiar estado del usuario: {str(e)}')
    
    return redirect('listar_usuarios')
