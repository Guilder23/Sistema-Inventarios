from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.db.models import Q, Sum
from apps.usuarios.models import PerfilUsuario
from apps.productos.models import Producto
from .models import Devolucion
import json


@login_required
@require_http_methods(["GET"])
def listar_devoluciones(request):
    """Lista todas las devoluciones del usuario/almacén"""
    try:
        perfil = PerfilUsuario.objects.get(usuario=request.user)
    except PerfilUsuario.DoesNotExist:
        return render(request, 'devoluciones/devoluciones.html', {
            'devoluciones': [],
            'total_registros': 0,
            'total_pendientes': 0,
            'error': 'No tiene un perfil asignado'
        })
    
    devoluciones = Devolucion.objects.filter(ubicacion=perfil).select_related('producto', 'registrado_por')
    productos = Producto.objects.filter(activo=True).order_by('nombre')
    
    # Filtros
    busqueda = request.GET.get('busqueda', '').strip()
    if busqueda:
        devoluciones = devoluciones.filter(
            Q(producto__codigo__icontains=busqueda) |
            Q(producto__nombre__icontains=busqueda) |
            Q(comentario__icontains=busqueda)
        )
    
    estado_filter = request.GET.get('estado', '').strip()
    if estado_filter:
        devoluciones = devoluciones.filter(estado=estado_filter)
    
    # Estadísticas
    total_registros = devoluciones.count()
    total_pendientes = sum(d.cantidad_pendiente for d in devoluciones)
    
    context = {
        'devoluciones': devoluciones,
        'total_registros': total_registros,
        'total_pendientes': total_pendientes,        'productos': productos,    }
    
    return render(request, 'devoluciones/devoluciones.html', context)


@login_required
@require_http_methods(["POST"])
def registrar_devolucion(request):
    """Registra una nueva devolución"""
    try:
        perfil = PerfilUsuario.objects.get(usuario=request.user)
        producto_id = request.POST.get('producto')
        cantidad = request.POST.get('cantidad')
        comentario = request.POST.get('comentario', '')
        foto = request.FILES.get('foto')
        
        if not producto_id or not cantidad:
            return redirect('devoluciones:listar')
        
        producto = Producto.objects.get(id=producto_id)
        cantidad = int(cantidad)
        
        if cantidad <= 0:
            return redirect('devoluciones:listar')
        
        devolucion = Devolucion.objects.create(
            producto=producto,
            ubicacion=perfil,
            cantidad=cantidad,
            comentario=comentario,
            foto=foto,
            registrado_por=request.user,
            estado='pendiente'
        )
        
        return redirect('devoluciones:listar')
    except Producto.DoesNotExist:
        return redirect('devoluciones:listar')
    except Exception as e:
        return redirect('devoluciones:listar')


@login_required
@require_http_methods(["GET"])
def obtener_devolucion(request, id):
    """Obtiene los detalles de una devolución"""
    try:
        devolucion = Devolucion.objects.select_related('producto', 'registrado_por').get(id=id)
        
        return JsonResponse({
            'success': True,
            'id': devolucion.id,
            'producto_id': devolucion.producto.id,
            'producto_nombre': devolucion.producto.nombre,
            'producto_codigo': devolucion.producto.codigo,
            'cantidad': devolucion.cantidad,
            'cantidad_recuperada': devolucion.cantidad_recuperada,
            'cantidad_repuesta': devolucion.cantidad_repuesta,
            'cantidad_pendiente': devolucion.cantidad_pendiente,
            'comentario': devolucion.comentario or '',
            'estado': devolucion.estado,
            'registrado_por': devolucion.registrado_por.get_full_name() or devolucion.registrado_por.username,
            'fecha_registro': devolucion.fecha_registro.strftime('%d/%m/%Y %H:%M'),
        })
    except Devolucion.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Devolución no encontrada'})


@login_required
@require_http_methods(["POST"])
def agregar_stock_recuperado(request, id):
    """Agrega más devoluciones a un registro existente"""
    try:
        devolucion = Devolucion.objects.get(id=id)
        cantidad_a_agregar = int(request.POST.get('cantidad', 0))
        
        if cantidad_a_agregar <= 0:
            return redirect('devoluciones:listar')
        
        # Suma a la cantidad total de devoluciones
        devolucion.cantidad += cantidad_a_agregar
        
        # Actualizar estado
        if devolucion.cantidad_pendiente == 0:
            devolucion.estado = 'cerrado'
        elif devolucion.cantidad_recuperada > 0 or devolucion.cantidad_repuesta > 0:
            devolucion.estado = 'parcial'
        else:
            devolucion.estado = 'pendiente'
        
        devolucion.save()
        
        return redirect('devoluciones:listar')
    except Devolucion.DoesNotExist:
        return redirect('devoluciones:listar')
    except Exception as e:
        return redirect('devoluciones:listar')


@login_required
@require_http_methods(["POST"])
def agregar_stock_repuesto(request, id):
    """Agrega stock repuesto a una devolución"""
    try:
        devolucion = Devolucion.objects.get(id=id)
        cantidad_a_agregar = int(request.POST.get('cantidad', 0))
        
        if cantidad_a_agregar <= 0:
            return redirect('devoluciones:listar')
        
        nueva_cantidad_repuesta = devolucion.cantidad_repuesta + cantidad_a_agregar
        
        if nueva_cantidad_repuesta > devolucion.cantidad:
            return redirect('devoluciones:listar')
        
        devolucion.cantidad_repuesta = nueva_cantidad_repuesta
        
        # Actualizar estado
        if devolucion.cantidad_pendiente == 0:
            devolucion.estado = 'cerrado'
        elif devolucion.cantidad_recuperada > 0 or devolucion.cantidad_repuesta > 0:
            devolucion.estado = 'parcial'
        
        devolucion.save()
        
        return redirect('devoluciones:listar')
    except Devolucion.DoesNotExist:
        return redirect('devoluciones:listar')
    except Exception as e:
        return redirect('devoluciones:listar')
