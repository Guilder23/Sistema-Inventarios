from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.db.models import Q
from .models import Traspaso, DetalleTraspaso
from apps.productos.models import Producto
from apps.usuarios.models import PerfilUsuario


def es_almacen_o_tienda(user):
    """Verifica si el usuario es almacén o tienda"""
    if hasattr(user, 'perfil'):
        return user.perfil.rol in ['almacen', 'tienda']
    return False


@login_required
def listar_traspasos(request):
    """Listar traspasos enviados y recibidos"""
    if not es_almacen_o_tienda(request.user):
        messages.error(request, 'No tiene permisos para acceder a traspasos')
        return redirect('dashboard')
    
    # Obtener ubicación actual del usuario
    ubicacion_actual = request.user.perfil if hasattr(request.user, 'perfil') else None
    
    # Traspasos enviados por esta ubicación
    traspasos_enviados = Traspaso.objects.filter(origen=ubicacion_actual)
    
    # Traspasos recibidos por esta ubicación
    traspasos_recibidos = Traspaso.objects.filter(destino=ubicacion_actual)
    
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
            destino_id = request.POST.get('destino')
            comentario = request.POST.get('comentario', '')
            productos_ids = request.POST.getlist('producto_id')
            productos_cantidades = request.POST.getlist('cantidad')
            
            if not destino_id:
                return JsonResponse({'error': 'Debe seleccionar destino'}, status=400)
            
            if not productos_ids:
                return JsonResponse({'error': 'Debe agregar al menos un producto'}, status=400)
            
            destino = get_object_or_404(PerfilUsuario, id=destino_id)
            
            codigo = Traspaso.generar_codigo()
            traspaso = Traspaso.objects.create(
                codigo=codigo,
                tipo=tipo,
                origen=ubicacion_actual,
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
                        # Validar que hay stock suficiente
                        if producto.stock < cantidad:
                            traspaso.delete()
                            return JsonResponse({
                                'error': f'Stock insuficiente para {producto.nombre}. Disponible: {producto.stock}'
                            }, status=400)
                        
                        DetalleTraspaso.objects.create(
                            traspaso=traspaso,
                            producto=producto,
                            cantidad=cantidad
                        )
                except (Producto.DoesNotExist, ValueError):
                    continue
            
            if not traspaso.detalles.exists():
                traspaso.delete()
                return JsonResponse({'error': 'Debe agregar al menos un producto'}, status=400)
            
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
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    destinos = PerfilUsuario.objects.exclude(id=ubicacion_actual.id if ubicacion_actual else None)
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
    if traspaso.origen != ubicacion_actual and traspaso.destino != ubicacion_actual:
        messages.error(request, 'No tiene permisos para ver este traspaso')
        return redirect('listar_traspasos')
    
    context = {
        'traspaso': traspaso,
        'detalles': traspaso.detalles.all(),
        'es_origen': traspaso.origen == ubicacion_actual,
        'es_destino': traspaso.destino == ubicacion_actual,
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
            if traspaso.origen != ubicacion_actual:
                return JsonResponse({'error': 'Solo el origen puede cambiar a tránsito'}, status=403)
            
            # Validar stock antes de enviar
            for detalle in traspaso.detalles.all():
                if detalle.producto.stock < detalle.cantidad:
                    return JsonResponse({
                        'error': f'Stock insuficiente para {detalle.producto.nombre}. Disponible: {detalle.producto.stock}'
                    }, status=400)
            
            # Reducir stock del origen al enviar
            for detalle in traspaso.detalles.all():
                detalle.producto.stock -= detalle.cantidad
                detalle.producto.save()
            
            traspaso.estado = 'transito'
            traspaso.fecha_envio = timezone.now()
        
        elif nuevo_estado == 'recibido':
            if traspaso.destino != ubicacion_actual:
                return JsonResponse({'error': 'Solo el destino puede cambiar a recibido'}, status=403)
            
            # Aumentar stock del destino al recibir
            for detalle in traspaso.detalles.all():
                detalle.producto.stock += detalle.cantidad
                detalle.producto.save()
            
            traspaso.estado = 'recibido'
            traspaso.fecha_recepcion = timezone.now()
            traspaso.aceptado_por = request.user
        
        elif nuevo_estado == 'rechazado':
            if traspaso.destino != ubicacion_actual:
                return JsonResponse({'error': 'Solo el destino puede rechazar'}, status=403)
            
            # Si se rechaza, devolver el stock al origen
            if traspaso.estado == 'transito':
                for detalle in traspaso.detalles.all():
                    detalle.producto.stock += detalle.cantidad
                    detalle.producto.save()
            
            traspaso.estado = 'rechazado'
            traspaso.fecha_recepcion = timezone.now()
        
        elif nuevo_estado == 'cancelado':
            # Solo el origen puede cancelar si está pendiente
            if traspaso.origen != ubicacion_actual:
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
        productos = Producto.objects.filter(activo=True).values('id', 'codigo', 'nombre', 'stock', 'precio_unidad')
        return JsonResponse(list(productos), safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def obtener_destinos_traspaso(request):
    """Obtener destinos disponibles"""
    try:
        ubicacion_id = request.GET.get('ubicacion_id')
        destinos = PerfilUsuario.objects.exclude(id=ubicacion_id).values('id', 'nombre_ubicacion', 'rol')
        return JsonResponse(list(destinos), safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
