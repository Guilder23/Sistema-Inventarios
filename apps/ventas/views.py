import json
from decimal import Decimal
from io import BytesIO

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.units import inch
from django.http import FileResponse
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from datetime import datetime

from apps.ventas.models import Venta, DetalleVenta, AmortizacionCredito
from apps.productos.models import Producto

def generar_codigo_venta():
    """Genera un código único para la venta: VTA-0001, VTA-0002, etc."""
    ultima = Venta.objects.order_by('-id').first()
    if ultima and ultima.codigo:
        try:
            numero = int(ultima.codigo.split('-')[1]) + 1
        except (IndexError, ValueError):
            numero = Venta.objects.count() + 1
    else:
        numero = 1
    return f"VTA-{numero:04d}"

def es_almacen(request):
    """Verifica si el usuario tiene rol de almacén."""
    return hasattr(request.user, 'perfil') and request.user.perfil.rol == 'almacen'

def es_administrador(request):
    """Verifica si el usuario es administrador."""
    return request.user.is_superuser or request.user.is_staff

def verificar_permiso_ventas(request):
    """Verifica que el usuario tenga permiso para ver/gestionar ventas."""
    if not request.user.is_authenticated:
        return False
    # Verificar que el usuario tenga un perfil asociado
    try:
        perfil = request.user.perfil
    except:
        return False
    if es_administrador(request):
        return True
    if es_almacen(request):
        return True
    return False


#Listado de ventas (Tabs: CONTADO - CRÉDITO)
@login_required
def listar_ventas(request):
    if not verificar_permiso_ventas(request):
        return redirect('dashboard')

    try:
        perfil = request.user.perfil
    except:
        messages.error(request, 'Error: El usuario no tiene un perfil asignado. Contacte al administrador.')
        return redirect('dashboard')

#se filtran ventas por la ubicación/almacén del usuario
    ventas = Venta.objects.filter(
        ubicacion=perfil
    ).select_related('ubicacion', 'vendedor').order_by('-fecha_elaboracion')

#por tipo de pago
    ventas_contado = ventas.filter(tipo_pago='contado')
    ventas_credito = ventas.filter(tipo_pago='credito')

# Verificar si se solicita PDF
    pdf = request.GET.get('pdf')
    if pdf:
        tipo_pago = request.GET.get('tipo_pago', 'contado')
        if tipo_pago == 'contado':
            ventas_filtradas = ventas_contado
        else:
            ventas_filtradas = ventas_credito
        return generar_pdf_lista(ventas_filtradas, tipo_pago)

#Stats rápidas
    total_ventas = ventas.count()
    total_contado = ventas_contado.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    total_credito = ventas_credito.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    total_general = total_contado + total_credito

#Ventas de crédito pendientes
    creditos_pendientes = ventas_credito.filter(estado='pendiente').count()

    context = {
        'ventas_contado': ventas_contado,
        'ventas_credito': ventas_credito,
        'total_ventas': total_ventas,
        'total_contado': total_contado,
        'total_credito': total_credito,
        'total_general': total_general,
        'creditos_pendientes': creditos_pendientes,
        'perfil': perfil,
        'es_almacen': es_almacen(request),
        'es_administrador': es_administrador(request),
    }
    return render(request, 'ventas/ventas_almacen.html', context)

@login_required
def crear_venta(request):
    """
    GET: Renderiza la página de nueva venta con el carrito.
    URL: /ventas/crear/
    """
    if not verificar_permiso_ventas(request):
        return redirect('dashboard')
    
    try:
        perfil = request.user.perfil
    except:
        messages.error(request, 'Error: El usuario no tiene un perfil asignado. Contacte al administrador.')
        return redirect('dashboard')
    
    codigo_sugerido = generar_codigo_venta()
    context = {
        'codigo_sugerido': codigo_sugerido,
        'perfil': perfil,
    }
    return render(request, 'ventas/nueva_venta.html', context)


#Guardar venta (Post AJAX, es decir; recibe el JSON del carrito y crea la Venta + DetalleVenta.
#descuenta stock de los productos
#URL: /ventas/guardar/)

@login_required
def guardar_venta(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método no permitido.'}, status=405)

    if not verificar_permiso_ventas(request):
        return JsonResponse({'success': False, 'error': 'Sin permisos.'}, status=403)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido.'}, status=400)

    cliente = data.get('cliente', '').strip()
    telefono = data.get('telefono', '').strip()
    razon_social = data.get('razon_social', '').strip()
    direccion = data.get('direccion', '').strip()
    tipo_pago = data.get('tipo_pago', 'contado')
    items = data.get('items', [])

#Validaciones
    if not cliente:
        return JsonResponse({'success': False, 'error': 'El nombre del cliente es obligatorio.'})
    if tipo_pago not in ['contado', 'credito']:
        return JsonResponse({'success': False, 'error': 'Tipo de pago inválido.'})
    if not items:
        return JsonResponse({'success': False, 'error': 'Debe agregar al menos un producto.'})

    try:
        perfil = request.user.perfil
    except:
        return JsonResponse({'success': False, 'error': 'El usuario no tiene un perfil asignado.'}, status=403)

    try:
        with transaction.atomic():
            venta = Venta.objects.create(
                codigo=generar_codigo_venta(),
                ubicacion=perfil,
                cliente=cliente,
                telefono=telefono if telefono else None,
                razon_social=razon_social if razon_social else None,
                direccion=direccion if direccion else None,
                tipo_pago=tipo_pago,
                estado='completada' if tipo_pago == 'contado' else 'pendiente',
                vendedor=request.user,
                subtotal=Decimal('0.00'),
                total=Decimal('0.00'),
            )

            total_venta = Decimal('0.00')

            for item in items:
                producto_id = item.get('producto_id')
                cantidad = int(item.get('cantidad', 0))
                precio_unitario = Decimal(str(item.get('precio_unitario', '0')))
                if cantidad <= 0:
                    raise ValueError(f'Cantidad inválida para el producto ID {producto_id}.')
                producto = Producto.objects.select_for_update().get(id=producto_id)
                if producto.stock < cantidad:
                    raise ValueError(
                        f'Stock insuficiente para "{producto.nombre}". '
                        f'Disponible: {producto.stock}, Solicitado: {cantidad}.'
                    )

                subtotal_item = precio_unitario * cantidad

                DetalleVenta.objects.create(
                    venta=venta,
                    producto=producto,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    subtotal=subtotal_item,
                )
                producto.stock -= cantidad
                producto.save()

                total_venta += subtotal_item

# Actualizar totales de la venta
            venta.subtotal = total_venta
            venta.total = total_venta
            venta.save()

        return JsonResponse({
            'success': True,
            'venta_id': venta.id,
            'codigo': venta.codigo,
            'total': str(venta.total),
            'message': f'Venta {venta.codigo} registrada exitosamente.',
        })

    except Producto.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Producto no encontrado.'})
    except ValueError as e:
        return JsonResponse({'success': False, 'error': str(e)})
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'Error al guardar: {str(e)}'})


# API para buscar productos (con AJAX autocompletado).-
#Busca productos por nombre o código.
#URL: /ventas/api/buscar-productos/?q=texto
#Retorna JSON con lista de productos que tengan stock > 0 y estén activos
@login_required
def buscar_productos(request):
    query = request.GET.get('q', '').strip()
    if len(query) < 2:
        return JsonResponse({'productos': []})

    productos = Producto.objects.filter(
        Q(nombre__icontains=query) | Q(codigo__icontains=query),
        stock__gt=0,
        activo=True,
    )[:10]

    resultado = []
    for p in productos:
        resultado.append({
            'id': p.id,
            'codigo': p.codigo,
            'nombre': p.nombre,
            'stock': p.stock,
            'precio_unidad': str(p.precio_unidad),
            'precio_mayor': str(p.precio_mayor),
            'precio_caja': str(p.precio_caja),
        })

    return JsonResponse({'productos': resultado})


@login_required
def ver_venta(request, id):
    venta = get_object_or_404(Venta, id=id)
    detalles = DetalleVenta.objects.filter(venta=venta).select_related('producto')
    items = []
    for d in detalles:
        items.append({
            'producto_nombre': d.producto.nombre,
            'producto_codigo': d.producto.codigo,
            'cantidad': d.cantidad,
            'precio_unitario': str(d.precio_unitario),
            'subtotal': str(d.subtotal),
        })

# Amortizaciones (si es con crédito)
    amortizaciones = []
    total_amortizado = Decimal('0.00')
    saldo_pendiente = Decimal('0.00')

    if venta.tipo_pago == 'credito':
# OJITO: AmortizacionCredito usa 'fecha' (auto_now_add) y 'observaciones'
        amorts = AmortizacionCredito.objects.filter(venta=venta).order_by('-fecha')
        for a in amorts:
            amortizaciones.append({
                'id': a.id,
                'monto': str(a.monto),
                'fecha': a.fecha.strftime('%d/%m/%Y %H:%M') if a.fecha else '',
                'observaciones': a.observaciones or '',
            })
            total_amortizado += a.monto
        saldo_pendiente = venta.total - total_amortizado

    data = {
        'venta': {
            'id': venta.id,
            'codigo': venta.codigo,
            'cliente': venta.cliente,
            'telefono': venta.telefono or '',
            'razon_social': venta.razon_social or '',
            'direccion': venta.direccion or '',
            'tipo_pago': venta.get_tipo_pago_display(),
            'tipo_pago_raw': venta.tipo_pago,
            'estado': venta.get_estado_display(),
            'estado_raw': venta.estado,
            'total': str(venta.total),
            'subtotal': str(venta.subtotal),
            'fecha': venta.fecha_elaboracion.strftime('%d/%m/%Y %H:%M') if venta.fecha_elaboracion else '',
            'vendedor': str(venta.vendedor.get_full_name() or venta.vendedor.username) if venta.vendedor else '',
            'ubicacion': str(venta.ubicacion),
        },
        'items': items,
        'amortizaciones': amortizaciones,
        'total_amortizado': str(total_amortizado),
        'saldo_pendiente': str(saldo_pendiente),
    }

    return JsonResponse(data)

@login_required
def generar_pdf_venta(request, id):
    """
    Descarga PDF de una venta.

    Args:
        request: HttpRequest
        id: ID de la venta
    
    Returns:
        PDF descargable
    """
    try:
        from .pdf_generator import generar_pdf_venta_completo
        
        venta = get_object_or_404(Venta, id=id)
        
        # Validar permisos: solo vendedor, admin o staff
        if venta.vendedor != request.user and not (request.user.is_staff or request.user.is_superuser):
            messages.error(request, 'No tiene permiso para ver este PDF')
            return redirect('ventas:listar_ventas')
        
        # Generar PDF
        buffer = generar_pdf_venta_completo(venta)
        
        # Preparar respuesta - nombre con código de venta
        codigo_venta_str = getattr(venta, 'codigo', f'VENTA-{venta.id}').replace("/", "-")
        nombre_archivo = f'{codigo_venta_str}.pdf'
        
        response = FileResponse(
            buffer,
            as_attachment=True,
            filename=nombre_archivo,
            content_type='application/pdf'
        )
        
        return response
        
    except Venta.DoesNotExist:
        messages.error(request, 'Venta no encontrada')
        return redirect('ventas:listar_ventas')
    except Exception as e:
        messages.error(request, f'Error al generar PDF: {str(e)}')
        return redirect('ventas:listar_ventas')

def generar_pdf_lista(ventas, tipo_pago='contado'):
    """Genera PDF detallado con información completa de cada venta."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
    styles = getSampleStyleSheet()
    elements = []
    
    # Estilo personalizado para títulos
    titulo_style = ParagraphStyle(
        'TituloVenta',
        parent=styles['Heading2'],
        fontSize=14,
        textColor='#1e3a8a',
        spaceAfter=12,
        borderColor='#1e3a8a',
        borderWidth=2,
        borderPadding=10,
    )
    
    info_style = ParagraphStyle(
        'Info',
        parent=styles['Normal'],
        fontSize=9,
        spaceAfter=4,
    )
    
    # Título principal
    tipo_display = "AL CONTADO" if tipo_pago == 'contado' else "A CRÉDITO"
    title = Paragraph(f"<b>LISTADO DE VENTAS - {tipo_display}</b>", styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 0.2*inch))
    
    # Procesar cada venta
    for idx, venta in enumerate(ventas):
        if idx > 0:
            elements.append(PageBreak())
        
        # Encabezado de la venta
        encabezado = Paragraph(f"<b>Venta: {venta.codigo}</b>", titulo_style)
        elements.append(encabezado)
        elements.append(Spacer(1, 0.1*inch))
        
        # Información de la venta en 2 columnas
        info_data = [
            ['Cliente', venta.cliente, 'Tipo de Pago', venta.get_tipo_pago_display()],
            ['Teléfono', venta.telefono or '-', 'Fecha', venta.fecha_elaboracion.strftime('%d/%m/%Y %H:%M')],
            ['Razón Social', venta.razon_social or '-', 'Estado', venta.get_estado_display()],
            ['Dirección', venta.direccion or '-', 'Vendedor', venta.vendedor.get_full_name() if venta.vendedor else '-'],
        ]
        
        info_table = Table(info_data, colWidths=[1.2*inch, 2*inch, 1.2*inch, 2*inch])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 0.15*inch))
        
        # Tabla de productos
        productos_titulo = Paragraph("<b>Productos Vendidos</b>", styles['Heading3'])
        elements.append(productos_titulo)
        elements.append(Spacer(1, 0.08*inch))
        
        productos_data = [['Producto', 'Cant.', 'P. Unit.', 'Subtotal']]
        total_items = Decimal('0.00')
        
        for detalle in venta.detalles.all():
            productos_data.append([
                detalle.producto.nombre,
                str(detalle.cantidad),
                f"Bs. {detalle.precio_unitario:.2f}",
                f"Bs. {detalle.subtotal:.2f}"
            ])
            total_items += detalle.subtotal
        
        productos_data.append(['', '', 'TOTAL:', f"Bs. {total_items:.2f}"])
        
        productos_table = Table(productos_data, colWidths=[2.5*inch, 0.8*inch, 1*inch, 1.2*inch])
        productos_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), '#1e3a8a'),
            ('TEXTCOLOR', (0, 0), (-1, 0), 'white'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, -1), (-1, -1), '#e9ecef'),
            ('GRID', (0, 0), (-1, -1), 1, '#d1d5db'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), ['#ffffff', '#f8f9fc']),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(productos_table)
        elements.append(Spacer(1, 0.15*inch))
        
        # Si es crédito, mostrar amortizaciones
        if tipo_pago == 'credito':
            amortizaciones = venta.amortizaciones.all().order_by('-fecha')
            
            amort_titulo = Paragraph("<b>Amortizaciones</b>", styles['Heading3'])
            elements.append(amort_titulo)
            elements.append(Spacer(1, 0.08*inch))
            
            if amortizaciones.exists():
                amort_data = [['Fecha', 'Monto', 'Observaciones']]
                total_amortizado = Decimal('0.00')
                
                for amort in amortizaciones:
                    amort_data.append([
                        amort.fecha.strftime('%d/%m/%Y %H:%M'),
                        f"Bs. {amort.monto:.2f}",
                        amort.observaciones or '-'
                    ])
                    total_amortizado += amort.monto
                
                saldo_pendiente = venta.total - total_amortizado
                
                amort_table = Table(amort_data, colWidths=[1.5*inch, 1.2*inch, 3.3*inch])
                amort_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), '#1e3a8a'),
                    ('TEXTCOLOR', (0, 0), (-1, 0), 'white'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                    ('GRID', (0, 0), (-1, -1), 1, '#d1d5db'),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), ['#ffffff', '#f8f9fc']),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ]))
                elements.append(amort_table)
                elements.append(Spacer(1, 0.1*inch))
                
                # Resumen de crédito
                resumen_data = [
                    ['Total amortizado:', f"Bs. {total_amortizado:.2f}"],
                    ['Saldo pendiente:', f"Bs. {saldo_pendiente:.2f}"],
                ]
                resumen_table = Table(resumen_data, colWidths=[2.5*inch, 1.5*inch])
                resumen_table.setStyle(TableStyle([
                    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ]))
                elements.append(resumen_table)
            else:
                elements.append(Paragraph("<i>Sin amortizaciones registradas</i>", info_style))
    
        doc.build(elements)
    
    buffer.seek(0)
    # Nombre archivo con fecha y hora del sistema
    nombre_archivo = f'Ventas_{tipo_pago}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{nombre_archivo}"'
    
    return response

@login_required
def registrar_amortizacion(request, venta_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método no permitido.'}, status=405)

    venta = get_object_or_404(Venta, id=venta_id)

    if venta.tipo_pago != 'credito':
        return JsonResponse({'success': False, 'error': 'Esta venta no es a crédito.'})

    if venta.estado == 'cancelada':
        return JsonResponse({'success': False, 'error': 'No se puede abonar a una venta cancelada.'})

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido.'}, status=400)

    monto = Decimal(str(data.get('monto', '0')))
    observaciones = data.get('observaciones', '').strip()

    if monto <= 0:
        return JsonResponse({'success': False, 'error': 'El monto debe ser mayor a 0.'})

#calculamos saldo pendiente
    total_amortizado = AmortizacionCredito.objects.filter(
        venta=venta
    ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')

    saldo_pendiente = venta.total - total_amortizado

    if monto > saldo_pendiente:
        return JsonResponse({
            'success': False,
            'error': f'El monto (Bs. {monto}) excede el saldo pendiente (Bs. {saldo_pendiente}).'
        })

    try:
        with transaction.atomic():
#OJO: AmortizacionCredito.fecha es auto_now_add=True, no se pasa manualmente
            AmortizacionCredito.objects.create(
                venta=venta,
                monto=monto,
                observaciones=observaciones,
                registrado_por=request.user,
            )

            nuevo_total_amortizado = total_amortizado + monto
            if nuevo_total_amortizado >= venta.total:
                venta.estado = 'completada'
                venta.save()

        return JsonResponse({
            'success': True,
            'message': 'Amortización registrada exitosamente.',
            'nuevo_saldo': str(venta.total - nuevo_total_amortizado),
            'venta_completada': nuevo_total_amortizado >= venta.total,
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': f'Error: {str(e)}'})


@login_required
def anular_venta(request, id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método no permitido.'}, status=405)

    if not verificar_permiso_ventas(request):
        return JsonResponse({'success': False, 'error': 'Sin permisos.'}, status=403)

    venta = get_object_or_404(Venta, id=id)

    if venta.estado == 'cancelada':
        return JsonResponse({'success': False, 'error': 'La venta ya está cancelada.'})

    try:
        with transaction.atomic():
            # Devolver stock
            detalles = DetalleVenta.objects.filter(venta=venta).select_related('producto')
            for detalle in detalles:
                producto = Producto.objects.select_for_update().get(id=detalle.producto.id)
                producto.stock += detalle.cantidad
                producto.save()

            venta.estado = 'cancelada'
            venta.save()

        return JsonResponse({
            'success': True,
            'message': f'Venta {venta.codigo} anulada. Stock devuelto.',
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': f'Error al anular venta: {str(e)}'})


# ============================================
# FUNCIONES PARA VENTAS TIENDA
# ============================================

@login_required
def listar_ventas_tienda(request):
    """
    Listado de ventas para usuarios con rol TIENDA.
    Similar a listar_ventas pero filtrado y con lógica específica de tienda.
    """
    if not hasattr(request.user, 'perfil') or request.user.perfil.rol != 'tienda':
        messages.error(request, 'Solo usuarios con rol tienda pueden acceder.')
        return redirect('dashboard')

    perfil = request.user.perfil

    # Se filtran ventas por la ubicación/tienda del usuario
    ventas = Venta.objects.filter(
        ubicacion=perfil,
        vendedor=request.user
    ).select_related('ubicacion', 'vendedor').order_by('-fecha_elaboracion')

    # Por tipo de pago
    ventas_contado = ventas.filter(tipo_pago='contado')
    ventas_credito = ventas.filter(tipo_pago='credito')

    # Stats rápidas
    total_ventas = ventas.count()
    total_contado = ventas_contado.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    total_credito = ventas_credito.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    total_general = total_contado + total_credito

    # Ventas de crédito pendientes
    creditos_pendientes = ventas_credito.filter(estado='pendiente').count()

    context = {
        'ventas_contado': ventas_contado,
        'ventas_credito': ventas_credito,
        'total_ventas': total_ventas,
        'total_contado': total_contado,
        'total_credito': total_credito,
        'total_general': total_general,
        'creditos_pendientes': creditos_pendientes,
        'perfil': perfil,
        'es_tienda': True,
    }
    return render(request, 'ventas/nueva_venta_tienda.html', context)


@login_required
def crear_venta_tienda(request):
    """
    GET: Renderiza la página de nueva venta TIENDA con widget selector de modalidad.
    URL: /ventas/tienda/crear/
    """
    if not hasattr(request.user, 'perfil') or request.user.perfil.rol != 'tienda':
        return redirect('dashboard')
    
    perfil = request.user.perfil
    codigo_sugerido = generar_codigo_venta()
    
    context = {
        'codigo_sugerido': codigo_sugerido,
        'perfil': perfil,
        'es_tienda': True,
    }
    return render(request, 'ventas/nueva_venta_tienda.html', context)


@login_required
def guardar_venta_tienda(request):
    """
    POST AJAX: Recibe carrito JSON con items de tienda.
    Valida modalidades (unidad/caja/mayor) y guarda Venta + DetalleVenta.
    Descuenta stock por cajas + unidades.
    
    URL: /ventas/tienda/guardar/
    
    RECIBE JSON:
    {
        "cliente": "Nombre cliente",
        "telefono": "1234567",
        "razon_social": "",
        "direccion": "Dir",
        "tipo_pago": "contado",
        "descuento": 0,
        "items": [
            {
                "producto_id": 1,
                "cantidad": 18,
                "modalidad": "mayor",  // "unidad" | "caja" | "mayor"
                "precio_unitario": 25.50
            }
        ]
    }
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método no permitido.'}, status=405)

    if not hasattr(request.user, 'perfil') or request.user.perfil.rol != 'tienda':
        return JsonResponse({'success': False, 'error': 'Solo tienda puede crear ventas tienda.'}, status=403)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido.'}, status=400)

    cliente = data.get('cliente', '').strip()
    telefono = data.get('telefono', '').strip()
    razon_social = data.get('razon_social', '').strip()
    direccion = data.get('direccion', '').strip()
    tipo_pago = data.get('tipo_pago', 'contado')
    descuento = Decimal(str(data.get('descuento', '0')))
    items = data.get('items', [])

    # Validaciones
    if not cliente:
        return JsonResponse({'success': False, 'error': 'El nombre del cliente es obligatorio.'})
    if tipo_pago not in ['contado', 'credito']:
        return JsonResponse({'success': False, 'error': 'Tipo de pago inválido.'})
    if not items:
        return JsonResponse({'success': False, 'error': 'Debe agregar al menos un producto.'})

    perfil = request.user.perfil

    try:
        with transaction.atomic():
            venta = Venta.objects.create(
                codigo=generar_codigo_venta(),
                ubicacion=perfil,
                cliente=cliente,
                telefono=telefono if telefono else None,
                razon_social=razon_social if razon_social else None,
                direccion=direccion if direccion else None,
                tipo_pago=tipo_pago,
                estado='completada' if tipo_pago == 'contado' else 'pendiente',
                vendedor=request.user,
                subtotal=Decimal('0.00'),
                total=Decimal('0.00'),
            )

            total_venta = Decimal('0.00')

            for item in items:
                producto_id = item.get('producto_id')
                cantidad = int(item.get('cantidad', 0))
                modalidad = item.get('modalidad', 'unidad')  # unidad | caja | mayor
                precio_unitario = Decimal(str(item.get('precio_unitario', '0')))

                if cantidad <= 0:
                    raise ValueError(f'Cantidad inválida para el producto ID {producto_id}.')

                producto = Producto.objects.select_for_update().get(id=producto_id)

                # VALIDAR MODALIDAD MATEMÁTICAMENTE
                if modalidad == 'mayor':
                    if cantidad < 3 or cantidad >= producto.unidades_por_caja:
                        raise ValueError(
                            f'Venta por mayor debe estar entre 3 y {producto.unidades_por_caja - 1} unidades. '
                            f'Recibido: {cantidad}.'
                        )
                elif modalidad == 'caja':
                    if cantidad % producto.unidades_por_caja != 0:
                        raise ValueError(
                            f'Venta por caja debe ser múltiplo de {producto.unidades_por_caja}. '
                            f'Recibido: {cantidad}.'
                        )
                # modalidad == 'unidad' acepta cualquier cantidad >= 1

                # Validar stock
                if producto.stock < cantidad:
                    raise ValueError(
                        f'Stock insuficiente para "{producto.nombre}". '
                        f'Disponible: {producto.stock}, Solicitado: {cantidad}.'
                    )

                subtotal_item = precio_unitario * cantidad

                # Guardar DetalleVenta (con cantidad total, sin desglose)
                DetalleVenta.objects.create(
                    venta=venta,
                    producto=producto,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    subtotal=subtotal_item,
                )

                # Descontar stock por cajas + unidades
                # Ejemplo: cantidad=18, unidades=10 → descuenta 1 caja (10) + 8 unidades
                cajas_a_descontar = cantidad // producto.unidades_por_caja
                unidades_a_descontar = cantidad % producto.unidades_por_caja
                total_a_descontar = (cajas_a_descontar * producto.unidades_por_caja) + unidades_a_descontar

                producto.stock -= total_a_descontar
                producto.save()

                total_venta += subtotal_item

            # Aplicar descuento (comentado para futuro)
            # TODO: Implementar campo descuento en modelo cuando sea necesario
            # actual_descuento = min(descuento, total_venta)
            # total_final = total_venta - actual_descuento

            # Por ahora, descuento solo es visual (UI nomás)
            total_final = total_venta

            venta.subtotal = total_venta
            venta.total = total_final
            venta.save()

            return JsonResponse({
                'success': True,
                'message': f'Venta {venta.codigo} guardada exitosamente.',
                'venta_id': venta.id,
                'venta_codigo': venta.codigo,
                'redireccionar_a': reverse('ventas:ver_venta', args=[venta.id])
            })

    except Venta.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Venta no encontrada'}, status=404)
    except Producto.DoesNotExist as e:
        return JsonResponse({'success': False, 'error': f'Producto no encontrado: {str(e)}'}, status=404)
    except ValueError as e:
        return JsonResponse({'success': False, 'error': str(e)})
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'Error al guardar venta: {str(e)}'}, status=500)
