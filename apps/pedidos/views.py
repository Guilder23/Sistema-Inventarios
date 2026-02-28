from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db import transaction
from django.utils import timezone
from django.http import JsonResponse

from .models import Pedido, DetallePedido
from apps.productos.models import Producto
from apps.usuarios.models import PerfilUsuario
from apps.inventario.models import Inventario, MovimientoInventario


def _es_rol_permitido(user):
    if not hasattr(user, 'perfil'):
        return False
    return user.perfil.rol in ['tienda', 'almacen', 'administrador']


def _perfil_tienda_canonico(perfil):
    if not perfil:
        return None
    if perfil.rol != 'tienda':
        return perfil
    if not perfil.tienda_id:
        return perfil
    return PerfilUsuario.objects.filter(rol='tienda', tienda_id=perfil.tienda_id).order_by('id').first() or perfil


def _perfil_almacen_canonico(perfil):
    if not perfil:
        return None
    if perfil.rol != 'almacen':
        return perfil
    if not perfil.almacen_id:
        return perfil
    return PerfilUsuario.objects.filter(rol='almacen', almacen_id=perfil.almacen_id).order_by('id').first() or perfil


def _obtener_proveedor_almacen_para_tienda(perfil_tienda):
    if not perfil_tienda or perfil_tienda.rol != 'tienda' or not perfil_tienda.tienda:
        return None
    almacen_id = perfil_tienda.tienda.almacen_id
    if not almacen_id:
        return None
    return PerfilUsuario.objects.filter(rol='almacen', almacen_id=almacen_id).order_by('id').first()


def _stock_disponible_almacen(producto, perfil_almacen):
    if not perfil_almacen:
        return 0

    inventario = Inventario.objects.filter(producto=producto, ubicacion=perfil_almacen).first()
    if inventario:
        return inventario.cantidad
    return producto.stock


def _ajustar_stock(*, producto, ubicacion, delta, tipo_movimiento, referencia, comentario=''):
    inventario, _ = Inventario.objects.get_or_create(
        producto=producto,
        ubicacion=ubicacion,
        defaults={'cantidad': producto.stock if ubicacion.rol == 'almacen' else 0}
    )

    nueva_cantidad = inventario.cantidad + delta
    if nueva_cantidad < 0:
        raise ValueError(f'Stock insuficiente para {producto.nombre}. Disponible: {inventario.cantidad}')

    inventario.cantidad = nueva_cantidad
    inventario.save(update_fields=['cantidad', 'fecha_actualizacion'])

    MovimientoInventario.objects.create(
        producto=producto,
        ubicacion=ubicacion,
        tipo=tipo_movimiento,
        cantidad=abs(delta),
        referencia=referencia,
        comentario=comentario or referencia,
    )

    if ubicacion.rol == 'almacen':
        producto.stock = nueva_cantidad
        producto.save(update_fields=['stock', 'fecha_actualizacion'])


def _obtener_productos_disponibles_para_pedido(proveedor):
    productos_activos = Producto.objects.filter(activo=True).order_by('nombre')
    productos_disponibles = []
    for producto in productos_activos:
        stock = _stock_disponible_almacen(producto, proveedor)
        if stock > 0:
            productos_disponibles.append({'producto': producto, 'stock': stock})
    return productos_disponibles

@login_required
def listar_pedidos(request):
    if not _es_rol_permitido(request.user):
        messages.error(request, 'No tiene permisos para acceder a pedidos')
        return redirect('dashboard')

    perfil = request.user.perfil
    pedidos_solicitados = Pedido.objects.none()
    pedidos_recibidos = Pedido.objects.none()
    proveedor = None
    productos_disponibles = []

    if perfil.rol == 'tienda':
        perfil_tienda = _perfil_tienda_canonico(perfil)
        pedidos_solicitados = Pedido.objects.filter(solicitante=perfil_tienda).prefetch_related('detalles')
        proveedor = _obtener_proveedor_almacen_para_tienda(perfil_tienda)
        if proveedor:
            productos_disponibles = _obtener_productos_disponibles_para_pedido(proveedor)

    elif perfil.rol == 'almacen':
        perfil_almacen = _perfil_almacen_canonico(perfil)
        pedidos_recibidos = Pedido.objects.filter(proveedor=perfil_almacen).prefetch_related('detalles')

    elif perfil.rol == 'administrador' or request.user.is_superuser:
        pedidos_solicitados = Pedido.objects.all().prefetch_related('detalles')

    context = {
        'perfil': perfil,
        'pedidos_solicitados': pedidos_solicitados,
        'pedidos_recibidos': pedidos_recibidos,
        'proveedor': proveedor,
        'productos_disponibles': productos_disponibles,
    }
    return render(request, 'pedidos/listar.html', context)

@login_required
def crear_pedido(request):
    if not hasattr(request.user, 'perfil') or request.user.perfil.rol != 'tienda':
        messages.error(request, 'Solo el personal de tienda puede crear pedidos')
        return redirect('listar_pedidos')

    if request.method != 'POST':
        return redirect('listar_pedidos')

    perfil_tienda = _perfil_tienda_canonico(request.user.perfil)
    proveedor = _obtener_proveedor_almacen_para_tienda(perfil_tienda)

    if not proveedor:
        messages.error(request, 'No se encontró almacén proveedor para su tienda')
        return redirect('listar_pedidos')

    comentario = request.POST.get('comentario', '').strip()
    productos_ids = request.POST.getlist('producto_id')
    cantidades = request.POST.getlist('cantidad')

    if not productos_ids:
        messages.error(request, 'Debe agregar al menos un producto al pedido')
        return redirect('listar_pedidos')

    try:
        with transaction.atomic():
            codigo = Pedido.generar_codigo()
            pedido = Pedido.objects.create(
                codigo=codigo,
                solicitante=perfil_tienda,
                proveedor=proveedor,
                estado='pendiente',
                comentario=comentario,
                creado_por=request.user,
            )

            items_validos = 0
            for producto_id, cantidad in zip(productos_ids, cantidades):
                if not producto_id:
                    continue
                producto = Producto.objects.filter(id=producto_id, activo=True).first()
                if not producto:
                    continue

                cantidad_int = int(cantidad)
                if cantidad_int <= 0:
                    continue

                stock_actual = _stock_disponible_almacen(producto, proveedor)
                if cantidad_int > stock_actual:
                    raise ValueError(
                        f'Cantidad inválida para {producto.nombre}. Disponible en almacén: {stock_actual}'
                    )

                DetallePedido.objects.create(
                    pedido=pedido,
                    producto=producto,
                    cantidad=cantidad_int
                )
                items_validos += 1

            if items_validos == 0:
                raise ValueError('No se agregaron productos válidos al pedido')

        messages.success(request, f'Pedido {codigo} creado exitosamente')
    except ValueError as error:
        messages.error(request, str(error))
    except Exception as error:
        messages.error(request, f'No se pudo crear el pedido: {error}')

    return redirect('listar_pedidos')

@login_required
def ver_pedido(request, id):
    messages.info(request, 'El detalle del pedido se visualiza en el modal de la lista de pedidos')
    return redirect('listar_pedidos')


@login_required
def obtener_pedido(request, id):
    pedido = get_object_or_404(Pedido.objects.prefetch_related('detalles__producto'), id=id)
    perfil = getattr(request.user, 'perfil', None)

    if not perfil:
        return JsonResponse({'error': 'No autorizado'}, status=403)

    es_solicitante = perfil.rol == 'tienda' and perfil.tienda_id and pedido.solicitante.tienda_id == perfil.tienda_id
    es_proveedor = perfil.rol == 'almacen' and perfil.almacen_id and pedido.proveedor.almacen_id == perfil.almacen_id
    es_admin = perfil.rol == 'administrador' or request.user.is_superuser

    if not (es_solicitante or es_proveedor or es_admin):
        return JsonResponse({'error': 'No autorizado'}, status=403)

    detalles = [
        {
            'codigo': detalle.producto.codigo,
            'nombre': detalle.producto.nombre,
            'cantidad': detalle.cantidad,
        }
        for detalle in pedido.detalles.all()
    ]

    return JsonResponse({
        'id': pedido.id,
        'codigo': pedido.codigo,
        'estado': pedido.estado,
        'estado_display': pedido.get_estado_display(),
        'solicitante': pedido.solicitante.nombre_ubicacion or 'Tienda',
        'proveedor': pedido.proveedor.nombre_ubicacion or 'Almacén',
        'comentario': pedido.comentario or '',
        'fecha_solicitud': timezone.localtime(pedido.fecha_solicitud).strftime('%d/%m/%Y %H:%M'),
        'detalles': detalles,
        'es_solicitante': es_solicitante,
        'es_proveedor': es_proveedor,
        'es_admin': es_admin,
        'acciones': {
            'puede_aceptar': es_proveedor and pedido.estado == 'pendiente',
            'puede_enviar': es_proveedor and pedido.estado == 'aceptado',
            'puede_recibir': es_solicitante and pedido.estado == 'enviado',
            'puede_cancelar': (es_solicitante or es_proveedor) and pedido.estado == 'pendiente',
        }
    })

@login_required
def aceptar_pedido(request, id):
    if request.method != 'POST':
        return redirect('ver_pedido', id=id)

    pedido = get_object_or_404(Pedido.objects.prefetch_related('detalles__producto'), id=id)
    perfil = getattr(request.user, 'perfil', None)

    if not perfil or perfil.rol != 'almacen' or not perfil.almacen_id or pedido.proveedor.almacen_id != perfil.almacen_id:
        messages.error(request, 'Solo el almacén proveedor puede aceptar el pedido')
        return redirect('ver_pedido', id=id)

    if pedido.estado != 'pendiente':
        messages.error(request, 'Solo se pueden aceptar pedidos pendientes')
        return redirect('ver_pedido', id=id)

    for detalle in pedido.detalles.all():
        stock_actual = _stock_disponible_almacen(detalle.producto, pedido.proveedor)
        if detalle.cantidad > stock_actual:
            messages.error(
                request,
                f'Stock insuficiente para {detalle.producto.nombre}. Disponible en almacén: {stock_actual}'
            )
            return redirect('ver_pedido', id=id)

    pedido.estado = 'aceptado'
    pedido.fecha_actualizacion = timezone.now()
    pedido.save(update_fields=['estado', 'fecha_actualizacion'])
    messages.success(request, f'Pedido {pedido.codigo} aceptado')
    return redirect('listar_pedidos')


@login_required
def enviar_pedido(request, id):
    if request.method != 'POST':
        return redirect('ver_pedido', id=id)

    pedido = get_object_or_404(Pedido.objects.prefetch_related('detalles__producto'), id=id)
    perfil = getattr(request.user, 'perfil', None)

    if not perfil or perfil.rol != 'almacen' or not perfil.almacen_id or pedido.proveedor.almacen_id != perfil.almacen_id:
        messages.error(request, 'Solo el almacén proveedor puede enviar el pedido')
        return redirect('ver_pedido', id=id)

    if pedido.estado != 'aceptado':
        messages.error(request, 'Solo se pueden enviar pedidos aceptados')
        return redirect('ver_pedido', id=id)

    try:
        with transaction.atomic():
            for detalle in pedido.detalles.all():
                stock_actual = _stock_disponible_almacen(detalle.producto, pedido.proveedor)
                if detalle.cantidad > stock_actual:
                    raise ValueError(
                        f'Stock insuficiente para {detalle.producto.nombre}. Disponible en almacén: {stock_actual}'
                    )

            for detalle in pedido.detalles.all():
                _ajustar_stock(
                    producto=detalle.producto,
                    ubicacion=pedido.proveedor,
                    delta=-detalle.cantidad,
                    tipo_movimiento='salida',
                    referencia=pedido.codigo,
                    comentario=f'Pedido enviado a {pedido.solicitante.nombre_ubicacion}'
                )

            pedido.estado = 'enviado'
            pedido.save(update_fields=['estado', 'fecha_actualizacion'])

        messages.success(request, f'Pedido {pedido.codigo} enviado correctamente')
    except ValueError as error:
        messages.error(request, str(error))
    except Exception as error:
        messages.error(request, f'No se pudo enviar el pedido: {error}')

    return redirect('ver_pedido', id=id)


@login_required
def recibir_pedido(request, id):
    if request.method != 'POST':
        return redirect('ver_pedido', id=id)

    pedido = get_object_or_404(Pedido.objects.prefetch_related('detalles__producto'), id=id)
    perfil = getattr(request.user, 'perfil', None)

    if not perfil or perfil.rol != 'tienda' or not perfil.tienda_id or pedido.solicitante.tienda_id != perfil.tienda_id:
        messages.error(request, 'Solo la tienda solicitante puede recibir el pedido')
        return redirect('ver_pedido', id=id)

    if pedido.estado != 'enviado':
        messages.error(request, 'Solo se pueden recibir pedidos enviados')
        return redirect('ver_pedido', id=id)

    try:
        with transaction.atomic():
            for detalle in pedido.detalles.all():
                _ajustar_stock(
                    producto=detalle.producto,
                    ubicacion=pedido.solicitante,
                    delta=detalle.cantidad,
                    tipo_movimiento='entrada',
                    referencia=pedido.codigo,
                    comentario=f'Pedido recibido desde {pedido.proveedor.nombre_ubicacion}'
                )

            pedido.estado = 'recibido'
            pedido.save(update_fields=['estado', 'fecha_actualizacion'])

        messages.success(request, f'Pedido {pedido.codigo} recibido correctamente')
    except Exception as error:
        messages.error(request, f'No se pudo recibir el pedido: {error}')

    return redirect('ver_pedido', id=id)

@login_required
def cancelar_pedido(request, id):
    if request.method != 'POST':
        return redirect('ver_pedido', id=id)

    pedido = get_object_or_404(Pedido, id=id)
    perfil = getattr(request.user, 'perfil', None)

    if not perfil:
        messages.error(request, 'No tiene permisos para cancelar este pedido')
        return redirect('ver_pedido', id=id)

    es_tienda_dueña = perfil.rol == 'tienda' and perfil.tienda_id and pedido.solicitante.tienda_id == perfil.tienda_id
    es_almacen_proveedor = perfil.rol == 'almacen' and perfil.almacen_id and pedido.proveedor.almacen_id == perfil.almacen_id

    if not (es_tienda_dueña or es_almacen_proveedor):
        messages.error(request, 'No tiene permisos para cancelar este pedido')
        return redirect('ver_pedido', id=id)

    if pedido.estado != 'pendiente':
        messages.error(request, 'Solo se pueden cancelar pedidos pendientes')
        return redirect('ver_pedido', id=id)

    pedido.estado = 'cancelado'
    pedido.save(update_fields=['estado', 'fecha_actualizacion'])
    messages.warning(request, f'Pedido {pedido.codigo} cancelado')
    return redirect('listar_pedidos')
