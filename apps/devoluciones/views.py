from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from django.db.models import Q, Sum
from django.db import transaction
from apps.usuarios.models import PerfilUsuario
from apps.productos.models import Producto, HistorialProducto
from apps.inventario.models import MovimientoInventario
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
    except PerfilUsuario.DoesNotExist:
        messages.error(request, 'No tiene un perfil asignado')
        return redirect('devoluciones:listar')
    
    try:
        producto_id = request.POST.get('producto')
        cantidad = request.POST.get('cantidad')
        comentario = request.POST.get('comentario', '').strip()
        foto = request.FILES.get('foto')
        
        if not producto_id:
            messages.error(request, 'Debe seleccionar un producto')
            return redirect('devoluciones:listar')
        
        producto = get_object_or_404(Producto, id=producto_id, activo=True)
        cantidad = int(cantidad)
        
        if cantidad <= 0:
            messages.error(request, 'La cantidad debe ser mayor a 0')
            return redirect('devoluciones:listar')
        
        with transaction.atomic():
            # NO se reduce el stock - las devoluciones no afectan el inventario inicial
            devolucion = Devolucion.objects.create(
                producto=producto,
                ubicacion=perfil,
                cantidad=cantidad,
                comentario=comentario,
                foto=foto,
                registrado_por=request.user,
                estado='pendiente'
            )
            
            # Registrar en historial
            HistorialProducto.objects.create(
                producto=producto,
                accion='edicion',
                usuario=request.user,
                detalles=f'Registro de devolución #{devolucion.id}: {cantidad} unidades. Comentario: {comentario or "Sin comentario"}'
            )
            
            # Registrar movimiento
            MovimientoInventario.objects.create(
                producto=producto,
                ubicacion=perfil,
                tipo='devolucion',
                cantidad=cantidad,
                referencia=f'DEV-{devolucion.id}',
                comentario=comentario or 'Registro de devolución'
            )
        
        messages.success(request, f'Devolución registrada para {producto.nombre}: {cantidad} unidades')
        return redirect('devoluciones:listar')
    except ValueError:
        messages.error(request, 'Cantidad inválida')
        return redirect('devoluciones:listar')
    except Exception as e:
        messages.error(request, f'Error al registrar devolución: {str(e)}')
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
def agregar_mas_devolucion(request, id):
    """Agrega más unidades devueltas a un registro existente"""
    try:
        perfil = PerfilUsuario.objects.get(usuario=request.user)
    except PerfilUsuario.DoesNotExist:
        messages.error(request, 'No tiene un perfil asignado')
        return redirect('devoluciones:listar')
    
    devolucion = get_object_or_404(Devolucion.objects.select_related('producto'), id=id, ubicacion=perfil)
    
    try:
        cantidad = int(request.POST.get('cantidad', 0))
    except ValueError:
        messages.error(request, 'Cantidad inválida')
        return redirect('devoluciones:listar')
    
    if cantidad <= 0:
        messages.error(request, 'La cantidad debe ser mayor a 0')
        return redirect('devoluciones:listar')
    
    comentario = request.POST.get('comentario', '').strip()
    
    with transaction.atomic():
        # Agregar más unidades devueltas (NO afecta el stock)
        devolucion.cantidad += cantidad
        
        # Actualizar estado si es necesario
        if devolucion.cantidad_pendiente == 0:
            devolucion.estado = 'cerrado'
        elif devolucion.cantidad_recuperada > 0 or devolucion.cantidad_repuesta > 0:
            devolucion.estado = 'parcial'
        else:
            devolucion.estado = 'pendiente'
        
        devolucion.save(update_fields=['cantidad', 'estado'])
        
        # Registrar en historial
        HistorialProducto.objects.create(
            producto=devolucion.producto,
            accion='edicion',
            usuario=request.user,
            detalles=f'Se agregaron {cantidad} unidades devueltas al registro #{devolucion.id}. Pendiente actual: {devolucion.cantidad_pendiente}'
        )
        
        # Registrar movimiento
        MovimientoInventario.objects.create(
            producto=devolucion.producto,
            ubicacion=perfil,
            tipo='devolucion',
            cantidad=cantidad,
            referencia=f'DEV-{devolucion.id}',
            comentario=comentario or f'Ampliación de devolución #{devolucion.id}'
        )
    
    messages.success(request, f'Se agregaron {cantidad} unidades devueltas de {devolucion.producto.nombre}')
    return redirect('devoluciones:listar')


@login_required
@require_http_methods(["POST"])
def agregar_stock_recuperado(request, id):
    """Marca productos como recuperados y los agrega al inventario"""
    try:
        perfil = PerfilUsuario.objects.get(usuario=request.user)
    except PerfilUsuario.DoesNotExist:
        messages.error(request, 'No tiene un perfil asignado')
        return redirect('devoluciones:listar')
    
    devolucion = get_object_or_404(Devolucion.objects.select_related('producto'), id=id, ubicacion=perfil)
    
    try:
        cantidad = int(request.POST.get('cantidad', 0))
    except ValueError:
        messages.error(request, 'Cantidad inválida')
        return redirect('devoluciones:listar')
    
    if cantidad <= 0:
        messages.error(request, 'La cantidad debe ser mayor a 0')
        return redirect('devoluciones:listar')
    
    if cantidad > devolucion.cantidad_pendiente:
        messages.error(request, f'La cantidad excede lo pendiente ({devolucion.cantidad_pendiente})')
        return redirect('devoluciones:listar')
    
    comentario = request.POST.get('comentario', '').strip()
    
    with transaction.atomic():
        # Marcar como recuperado
        devolucion.cantidad_recuperada += cantidad
        
        # Actualizar estado
        if devolucion.cantidad_pendiente == 0:
            devolucion.estado = 'cerrado'
        elif devolucion.cantidad_recuperada > 0 or devolucion.cantidad_repuesta > 0:
            devolucion.estado = 'parcial'
        
        devolucion.save(update_fields=['cantidad_recuperada', 'estado'])
        
        # Aumentar stock usando el método del modelo
        if not devolucion.producto.aumentar_stock(cantidad, request.user):
            messages.error(request, 'Error al aumentar el stock')
            return redirect('devoluciones:listar')
        
        # Registrar en historial
        HistorialProducto.objects.create(
            producto=devolucion.producto,
            accion='edicion',
            usuario=request.user,
            detalles=f'Recuperación de devolución #{devolucion.id}: +{cantidad} unidades. Estado: {devolucion.get_estado_display()}'
        )
        
        # Registrar movimiento
        MovimientoInventario.objects.create(
            producto=devolucion.producto,
            ubicacion=perfil,
            tipo='entrada',
            cantidad=cantidad,
            referencia=f'DEV-{devolucion.id}',
            comentario=comentario or f'Recuperación de devolución #{devolucion.id}'
        )
    
    messages.success(request, f'Stock recuperado correctamente: +{cantidad} unidades de {devolucion.producto.nombre}')
    return redirect('devoluciones:listar')


@login_required
@require_http_methods(["POST"])
def agregar_stock_repuesto(request, id):
    """Marca productos como repuestos y los agrega al inventario"""
    try:
        perfil = PerfilUsuario.objects.get(usuario=request.user)
    except PerfilUsuario.DoesNotExist:
        messages.error(request, 'No tiene un perfil asignado')
        return redirect('devoluciones:listar')
    
    devolucion = get_object_or_404(Devolucion.objects.select_related('producto'), id=id, ubicacion=perfil)
    
    try:
        cantidad = int(request.POST.get('cantidad', 0))
    except ValueError:
        messages.error(request, 'Cantidad inválida')
        return redirect('devoluciones:listar')
    
    if cantidad <= 0:
        messages.error(request, 'La cantidad debe ser mayor a 0')
        return redirect('devoluciones:listar')
    
    if cantidad > devolucion.cantidad_pendiente:
        messages.error(request, f'La cantidad excede lo pendiente ({devolucion.cantidad_pendiente})')
        return redirect('devoluciones:listar')
    
    comentario = request.POST.get('comentario', '').strip()
    
    with transaction.atomic():
        # Marcar como repuesto
        devolucion.cantidad_repuesta += cantidad
        
        # Actualizar estado
        if devolucion.cantidad_pendiente == 0:
            devolucion.estado = 'cerrado'
        elif devolucion.cantidad_recuperada > 0 or devolucion.cantidad_repuesta > 0:
            devolucion.estado = 'parcial'
        
        devolucion.save(update_fields=['cantidad_repuesta', 'estado'])
        
        # Aumentar stock usando el método del modelo
        if not devolucion.producto.aumentar_stock(cantidad, request.user):
            messages.error(request, 'Error al aumentar el stock')
            return redirect('devoluciones:listar')
        
        # Registrar en historial
        HistorialProducto.objects.create(
            producto=devolucion.producto,
            accion='edicion',
            usuario=request.user,
            detalles=f'Reposición de devolución #{devolucion.id}: +{cantidad} unidades. Estado: {devolucion.get_estado_display()}'
        )
        
        # Registrar movimiento
        MovimientoInventario.objects.create(
            producto=devolucion.producto,
            ubicacion=perfil,
            tipo='entrada',
            cantidad=cantidad,
            referencia=f'DEV-{devolucion.id}',
            comentario=comentario or f'Reposición de devolución #{devolucion.id}'
        )
    
    messages.success(request, f'Stock repuesto correctamente: +{cantidad} unidades de {devolucion.producto.nombre}')
    return redirect('devoluciones:listar')
