from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from .models import Traspaso, DetalleTraspaso
from apps.productos.models import Producto
from apps.usuarios.models import PerfilUsuario
from apps.inventario.models import Inventario, MovimientoInventario
from apps.depositos.models import Deposito


def es_almacen_o_tienda(user):
    """Verifica si el usuario es almacén, tienda o depósito"""
    if hasattr(user, 'perfil'):
        return user.perfil.rol in ['almacen', 'tienda', 'deposito']
    return False


def _asegurar_perfiles_deposito(almacen_id=None, tienda_id=None):
    """Crea/actualiza perfiles técnicos de depósito sin crear usuarios."""
    depositos = Deposito.objects.select_related('tienda', 'tienda__almacen')

    if almacen_id:
        depositos = depositos.filter(tienda__almacen_id=almacen_id)
    if tienda_id:
        depositos = depositos.filter(tienda_id=tienda_id)

    for deposito in depositos:
        perfil_existente = PerfilUsuario.objects.filter(
            rol='deposito',
            tienda_id=deposito.tienda_id,
            nombre_ubicacion=deposito.nombre,
        ).order_by('id').first()

        if not perfil_existente:
            perfil_existente = PerfilUsuario.objects.filter(
                rol='deposito',
                usuario__username=f'deposito_auto_{deposito.id}'
            ).order_by('id').first()

        if perfil_existente:
            cambios = []
            if perfil_existente.tienda_id != deposito.tienda_id:
                perfil_existente.tienda_id = deposito.tienda_id
                cambios.append('tienda')
            if perfil_existente.nombre_ubicacion != deposito.nombre:
                perfil_existente.nombre_ubicacion = deposito.nombre
                cambios.append('nombre_ubicacion')
            if perfil_existente.usuario_id:
                perfil_existente.usuario = None
                cambios.append('usuario')

            perfil_tienda = PerfilUsuario.objects.filter(rol='tienda', tienda_id=deposito.tienda_id).first()
            if perfil_existente.ubicacion_relacionada_id != (perfil_tienda.id if perfil_tienda else None):
                perfil_existente.ubicacion_relacionada = perfil_tienda
                cambios.append('ubicacion_relacionada')

            if cambios:
                perfil_existente.save(update_fields=cambios + ['fecha_actualizacion'])
            continue

        perfil_tienda = PerfilUsuario.objects.filter(rol='tienda', tienda_id=deposito.tienda_id).first()

        PerfilUsuario.objects.create(
            usuario=None,
            rol='deposito',
            nombre_ubicacion=deposito.nombre,
            tienda_id=deposito.tienda_id,
            ubicacion_relacionada=perfil_tienda,
            activo=True,
        )


def _origenes_validos_para_usuario(perfil_actual):
    """Retorna queryset de orígenes permitidos para el usuario logueado."""
    if not perfil_actual:
        return PerfilUsuario.objects.none()

    if perfil_actual.rol == 'tienda':
        _asegurar_perfiles_deposito(tienda_id=perfil_actual.tienda_id)

        origen_tienda = PerfilUsuario.objects.filter(
            rol='tienda',
            tienda_id=perfil_actual.tienda_id
        ).order_by('id').first() or perfil_actual

        ids_origen = [origen_tienda.id]

        depositos = PerfilUsuario.objects.filter(
            rol='deposito',
            tienda_id=perfil_actual.tienda_id
        ).order_by('nombre_ubicacion', 'id')

        for deposito in depositos:
            if deposito.id not in ids_origen:
                ids_origen.append(deposito.id)

        return PerfilUsuario.objects.filter(id__in=ids_origen)

    return PerfilUsuario.objects.filter(id=perfil_actual.id)


def _misma_ubicacion_logica(perfil_actual, perfil_objetivo):
    """Evalúa si dos perfiles representan la misma ubicación lógica."""
    if not perfil_actual or not perfil_objetivo:
        return False

    if perfil_actual.id == perfil_objetivo.id:
        return True

    if perfil_actual.rol != perfil_objetivo.rol:
        return False

    if perfil_actual.rol == 'almacen':
        return bool(perfil_actual.almacen_id and perfil_actual.almacen_id == perfil_objetivo.almacen_id)

    if perfil_actual.rol == 'tienda':
        return bool(perfil_actual.tienda_id and perfil_actual.tienda_id == perfil_objetivo.tienda_id)

    if perfil_actual.rol == 'deposito':
        if not perfil_actual.tienda_id or perfil_actual.tienda_id != perfil_objetivo.tienda_id:
            return False

        nombre_actual = (perfil_actual.nombre_ubicacion or '').strip().lower()
        nombre_objetivo = (perfil_objetivo.nombre_ubicacion or '').strip().lower()
        if nombre_actual and nombre_objetivo:
            return nombre_actual == nombre_objetivo

        return bool(
            perfil_actual.ubicacion_relacionada_id
            and perfil_actual.ubicacion_relacionada_id == perfil_objetivo.ubicacion_relacionada_id
        )

    return False


def _puede_operar_en_nombre_de_deposito(perfil_actual, perfil_objetivo):
    """Permite que un perfil de tienda opere traspasos del depósito de su misma tienda."""
    if not perfil_actual or not perfil_objetivo:
        return False

    return (
        perfil_actual.rol == 'tienda'
        and perfil_objetivo.rol == 'deposito'
        and perfil_actual.tienda_id
        and perfil_actual.tienda_id == perfil_objetivo.tienda_id
    )


def _puede_actuar_como_origen(perfil_actual, origen_traspaso):
    return _misma_ubicacion_logica(perfil_actual, origen_traspaso) or _puede_operar_en_nombre_de_deposito(perfil_actual, origen_traspaso)


def _puede_actuar_como_destino(perfil_actual, destino_traspaso):
    return _misma_ubicacion_logica(perfil_actual, destino_traspaso) or _puede_operar_en_nombre_de_deposito(perfil_actual, destino_traspaso)


def _filtro_misma_ubicacion(perfil, prefijo_campo):
    """Construye filtro Q para misma ubicación lógica sobre un campo FK de traspaso."""
    if not perfil:
        return Q(pk__in=[])

    campo_rol = f'{prefijo_campo}__rol'

    if perfil.rol == 'almacen':
        return Q(**{campo_rol: 'almacen', f'{prefijo_campo}__almacen_id': perfil.almacen_id})

    if perfil.rol == 'tienda':
        return Q(**{campo_rol: 'tienda', f'{prefijo_campo}__tienda_id': perfil.tienda_id})

    if perfil.rol == 'deposito':
        q = Q(**{campo_rol: 'deposito', f'{prefijo_campo}__tienda_id': perfil.tienda_id})
        nombre = (perfil.nombre_ubicacion or '').strip()
        if nombre:
            q &= Q(**{f'{prefijo_campo}__nombre_ubicacion': nombre})
        elif perfil.ubicacion_relacionada_id:
            q &= Q(**{f'{prefijo_campo}__ubicacion_relacionada_id': perfil.ubicacion_relacionada_id})
        return q

    return Q(**{f'{prefijo_campo}': perfil})


def _perfil_stock_objetivo(ubicacion):
    """Devuelve el perfil canónico sobre el que se registra stock para esa ubicación lógica."""
    if not ubicacion:
        return ubicacion

    if ubicacion.rol == 'tienda' and ubicacion.tienda_id:
        perfil = PerfilUsuario.objects.filter(rol='tienda', tienda_id=ubicacion.tienda_id).order_by('id').first()
        return perfil or ubicacion

    if ubicacion.rol == 'deposito':
        qs = PerfilUsuario.objects.filter(rol='deposito', tienda_id=ubicacion.tienda_id)
        nombre = (ubicacion.nombre_ubicacion or '').strip()
        if nombre:
            qs = qs.filter(nombre_ubicacion=nombre)
        elif ubicacion.ubicacion_relacionada_id:
            qs = qs.filter(ubicacion_relacionada_id=ubicacion.ubicacion_relacionada_id)

        perfil = qs.order_by('id').first()
        return perfil or ubicacion

    return ubicacion


def _destinos_validos_para_origen(origen):
    """Retorna queryset de destinos válidos según el rol de la ubicación origen."""
    destinos = PerfilUsuario.objects.none()

    if not origen:
        return destinos

    tienda_origen = origen.tienda or (origen.ubicacion_relacionada.tienda if origen.ubicacion_relacionada else None)
    almacen_origen = origen.almacen or (tienda_origen.almacen if tienda_origen else None)

    if origen.rol == 'almacen':
        _asegurar_perfiles_deposito(almacen_id=origen.almacen_id)
        if origen.almacen_id:
            destinos = PerfilUsuario.objects.filter(
                Q(rol='tienda', tienda__almacen_id=origen.almacen_id)
                | Q(rol='deposito', tienda__almacen_id=origen.almacen_id)
                | Q(rol='deposito', ubicacion_relacionada__tienda__almacen_id=origen.almacen_id)
            )
        else:
            destinos = PerfilUsuario.objects.filter(rol__in=['tienda', 'deposito'])

    elif origen.rol == 'tienda':
        _asegurar_perfiles_deposito(tienda_id=origen.tienda_id)
        destinos = PerfilUsuario.objects.filter(
            Q(rol='almacen', almacen_id=origen.tienda.almacen_id if origen.tienda else None)
            | Q(rol='deposito', tienda_id=origen.tienda_id)
            | Q(rol='deposito', ubicacion_relacionada=origen)
        )

    elif origen.rol == 'deposito':
        destinos = PerfilUsuario.objects.filter(
            Q(rol='tienda', id=origen.ubicacion_relacionada_id)
            | Q(rol='tienda', tienda_id=origen.tienda_id)
            | Q(rol='almacen', almacen_id=almacen_origen.id if almacen_origen else None)
        )

    return destinos.exclude(id=origen.id).distinct()


def _stock_disponible_en_ubicacion(producto, ubicacion):
    """Obtiene stock disponible de un producto en una ubicación."""
    ubicacion_stock = _perfil_stock_objetivo(ubicacion)
    inventario = Inventario.objects.filter(producto=producto, ubicacion=ubicacion_stock).first()
    if inventario:
        return inventario.cantidad

    if ubicacion_stock and ubicacion_stock.rol == 'almacen':
        return producto.stock

    return 0


def _ajustar_stock_ubicacion(*, producto, ubicacion, delta, tipo_movimiento, referencia, comentario=''):
    """Ajusta stock por ubicación y registra movimiento."""
    ubicacion_stock = _perfil_stock_objetivo(ubicacion)
    stock_inicial = producto.stock if ubicacion_stock and ubicacion_stock.rol == 'almacen' else 0
    inventario, _ = Inventario.objects.get_or_create(
        producto=producto,
        ubicacion=ubicacion_stock,
        defaults={'cantidad': stock_inicial}
    )

    nueva_cantidad = inventario.cantidad + delta
    if nueva_cantidad < 0:
        raise ValueError(f'Stock insuficiente para {producto.nombre}. Disponible: {inventario.cantidad}')

    inventario.cantidad = nueva_cantidad
    inventario.save(update_fields=['cantidad', 'fecha_actualizacion'])

    MovimientoInventario.objects.create(
        producto=producto,
        ubicacion=ubicacion_stock,
        tipo=tipo_movimiento,
        cantidad=abs(delta),
        referencia=referencia,
        comentario=comentario or referencia,
    )

    if ubicacion_stock and ubicacion_stock.rol == 'almacen':
        producto.stock = nueva_cantidad
        producto.save(update_fields=['stock', 'fecha_actualizacion'])


@login_required
def listar_traspasos(request):
    """Listar traspasos enviados y recibidos"""
    if not es_almacen_o_tienda(request.user):
        messages.error(request, 'No tiene permisos para acceder a traspasos')
        return redirect('dashboard')
    
    # Obtener ubicación actual del usuario
    ubicacion_actual = request.user.perfil if hasattr(request.user, 'perfil') else None
    
    # Traspasos enviados/recibidos por la misma ubicación lógica (no solo el usuario puntual)
    filtro_enviados = _filtro_misma_ubicacion(ubicacion_actual, 'origen')
    filtro_recibidos = _filtro_misma_ubicacion(ubicacion_actual, 'destino')

    # Si es tienda, también incluir traspasos del depósito vinculado a esa tienda
    if ubicacion_actual and ubicacion_actual.rol == 'tienda' and ubicacion_actual.tienda_id:
        filtro_enviados = filtro_enviados | Q(origen__rol='deposito', origen__tienda_id=ubicacion_actual.tienda_id)
        filtro_recibidos = filtro_recibidos | Q(destino__rol='deposito', destino__tienda_id=ubicacion_actual.tienda_id)

    traspasos_enviados = Traspaso.objects.filter(filtro_enviados).distinct()
    traspasos_recibidos = Traspaso.objects.filter(filtro_recibidos).distinct()
    
    # Separar por tipo
    traspasos_enviados_normal = traspasos_enviados.filter(tipo='normal')
    traspasos_enviados_devolucion = traspasos_enviados.filter(tipo='devolucion')
    traspasos_recibidos_normal = traspasos_recibidos.filter(tipo='normal')
    traspasos_recibidos_devolucion = traspasos_recibidos.filter(tipo='devolucion')
    
    context = {
        'traspasos_enviados_normal': traspasos_enviados_normal,
        'traspasos_enviados_devolucion': traspasos_enviados_devolucion,
        'traspasos_recibidos_normal': traspasos_recibidos_normal,
        'traspasos_recibidos_devolucion': traspasos_recibidos_devolucion,
        'ubicacion_actual': ubicacion_actual,
    }
    
    return render(request, 'traspasos/traspasos.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def crear_traspaso(request):
    """Crear nuevo traspaso"""
    if not es_almacen_o_tienda(request.user):
        messages.error(request, 'No tiene permisos para crear traspasos')
        return redirect('dashboard')
    
    ubicacion_actual = request.user.perfil if hasattr(request.user, 'perfil') else None
    
    if request.method == 'POST':
        try:
            tipo = request.POST.get('tipo', 'normal')
            origen_id = request.POST.get('origen')
            destino_id = request.POST.get('destino')
            comentario = request.POST.get('comentario', '')
            productos_ids = request.POST.getlist('producto_id')
            productos_cantidades = request.POST.getlist('cantidad')
            
            if not destino_id:
                return JsonResponse({'error': 'Debe seleccionar destino'}, status=400)
            
            if not productos_ids:
                return JsonResponse({'error': 'Debe agregar al menos un producto'}, status=400)

            origenes_validos = _origenes_validos_para_usuario(ubicacion_actual)
            if origen_id:
                origen = get_object_or_404(origenes_validos, id=origen_id)
            else:
                origen = ubicacion_actual
            
            destinos_validos = _destinos_validos_para_origen(origen)
            destino = get_object_or_404(destinos_validos, id=destino_id)
            
            with transaction.atomic():
                codigo = Traspaso.generar_codigo()
                traspaso = Traspaso.objects.create(
                    codigo=codigo,
                    tipo=tipo,
                    origen=origen,
                    destino=destino,
                    estado='pendiente',
                    comentario=comentario,
                    creado_por=request.user,
                )

                for producto_id, cantidad in zip(productos_ids, productos_cantidades):
                    try:
                        producto = Producto.objects.get(id=producto_id)
                        cantidad = int(cantidad)
                        if cantidad > 0:
                            stock_disponible = _stock_disponible_en_ubicacion(producto, origen)
                            if stock_disponible < cantidad:
                                raise ValueError(
                                    f'Stock insuficiente para {producto.nombre}. Disponible en ubicación: {stock_disponible}'
                                )

                            DetalleTraspaso.objects.create(
                                traspaso=traspaso,
                                producto=producto,
                                cantidad=cantidad
                            )
                    except Producto.DoesNotExist:
                        continue

                if not traspaso.detalles.exists():
                    raise ValueError('Debe agregar al menos un producto')
            
            from apps.notificaciones.models import Notificacion
            Notificacion.objects.create(
                usuario=request.user,
                tipo='general',
                titulo='Traspaso Creado',
                mensaje=f'Se creó el traspaso {codigo}',
                url=f'/traspasos/{traspaso.id}/ver/'
            )
            
            messages.success(request, f'Traspaso {codigo} creado exitosamente')
            return JsonResponse({'success': True, 'traspaso_id': traspaso.id})
            
        except ValueError as e:
            return JsonResponse({'error': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    destinos = _destinos_validos_para_origen(ubicacion_actual)
    productos = Producto.objects.filter(activo=True)
    
    context = {
        'destinos': destinos,
        'productos': productos,
        'ubicacion_actual': ubicacion_actual,
    }
    
    return render(request, 'traspasos/crear.html', context)


@login_required
def ver_traspaso(request, id):
    """Ver detalle de traspaso"""
    traspaso = get_object_or_404(Traspaso, id=id)
    
    ubicacion_actual = request.user.perfil if hasattr(request.user, 'perfil') else None
    if not _puede_actuar_como_origen(ubicacion_actual, traspaso.origen) and not _puede_actuar_como_destino(ubicacion_actual, traspaso.destino):
        messages.error(request, 'No tiene permisos para ver este traspaso')
        return redirect('listar_traspasos')
    
    context = {
        'traspaso': traspaso,
        'detalles': traspaso.detalles.all(),
        'es_origen': _puede_actuar_como_origen(ubicacion_actual, traspaso.origen),
        'es_destino': _puede_actuar_como_destino(ubicacion_actual, traspaso.destino),
    }
    
    return render(request, 'traspasos/ver.html', context)


@login_required
@require_http_methods(["POST"])
def cambiar_estado_traspaso(request, id):
    """Cambiar estado del traspaso"""
    try:
        traspaso = get_object_or_404(Traspaso, id=id)
        ubicacion_actual = request.user.perfil if hasattr(request.user, 'perfil') else None
        nuevo_estado = request.POST.get('estado')
        
        if nuevo_estado == 'transito':
            if not _puede_actuar_como_origen(ubicacion_actual, traspaso.origen):
                return JsonResponse({'error': 'Solo el origen puede cambiar a tránsito'}, status=403)

            if traspaso.estado != 'pendiente':
                return JsonResponse({'error': 'Solo se pueden enviar traspasos pendientes'}, status=400)
            
            with transaction.atomic():
                for detalle in traspaso.detalles.all():
                    stock_disponible = _stock_disponible_en_ubicacion(detalle.producto, traspaso.origen)
                    if stock_disponible < detalle.cantidad:
                        return JsonResponse({
                            'error': f'Stock insuficiente para {detalle.producto.nombre}. Disponible en origen: {stock_disponible}'
                        }, status=400)

                for detalle in traspaso.detalles.all():
                    _ajustar_stock_ubicacion(
                        producto=detalle.producto,
                        ubicacion=traspaso.origen,
                        delta=-detalle.cantidad,
                        tipo_movimiento='traspaso_enviado',
                        referencia=traspaso.codigo,
                        comentario=f'Traspaso enviado hacia {traspaso.destino.nombre_ubicacion or traspaso.destino.usuario.username}'
                    )
            
            traspaso.estado = 'transito'
            traspaso.fecha_envio = timezone.now()
        
        elif nuevo_estado == 'recibido':
            if not _puede_actuar_como_destino(ubicacion_actual, traspaso.destino):
                return JsonResponse({'error': 'Solo el destino puede cambiar a recibido'}, status=403)

            if traspaso.estado != 'transito':
                return JsonResponse({'error': 'Solo se pueden recibir traspasos en tránsito'}, status=400)
            
            with transaction.atomic():
                for detalle in traspaso.detalles.all():
                    _ajustar_stock_ubicacion(
                        producto=detalle.producto,
                        ubicacion=traspaso.destino,
                        delta=detalle.cantidad,
                        tipo_movimiento='traspaso_recibido',
                        referencia=traspaso.codigo,
                        comentario=f'Traspaso recibido desde {traspaso.origen.nombre_ubicacion or traspaso.origen.usuario.username}'
                    )
            
            traspaso.estado = 'recibido'
            traspaso.fecha_recepcion = timezone.now()
            traspaso.aceptado_por = request.user
        
        elif nuevo_estado == 'rechazado':
            if not _puede_actuar_como_destino(ubicacion_actual, traspaso.destino):
                return JsonResponse({'error': 'Solo el destino puede rechazar'}, status=403)

            if traspaso.estado != 'transito':
                return JsonResponse({'error': 'Solo se pueden rechazar traspasos en tránsito'}, status=400)
            
            # Si se rechaza, devolver el stock al origen
            if traspaso.estado == 'transito':
                for detalle in traspaso.detalles.all():
                    _ajustar_stock_ubicacion(
                        producto=detalle.producto,
                        ubicacion=traspaso.origen,
                        delta=detalle.cantidad,
                        tipo_movimiento='traspaso_recibido',
                        referencia=traspaso.codigo,
                        comentario='Reverso por rechazo de traspaso'
                    )
            
            traspaso.estado = 'rechazado'
            traspaso.fecha_recepcion = timezone.now()
        
        elif nuevo_estado == 'cancelado':
            # Solo el origen puede cancelar si está pendiente
            if not _puede_actuar_como_origen(ubicacion_actual, traspaso.origen):
                return JsonResponse({'error': 'Solo el origen puede cancelar'}, status=403)
            
            if traspaso.estado != 'pendiente':
                return JsonResponse({'error': 'Solo se pueden cancelar traspasos pendientes'}, status=400)
            
            traspaso.estado = 'cancelado'
        
        traspaso.save()
        
        return JsonResponse({'success': True, 'nuevo_estado': traspaso.estado})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def generar_pdf_traspaso(request, id):
    """Generar PDF del traspaso"""
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from io import BytesIO
    
    traspaso = get_object_or_404(Traspaso, id=id)
    
    ubicacion_actual = request.user.perfil if hasattr(request.user, 'perfil') else None
    if traspaso.origen != ubicacion_actual and traspaso.destino != ubicacion_actual:
        messages.error(request, 'No tiene permisos')
        return redirect('listar_traspasos')
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#003366'),
        spaceAfter=20,
    )
    
    elements.append(Paragraph('Traspaso de Productos', title_style))
    elements.append(Spacer(1, 0.3*inch))
    
    info_data = [
        ['Código:', traspaso.codigo],
        ['Tipo:', traspaso.get_tipo_display()],
        ['Origen:', str(traspaso.origen)],
        ['Destino:', str(traspaso.destino)],
        ['Estado:', traspaso.get_estado_display()],
    ]
    
    info_table = Table(info_data)
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    elements.append(info_table)
    elements.append(Spacer(1, 0.3*inch))
    
    productos_data = [['Código', 'Producto', 'Cantidad']]
    for detalle in traspaso.detalles.all():
        productos_data.append([detalle.producto.codigo, detalle.producto.nombre, str(detalle.cantidad)])
    
    productos_table = Table(productos_data)
    elements.append(productos_table)
    
    doc.build(elements)
    buffer.seek(0)
    
    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="traspaso_{traspaso.codigo}.pdf"'
    return response


@login_required
def obtener_productos_traspaso(request):
    """Obtener productos disponibles"""
    try:
        ubicacion_actual = request.user.perfil if hasattr(request.user, 'perfil') else None
        if not ubicacion_actual:
            return JsonResponse([], safe=False)

        origen_id = request.GET.get('origen_id')
        origenes_validos = _origenes_validos_para_usuario(ubicacion_actual)
        if origen_id:
            origen = get_object_or_404(origenes_validos, id=origen_id)
        else:
            origen = ubicacion_actual

        if origen.rol == 'almacen':
            productos = Producto.objects.filter(activo=True, stock__gt=0).values(
                'id', 'codigo', 'nombre', 'stock', 'precio_unidad'
            )
            return JsonResponse(list(productos), safe=False)

        origen_stock = _perfil_stock_objetivo(origen)
        inventarios = Inventario.objects.select_related('producto').filter(
            ubicacion=origen_stock,
            cantidad__gt=0,
            producto__activo=True,
        )

        productos = [
            {
                'id': inv.producto.id,
                'codigo': inv.producto.codigo,
                'nombre': inv.producto.nombre,
                'stock': inv.cantidad,
                'precio_unidad': float(inv.producto.precio_unidad),
            }
            for inv in inventarios
        ]
        return JsonResponse(productos, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def obtener_origenes_traspaso(request):
    """Obtener orígenes disponibles para el usuario actual."""
    try:
        ubicacion_actual = request.user.perfil if hasattr(request.user, 'perfil') else None
        origenes = _origenes_validos_para_usuario(ubicacion_actual).select_related('tienda', 'almacen', 'usuario')

        data = []
        for origen in origenes:
            nombre = origen.nombre_ubicacion
            if not nombre and origen.tienda:
                nombre = origen.tienda.nombre
            if not nombre and origen.almacen:
                nombre = origen.almacen.nombre
            if not nombre and origen.usuario:
                nombre = origen.usuario.username

            data.append({
                'id': origen.id,
                'rol': origen.rol,
                'nombre_ubicacion': nombre or 'Sin nombre',
            })

        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def obtener_destinos_traspaso(request):
    """Obtener destinos disponibles"""
    try:
        ubicacion_actual = request.user.perfil if hasattr(request.user, 'perfil') else None
        origen_id = request.GET.get('origen_id')
        origenes_validos = _origenes_validos_para_usuario(ubicacion_actual)
        if origen_id:
            origen = get_object_or_404(origenes_validos, id=origen_id)
        else:
            origen = ubicacion_actual

        destinos = _destinos_validos_para_origen(origen).select_related('tienda', 'almacen', 'usuario')

        data = []
        destinos_unicos = {}

        def clave_destino(destino_obj, nombre_resuelto):
            if destino_obj.rol == 'tienda':
                if destino_obj.tienda_id:
                    return f"tienda:{destino_obj.tienda_id}"
                return f"tienda_nombre:{nombre_resuelto.lower()}"
            if destino_obj.rol == 'deposito':
                if destino_obj.tienda_id:
                    return f"deposito:{destino_obj.tienda_id}:{nombre_resuelto.lower()}"
                return f"deposito_nombre:{nombre_resuelto.lower()}"
            if destino_obj.rol == 'almacen':
                if destino_obj.almacen_id:
                    return f"almacen:{destino_obj.almacen_id}"
                return f"almacen_nombre:{nombre_resuelto.lower()}"
            return f"{destino_obj.rol}:{destino_obj.id}"

        for destino in destinos:
            nombre = destino.nombre_ubicacion
            if not nombre and destino.tienda:
                nombre = destino.tienda.nombre
            if not nombre and destino.almacen:
                nombre = destino.almacen.nombre
            if not nombre and destino.usuario:
                nombre = destino.usuario.username

            nombre_resuelto = nombre or 'Sin nombre'
            clave = clave_destino(destino, nombre_resuelto)

            if clave not in destinos_unicos:
                destinos_unicos[clave] = {
                    'id': destino.id,
                    'nombre_ubicacion': nombre_resuelto,
                    'rol': destino.rol,
                }

        data = list(destinos_unicos.values())

        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
