from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth.models import User
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import json
from .models import Producto, HistorialProducto

def verificar_permiso_productos(request):
    """Verifica si el usuario tiene permiso para gestionar productos"""
    if not request.user.is_authenticated:
        return False
    
    # Administrador tiene acceso total
    if request.user.is_superuser or request.user.is_staff:
        return True
    
    # Verificar si es almacén
    if hasattr(request.user, 'perfil') and request.user.perfil.rol == 'almacen':
        return True
    
    return False

def es_administrador(request):
    """Verifica si el usuario es administrador"""
    return request.user.is_superuser or request.user.is_staff

def es_almacen(request):
    """Verifica si el usuario es del almacén"""
    return hasattr(request.user, 'perfil') and request.user.perfil.rol == 'almacen'

@login_required
def listar_productos(request):
    """Listar todos los productos con filtros"""
    # Verificar permisos
    if not verificar_permiso_productos(request):
        messages.error(request, 'No tiene permisos para ver esta página')
        return redirect('dashboard')
    
    # Obtener parámetros de búsqueda
    buscar = request.GET.get('buscar', '')
    estado = request.GET.get('estado', '')
    
    # Query base
    productos = Producto.objects.all().order_by('-fecha_creacion')
    
    # Aplicar filtros
    if buscar:
        productos = productos.filter(
            Q(codigo__icontains=buscar) |
            Q(nombre__icontains=buscar) |
            Q(descripcion__icontains=buscar)
        )
    
    if estado == 'activo':
        productos = productos.filter(activo=True)
    elif estado == 'inactivo':
        productos = productos.filter(activo=False)
    
    context = {
        'productos': productos,
        'buscar': buscar,
        'estado': estado,
        'es_administrador': es_administrador(request),
        'es_almacen': es_almacen(request),
    }
    
    return render(request, 'productos/productos.html', context)

@login_required
@require_http_methods(["GET", "POST"])
def crear_producto(request):
    """Crear nuevo producto - Solo almacén"""
    # Verificar permisos
    if not es_almacen(request):
        return JsonResponse({'error': 'No tiene permisos para crear productos'}, status=403)
    
    if request.method == 'POST':
        try:
            # Obtener datos del formulario
            codigo = request.POST.get('codigo', '').strip()
            nombre = request.POST.get('nombre', '').strip()
            descripcion = request.POST.get('descripcion', '')
            stock = request.POST.get('stock', 0)
            unidades_por_caja = request.POST.get('unidades_por_caja', 1)
            precio_unidad = request.POST.get('precio_unidad', 0)
            stock_critico = request.POST.get('stock_critico', 10)
            stock_bajo = request.POST.get('stock_bajo', 30)
            foto = request.FILES.get('foto')
            
            # Validaciones
            if not codigo or not nombre:
                messages.error(request, 'Código y nombre son requeridos')
                return redirect('listar_productos')
            
            # Verificar código único
            if Producto.objects.filter(codigo=codigo).exists():
                messages.error(request, f'El código "{codigo}" ya existe')
                return redirect('listar_productos')
            
            # Crear producto
            producto = Producto.objects.create(
                codigo=codigo,
                nombre=nombre,
                descripcion=descripcion,
                stock=int(stock),
                unidades_por_caja=int(unidades_por_caja),
                precio_unidad=float(precio_unidad),
                stock_critico=int(stock_critico),
                stock_bajo=int(stock_bajo),
                creado_por=request.user,
                activo=True
            )
            
            if foto:
                producto.foto = foto
                producto.save()
            
            # Registrar en historial
            HistorialProducto.objects.create(
                producto=producto,
                accion='creacion',
                usuario=request.user,
                detalles=f'Producto creado: {nombre}'
            )
            
            messages.success(request, f'Producto "{nombre}" creado exitosamente')
            return redirect('listar_productos')
            
        except Exception as e:
            messages.error(request, f'Error al crear producto: {str(e)}')
            return redirect('listar_productos')
    
    return redirect('listar_productos')

@login_required
def obtener_producto(request, id):
    """Obtener datos de un producto en formato JSON"""
    try:
        producto = get_object_or_404(Producto, id=id)
        
        creado_por_str = ''
        if producto.creado_por:
            creado_por_str = f"{producto.creado_por.first_name} {producto.creado_por.last_name}".strip()
            if not creado_por_str:
                creado_por_str = producto.creado_por.username
        
        data = {
            'id': producto.id,
            'codigo': producto.codigo,
            'nombre': producto.nombre,
            'descripcion': producto.descripcion or '',
            'stock': producto.stock,
            'unidades_por_caja': producto.unidades_por_caja,
            'precio_unidad': float(producto.precio_unidad),
            'precio_compra': float(producto.precio_compra),
            'precio_caja': float(producto.precio_caja),
            'precio_mayor': float(producto.precio_mayor),
            'stock_critico': producto.stock_critico,
            'stock_bajo': producto.stock_bajo,
            'foto': producto.foto.url if producto.foto else '',
            'creado_por': creado_por_str,
            'fecha_creacion': producto.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
            'fecha_actualizacion': producto.fecha_actualizacion.strftime('%d/%m/%Y %H:%M'),
            'activo': producto.activo,
        }
        return JsonResponse(data)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=404)

@login_required
@require_http_methods(["GET", "POST"])
def editar_producto(request, id):
    """Editar producto existente"""
    producto = get_object_or_404(Producto, id=id)
    
    if request.method == 'POST':
        try:
            # Solo almacén puede editar todos los campos
            # Administrador solo puede editar precio_unidad
            if es_almacen(request):
                # Almacén puede editar todo
                producto.codigo = request.POST.get('codigo', producto.codigo)
                producto.nombre = request.POST.get('nombre', producto.nombre)
                producto.descripcion = request.POST.get('descripcion', '')
                producto.stock = int(request.POST.get('stock', producto.stock))
                producto.unidades_por_caja = int(request.POST.get('unidades_por_caja', producto.unidades_por_caja))
                producto.precio_unidad = float(request.POST.get('precio_unidad', producto.precio_unidad))
                producto.precio_compra = float(request.POST.get('precio_compra', producto.precio_compra))
                producto.precio_caja = float(request.POST.get('precio_caja', producto.precio_caja))
                producto.precio_mayor = float(request.POST.get('precio_mayor', producto.precio_mayor))
                producto.stock_critico = int(request.POST.get('stock_critico', producto.stock_critico))
                producto.stock_bajo = int(request.POST.get('stock_bajo', producto.stock_bajo))
                producto.activo = request.POST.get('activo') == 'on'
                
                # Actualizar foto si se proporciona
                if request.FILES.get('foto'):
                    producto.foto = request.FILES.get('foto')
                
                # Registrar cambios en historial
                cambios = []
                if producto.precio_unidad != float(request.POST.get('precio_unidad', producto.precio_unidad)):
                    cambios.append(f"Precio: {producto.precio_unidad}")
                
                detalles = f"Producto actualizado: {producto.nombre}"
                if cambios:
                    detalles += f" - Cambios: {', '.join(cambios)}"
                
            elif es_administrador(request):
                # Administrador solo puede editar precio_unidad
                nuevo_precio = float(request.POST.get('precio_unidad', producto.precio_unidad))
                if nuevo_precio != producto.precio_unidad:
                    precio_anterior = producto.precio_unidad
                    producto.precio_unidad = nuevo_precio
                    detalles = f"Precio actualizado de {precio_anterior} a {nuevo_precio}"
                else:
                    detalles = f"Producto visualizado: {producto.nombre}"
            else:
                return JsonResponse({'error': 'No tiene permisos para editar'}, status=403)
            
            producto.save()
            
            # Registrar en historial
            HistorialProducto.objects.create(
                producto=producto,
                accion='edicion',
                usuario=request.user,
                detalles=detalles
            )
            
            messages.success(request, f'Producto "{producto.nombre}" actualizado exitosamente')
            return redirect('listar_productos')
            
        except Exception as e:
            messages.error(request, f'Error al actualizar producto: {str(e)}')
            return redirect('listar_productos')
    
    # Si es GET AJAX, retornar datos del producto en JSON
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return obtener_producto(request, id)
    
    return redirect('listar_productos')

@login_required
@require_http_methods(["POST"])
def eliminar_producto(request, id):
    """Eliminar producto - Solo almacén"""
    # Verificar permisos
    if not es_almacen(request):
        messages.error(request, 'No tiene permisos para eliminar productos')
        return redirect('listar_productos')
    
    producto = get_object_or_404(Producto, id=id)
    
    try:
        nombre_producto = producto.nombre
        
        # Registrar en historial antes de eliminar
        HistorialProducto.objects.create(
            producto=producto,
            accion='eliminacion',
            usuario=request.user,
            detalles=f'Producto eliminado: {nombre_producto}'
        )
        
        # Desactivar en lugar de eliminar (soft delete)
        producto.activo = False
        producto.save()
        
        messages.success(request, f'Producto "{nombre_producto}" eliminado correctamente')
        
    except Exception as e:
        messages.error(request, f'Error al eliminar producto: {str(e)}')
    
    return redirect('listar_productos')

@login_required
def historial_producto(request, id):
    """Ver historial de cambios de un producto"""
    # Verificar permisos
    if not verificar_permiso_productos(request):
        messages.error(request, 'No tiene permisos para ver esta página')
        return redirect('dashboard')
    
    producto = get_object_or_404(Producto, id=id)
    historial = HistorialProducto.objects.filter(producto=producto).order_by('-fecha')
    
    context = {
        'producto': producto,
        'historial': historial,
    }
    
    return render(request, 'productos/historial.html', context)

@login_required
def listar_danados(request):
    return render(request, 'productos/danados.html')

@login_required
def registrar_danado(request):
    return render(request, 'productos/registrar_danado.html')

