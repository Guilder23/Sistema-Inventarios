from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from .models import Traspaso, DetalleTraspaso
from apps.productos.models import Producto, ProductoContenedor
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
    """
    Ajusta stock según el tipo de ubicación:
    - ALMACÉN: Usa ProductoContenedor (reductor de cantidad en contenedores)
    - TIENDA/DEPÓSITO: Usa tabla Inventario (stock por ubicación)
    """
    from apps.productos.models import ProductoContenedor, Contenedor
    
    ubicacion_stock = _perfil_stock_objetivo(ubicacion)
    
    if not ubicacion_stock:
        raise ValueError('No hay ubicación objetivo para ajustar stock')
    
    # CASO ALMACÉN: Ajustar ProductoContenedor
    if ubicacion_stock.rol == 'almacen':
        if delta < 0:
            # RESTAR stock de contenedores (envío)
            cantidad_a_restar = abs(delta)
            pcs = ProductoContenedor.objects.filter(producto=producto).order_by('id')
            
            for pc in pcs:
                if cantidad_a_restar <= 0:
                    break
                
                ajuste = min(pc.cantidad, cantidad_a_restar)
                pc.cantidad -= ajuste
                pc.save(update_fields=['cantidad', 'fecha_actualizacion'])
                cantidad_a_restar -= ajuste
            
            if cantidad_a_restar > 0:
                raise ValueError(f'Stock insuficiente para {producto.nombre}. No se pudo restar {cantidad_a_restar} unidades.')
        else:
            # SUMAR stock a contenedores (recepción)
            # Buscar un contenedor existente del producto o crear uno genérico
            productos_contenedores = ProductoContenedor.objects.filter(producto=producto).first()
            
            if productos_contenedores:
                contenedor = productos_contenedores.contenedor
            else:
                # Crear un contenedor genérico si no existe
                contenedor, _ = Contenedor.objects.get_or_create(
                    nombre='Contenedor Genérico',
                    defaults={'proveedor': 'Sin Proveedor'}
                )
            
            pc, creado = ProductoContenedor.objects.get_or_create(
                producto=producto,
                contenedor=contenedor,
                defaults={'cantidad_recibida': delta, 'cantidad': delta}
            )
            if not creado:
                # Si ya existe, solo aumentar cantidad disponible
                pc.cantidad += delta
                pc.save(update_fields=['cantidad', 'fecha_actualizacion'])
    
    # CASO TIENDA/DEPÓSITO: Ajustar Inventario
    else:
        inventario, _ = Inventario.objects.get_or_create(
            producto=producto,
            ubicacion=ubicacion_stock,
            defaults={'cantidad': 0}
        )
        
        nueva_cantidad = inventario.cantidad + delta
        if nueva_cantidad < 0:
            raise ValueError(
                f'Stock insuficiente para {producto.nombre}. '
                f'Disponible: {inventario.cantidad}, solicitado: {abs(delta)}'
            )
        
        inventario.cantidad = nueva_cantidad
        inventario.save(update_fields=['cantidad', 'fecha_actualizacion'])
    
    # Registrar movimiento en todo caso
    MovimientoInventario.objects.create(
        producto=producto,
        ubicacion=ubicacion_stock,
        tipo=tipo_movimiento,
        cantidad=abs(delta),
        referencia=referencia,
        comentario=comentario or referencia,
    )



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
        return JsonResponse({'error': 'No tiene permisos para crear traspasos'}, status=403)
    
    ubicacion_actual = request.user.perfil if hasattr(request.user, 'perfil') else None
    
    if request.method == 'POST':
        try:
            # Obtener parámetros
            tipo = request.POST.get('tipo', 'normal')
            origen_id = request.POST.get('origen')
            destino_id = request.POST.get('destino')
            comentario = request.POST.get('comentario', '')
            productos_ids = request.POST.getlist('producto_id')
            productos_cantidades = request.POST.getlist('cantidad')
            
            # Validar datos básicos
            if not destino_id:
                return JsonResponse({'error': 'Debe seleccionar un destino'}, status=400)
            
            if not productos_ids or len(productos_ids) == 0:
                return JsonResponse({'error': 'Debe agregar al menos un producto'}, status=400)
            
            if len(productos_ids) != len(productos_cantidades):
                return JsonResponse({'error': 'Error en la cantidad de elementos'}, status=400)

            # Obtener y validar origen
            origenes_validos = _origenes_validos_para_usuario(ubicacion_actual)
            if origen_id:
                try:
                    origen = origenes_validos.get(id=int(origen_id))
                    if not origen:
                        return JsonResponse({'error': 'Origen no válido'}, status=400)
                except (ValueError, TypeError):
                    return JsonResponse({'error': 'ID de origen inválido'}, status=400)
            else:
                origen = ubicacion_actual
            
            if not origen:
                return JsonResponse({'error': 'No hay origen disponible'}, status=400)
            
            # Obtener y validar destino
            destinos_validos = _destinos_validos_para_origen(origen)
            try:
                destino = destinos_validos.get(id=int(destino_id))
                if not destino:
                    return JsonResponse({'error': 'Destino no válido para este origen'}, status=400)
            except (ValueError, TypeError):
                return JsonResponse({'error': 'ID de destino inválido'}, status=400)
            
            # Crear traspaso y detalles
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

                detalles_creados = 0
                for producto_id, cantidad in zip(productos_ids, productos_cantidades):
                    try:
                        producto_id = int(producto_id)
                        cantidad = int(cantidad)
                    except (ValueError, TypeError):
                        continue
                    
                    if cantidad <= 0:
                        continue
                    
                    try:
                        producto = Producto.objects.get(id=producto_id, activo=True)
                    except Producto.DoesNotExist:
                        continue

                    # Verificar stock disponible
                    stock_disponible = _stock_disponible_en_ubicacion(producto, origen)
                    if stock_disponible < cantidad:
                        raise ValueError(
                            f'Stock insuficiente para {producto.nombre}. '
                            f'Disponible: {stock_disponible}, solicitado: {cantidad}'
                        )

                    DetalleTraspaso.objects.create(
                        traspaso=traspaso,
                        producto=producto,
                        cantidad=cantidad
                    )
                    detalles_creados += 1

                if detalles_creados == 0:
                    raise ValueError('No se pudo crear ningún detalle de traspaso con validez')
            
            # Crear notificación
            from apps.notificaciones.models import Notificacion
            Notificacion.objects.create(
                usuario=request.user,
                tipo='general',
                titulo='Traspaso Creado',
                mensaje=f'Se creó el traspaso {codigo}',
                url=f'/traspasos/{traspaso.id}/ver/'
            )
            
            return JsonResponse({'success': True, 'traspaso_id': traspaso.id})
            
        except ValueError as e:
            return JsonResponse({'error': str(e)}, status=400)
        except Exception as e:
            import traceback
            print(f"ERROR crear_traspaso: {str(e)}")
            print(traceback.format_exc())
            return JsonResponse({'error': f'Error: {str(e)}'}, status=500)
    
    # GET - mostrar formulario
    destinos = _destinos_validos_para_origen(ubicacion_actual)
    
    context = {
        'destinos': destinos,
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
            with transaction.atomic():
                for detalle in traspaso.detalles.all():
                    _ajustar_stock_ubicacion(
                        producto=detalle.producto,
                        ubicacion=traspaso.origen,
                        delta=detalle.cantidad,
                        tipo_movimiento='devolucion',
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
    import os
    from django.conf import settings
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from io import BytesIO

    traspaso = get_object_or_404(Traspaso, id=id)

    ubicacion_actual = request.user.perfil if hasattr(request.user, 'perfil') else None
    if traspaso.origen != ubicacion_actual and traspaso.destino != ubicacion_actual:
        messages.error(request, 'No tiene permisos')
        return redirect('listar_traspasos')

    now = timezone.localtime()
    fecha = now.strftime('%d/%m/%Y')
    hora = now.strftime('%H:%M')

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.3*inch, bottomMargin=0.3*inch, leftMargin=0.3*inch, rightMargin=0.3*inch)
    elements = []

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=16, textColor=colors.HexColor('#003366'), alignment=TA_CENTER, spaceAfter=12, fontName='Helvetica-Bold')
    label_style = ParagraphStyle('Label', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#1f2937'))
    value_style = ParagraphStyle('Value', parent=styles['Normal'], fontName='Helvetica', fontSize=9, textColor=colors.HexColor('#1f2937'))
    table_header_style = ParagraphStyle('TableHeader', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=colors.white, alignment=TA_CENTER)
    table_value_style = ParagraphStyle('TableValue', parent=styles['Normal'], fontName='Helvetica', fontSize=9, textColor=colors.HexColor('#0f172a'))
    table_quantity_style = ParagraphStyle('TableQuantity', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#0f172a'), alignment=TA_RIGHT)

    logo_path = os.path.join(settings.BASE_DIR, 'static', 'img', 'logoAlmacen.png')
    logo = None
    if os.path.exists(logo_path):
        try:
            logo = RLImage(logo_path, width=0.75*inch, height=0.75*inch)
        except Exception:
            logo = None

    company_name = Paragraph('ALMAZEN', ParagraphStyle('CompanyTitle', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#111827'), fontName='Helvetica-Bold'))
    company_tagline = Paragraph('Importadora por mayor y menor', ParagraphStyle('CompanyTagline', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#4b5563'), italic=True))

    intro_table = Table([[logo or '', [company_name, company_tagline]]], colWidths=[0.9*inch, 5.6*inch])
    intro_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0)]))
    elements.append(intro_table)
    elements.append(Spacer(1, 0.08*inch))

    elements.append(Paragraph('COMPROBANTE DE TRASPASO', ParagraphStyle('DocTitle', parent=styles['Heading1'], fontSize=18, alignment=TA_CENTER, textColor=colors.HexColor('#111827'), fontName='Helvetica-Bold')))
    elements.append(Spacer(1, 0.18*inch))

    # Información en formato de texto normal con etiquetas en negrilla
    info_text = []
    info_text.append(Paragraph('<b>Código:</b> ' + str(traspaso.codigo), value_style))
    info_text.append(Paragraph('<b>Fecha:</b> ' + f'{fecha} {hora}', value_style))
    info_text.append(Paragraph('<b>Origen:</b> ' + str(traspaso.origen), value_style))
    info_text.append(Paragraph('<b>Destino:</b> ' + str(traspaso.destino), value_style))
    info_text.append(Paragraph('<b>Estado:</b> ' + traspaso.get_estado_display(), value_style))
    info_text.append(Paragraph('<b>Tipo:</b> ' + traspaso.get_tipo_display(), value_style))
    
    for paragraph in info_text:
        elements.append(paragraph)
        elements.append(Spacer(1, 0.03*inch))
    
    elements.append(Spacer(1, 0.1*inch))

    # Tabla de productos (imagen, código, nombre, descripción, cantidad unidad, cantidad caja)
    productos_data = [[
        Paragraph('<b>Imagen</b>', table_header_style),
        Paragraph('<b>Código</b>', table_header_style),
        Paragraph('<b>Nombre Producto</b>', table_header_style),
        Paragraph('<b>Descripción</b>', table_header_style),
        Paragraph('<b>Cantidad Unidad</b>', table_header_style),
        Paragraph('<b>Cantidad Caja</b>', table_header_style),
    ]]

    def resolve_image(detalle):
        if not detalle.producto.foto:
            return Paragraph('Sin imagen', ParagraphStyle('NoImage', parent=styles['Normal'], fontSize=7, textColor=colors.HexColor('#9ca3af'), alignment=TA_CENTER))
        
        try:
            # Intentar obtener la URL de la imagen (para Blackblaze u otros storages remotos)
            if hasattr(detalle.producto.foto, 'url'):
                img_url = detalle.producto.foto.url
                try:
                    # Descargar la imagen desde la URL
                    import requests
                    from io import BytesIO as BIO
                    response = requests.get(img_url, timeout=5)
                    if response.status_code == 200:
                        img_buffer = BIO(response.content)
                        img = RLImage(img_buffer, width=0.3*inch, height=0.3*inch)
                        return img
                except Exception as e:
                    print(f"Error loading image from URL {img_url}: {str(e)}")
            
            # Fallback: intentar obtener archivo local
            path_img = None
            try:
                if hasattr(detalle.producto.foto, 'path'):
                    path_img = detalle.producto.foto.path
            except Exception:
                pass
            
            # Si no se obtuvo por .path, construir manualmente
            if not path_img or not os.path.exists(path_img):
                if detalle.producto.foto.name:
                    path_img = os.path.join(settings.MEDIA_ROOT, detalle.producto.foto.name)
            
            # Validar que el archivo local exista
            if path_img and os.path.exists(path_img):
                try:
                    img = RLImage(path_img, width=0.3*inch, height=0.3*inch)
                    return img
                except Exception as e:
                    print(f"Error loading local image {path_img}: {str(e)}")
        
        except Exception as e:
            print(f"Error in resolve_image: {str(e)}")
        
        return Paragraph('Sin imagen', ParagraphStyle('NoImage', parent=styles['Normal'], fontSize=7, textColor=colors.HexColor('#9ca3af'), alignment=TA_CENTER))

    def cantidad_cajas(detalle):
        unidades_por_caja = int(detalle.producto.unidades_por_caja or 0)
        if unidades_por_caja <= 0:
            return '0'

        cajas = float(detalle.cantidad or 0) / unidades_por_caja
        if cajas.is_integer():
            return str(int(cajas))
        return f'{cajas:.2f}'

    for detalle in traspaso.detalles.all():
        descripcion = (detalle.producto.descripcion or '').strip() or '-'

        productos_data.append([
            resolve_image(detalle),
            Paragraph(str(detalle.producto.codigo), table_value_style),
            Paragraph(str(detalle.producto.nombre), table_value_style),
            Paragraph(descripcion, table_value_style),
            Paragraph(str(detalle.cantidad), table_quantity_style),
            Paragraph(cantidad_cajas(detalle), table_quantity_style),
        ])

    productos_table = Table(productos_data, colWidths=[0.55*inch, 0.85*inch, 1.55*inch, 2.35*inch, 0.9*inch, 0.8*inch], repeatRows=1)
    table_style = [
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#ffffff")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (4, 1), (5, -1), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWHEIGHTS', (0, 1), (-1, -1), 0.35*inch),
    ]

    for i in range(1, len(productos_data)):
        color_fila = colors.HexColor('#f8fafc') if i % 2 == 1 else colors.white
        table_style.append(('BACKGROUND', (0, i), (-1, i), color_fila))

    productos_table.setStyle(TableStyle(table_style))
    elements.append(productos_table)
    elements.append(Spacer(1, 0.28*inch))
    elements.append(Spacer(1, 0.28*inch))

    # Firma con lineas y etiquetas (origen/destino al nivel de 'Nombre y firma')
    firma_line = Paragraph('___________________________', ParagraphStyle('FirmaLine', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#0f172a'), alignment=TA_CENTER))
    firma_label = Paragraph('Nombre y firma', ParagraphStyle('FirmaLabel', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#4b5563'), alignment=TA_CENTER))

    firma_table = Table([
        [firma_line, firma_line],
        [Paragraph(f'{traspaso.origen}', ParagraphStyle('FirmaTitulo', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#1f2937'), fontName='Helvetica-Bold', alignment=TA_CENTER)),
         Paragraph(f'{traspaso.destino}', ParagraphStyle('FirmaTitulo', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#1f2937'), fontName='Helvetica-Bold', alignment=TA_CENTER))],
        [firma_label, firma_label],
    ], colWidths=[3.4*inch, 3.4*inch], hAlign='LEFT')

    firma_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(firma_table)
    elements.append(Spacer(1, 0.2*inch))

    comentario_texto = str(traspaso.comentario) if traspaso.comentario else 'Sin comentario'
    comment_box = Table([[Paragraph('<b>Comentario</b>', label_style)], [Paragraph(comentario_texto, value_style)]], colWidths=[7.0*inch], hAlign='LEFT')
    comment_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#cbd5e1')),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(comment_box)
    elements.append(Spacer(1, 0.18*inch))

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
            # Obtener productos únicos con stock en ProductoContenedor
            productos_ids = ProductoContenedor.objects.filter(
                cantidad__gt=0,
                producto__activo=True
            ).values_list('producto__id', flat=True).distinct()
            
            # Construir respuesta con stock calculado (un producto solo aparece una vez)
            resultado = []
            productos_vistos = set()
            
            for producto_id in productos_ids:
                if producto_id not in productos_vistos:
                    productos_vistos.add(producto_id)
                    producto_obj = Producto.objects.get(id=producto_id)
                    resultado.append({
                        'id': producto_id,
                        'codigo': producto_obj.codigo,
                        'nombre': producto_obj.nombre,
                        'stock': producto_obj.stock,
                        'precio_unidad': float(producto_obj.precio_unidad or 0),
                    })
            return JsonResponse(resultado, safe=False)

        origen_stock = _perfil_stock_objetivo(origen)
        inventarios = Inventario.objects.select_related('producto').filter(
            ubicacion=origen_stock,
            cantidad__gt=0,
            producto__activo=True,
        )

        productos = []
        for inv in inventarios:
            try:
                precio = float(inv.producto.precio_unidad) if inv.producto.precio_unidad else 0.0
            except (ValueError, TypeError):
                precio = 0.0
            
            productos.append({
                'id': inv.producto.id,
                'codigo': inv.producto.codigo,
                'nombre': inv.producto.nombre,
                'stock': inv.cantidad,
                'precio_unidad': precio,
            })
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


@login_required
def obtener_detalle_traspaso(request, id):
    """Obtener detalles completos de un traspaso en formato JSON"""
    try:
        # Verificar que el usuario está autenticado
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'No autenticado'}, status=401)
        
        print(f"[DEBUG] Buscando traspaso con ID: {id}")
        traspaso = get_object_or_404(Traspaso, id=id)
        print(f"[DEBUG] Traspaso encontrado: {traspaso.codigo}")
        
        # Asegurarse que origen y destino existen
        if not traspaso.origen or not traspaso.destino:
            return JsonResponse({'error': 'Traspaso sin origen o destino'}, status=400)
        
        # Obtener detalles
        detalles = DetalleTraspaso.objects.filter(traspaso=traspaso).select_related('producto')
        
        productos = []
        for detalle in detalles:
            try:
                print(f"[DEBUG] Procesando detalle: {detalle.id}, producto: {detalle.producto.nombre}, cantidad: {detalle.cantidad}")
                productos.append({
                    'codigo_producto': detalle.producto.codigo,
                    'nombre_producto': detalle.producto.nombre,
                    'cantidad': detalle.cantidad,
                })
            except Exception as prod_error:
                print(f"[ERROR] Error procesando producto {detalle.id}: {prod_error}")
                continue
        
        # Obtener nombre de quien creó
        creado_por_nombre = 'Sistema'
        if traspaso.creado_por:
            creado_por_nombre = traspaso.creado_por.get_full_name() or traspaso.creado_por.username
        
        # Obtener nombres de ubicaciones
        origen_nombre = traspaso.origen.nombre_ubicacion or 'Sin nombre'
        destino_nombre = traspaso.destino.nombre_ubicacion or 'Sin nombre'
        
        # Preparar respuesta
        data = {
            'id': traspaso.id,
            'codigo': traspaso.codigo,
            'estado': traspaso.estado,
            'tipo': traspaso.tipo,
            'origen': {
                'nombre_ubicacion': origen_nombre,
                'rol': traspaso.origen.rol,
            },
            'destino': {
                'nombre_ubicacion': destino_nombre,
                'rol': traspaso.destino.rol,
            },
            'productos': productos,
            'creado_por': creado_por_nombre,
            'fecha_creacion': traspaso.fecha_creacion.isoformat(),
            'comentario': traspaso.comentario or '',
        }
        
        print(f"[DEBUG] Respuesta JSON preparada exitosamente")
        return JsonResponse(data)
        
    except Exception as e:
        import traceback
        print(f"[ERROR] Error en obtener_detalle_traspaso: {e}")
        traceback.print_exc()
        return JsonResponse({'error': f'Error: {str(e)}'}, status=500)
