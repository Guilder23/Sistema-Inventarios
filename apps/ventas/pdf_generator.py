"""
Generador de PDFs para ventas
Este módulo es reutilizable
"""

from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from datetime import datetime
from decimal import Decimal
import os
from xml.sax.saxutils import escape
from django.conf import settings
from apps.moneda.utils import obtener_etiqueta_moneda
from PIL import Image as PILImage, ImageOps


def convertir_desde_bob_para_pdf(monto, venta):
    """Devuelve el monto tal como fue guardado, usando la moneda de la venta solo para la etiqueta."""
    valor = Decimal(str(monto or 0))
    return valor


def obtener_label_tipo_vendedor_pdf(tipo):
    etiquetas = {
        'almacen': 'Almacén',
        'tienda': 'Tienda',
        'deposito': 'Depósito',
        'mixto': 'Mixta',
    }
    return etiquetas.get((tipo or '').strip().lower(), 'Sin especificar')


def obtener_tipo_vendedor_detalle_pdf(detalle):
    tipo = (getattr(detalle, 'tipo_vendedor', '') or '').strip().lower()
    if tipo:
        if tipo == 'depósito':
            return 'deposito'
        return tipo

    return 'tienda' if getattr(detalle.venta.ubicacion, 'rol', '') == 'tienda' else 'almacen'


def obtener_modalidad_detalle_pdf(detalle):
    modalidad = (getattr(detalle, 'modalidad', '') or 'unidad').strip().lower()
    return modalidad if modalidad in {'unidad', 'caja', 'mayor'} else 'unidad'


def obtener_label_modalidad_pdf(modalidad):
    etiquetas = {
        'unidad': 'Unidad',
        'caja': 'Caja',
        'mayor': 'Mayor',
    }
    return etiquetas.get(modalidad, 'Unidad')


def obtener_cantidad_cajas_pdf(detalle):
    cajas_guardadas = int(getattr(detalle, 'cantidad_cajas', 0) or 0)
    if cajas_guardadas > 0:
        return cajas_guardadas

    modalidad = obtener_modalidad_detalle_pdf(detalle)
    unidades_por_caja = int(getattr(detalle.producto, 'unidades_por_caja', 1) or 1)
    cantidad = int(getattr(detalle, 'cantidad', 0) or 0)

    if modalidad == 'caja' and unidades_por_caja > 0 and cantidad > 0:
        return max(cantidad // unidades_por_caja, 0)

    return 0


def obtener_resumen_origen_venta_pdf(venta):
    tipos = []
    for detalle in venta.detalles.all():
        tipo = obtener_tipo_vendedor_detalle_pdf(detalle)
        if tipo and tipo not in tipos:
            tipos.append(tipo)

    if not tipos:
        return 'Tienda' if getattr(venta.ubicacion, 'rol', '') == 'tienda' else 'Almacén'

    if len(tipos) == 1:
        return obtener_label_tipo_vendedor_pdf(tipos[0])

    return 'Mixta'


def obtener_descuento_info_pdf(venta):
    monto_descuento = float(convertir_desde_bob_para_pdf(getattr(venta, 'descuento', 0), venta) or 0)
    tipo_descuento = (getattr(venta, 'descuento_tipo', '') or '').strip().lower()
    valor_descuento = Decimal(str(getattr(venta, 'descuento_valor', 0) or 0)).quantize(Decimal('0.01'))

    if monto_descuento <= 0:
        return {'aplica': False, 'resumen': 'Sin descuento', 'label': 'Descuento'}

    if tipo_descuento == 'porcentaje' and valor_descuento > 0:
        valor_texto = f'{valor_descuento:f}'.rstrip('0').rstrip('.')
        return {
            'aplica': True,
            'resumen': f'{valor_texto}% ({obtener_etiqueta_moneda(venta.moneda)} {monto_descuento:,.2f})',
            'label': f'Descuento ({valor_texto}%)',
        }

    return {
        'aplica': True,
        'resumen': f'{obtener_etiqueta_moneda(venta.moneda)} {monto_descuento:,.2f}',
        'label': 'Descuento',
    }


def _crear_thumbnail_pdf(contenido, ancho_max=180, alto_max=180, calidad=82):
    """
    Reduce una imagen en memoria antes de pasarsela a ReportLab.
    Esto evita que el PDF procese fotos originales demasiado pesadas.
    """
    try:
        contenido.seek(0)
        imagen = PILImage.open(contenido)
        imagen = ImageOps.exif_transpose(imagen)

        if imagen.mode not in ('RGB', 'L'):
            imagen = imagen.convert('RGB')

        resample = getattr(PILImage, 'Resampling', PILImage).LANCZOS
        imagen.thumbnail((ancho_max, alto_max), resample)

        salida = BytesIO()
        imagen.save(salida, format='JPEG', quality=calidad, optimize=True)
        salida.seek(0)
        return salida
    except Exception:
        return None


def _cargar_imagen_pdf_desde_file(archivo, width, height):
    if not archivo:
        return ''

    try:
        if hasattr(archivo, 'open'):
            archivo.open('rb')
        contenido = BytesIO(archivo.read())
        thumbnail = _crear_thumbnail_pdf(contenido, ancho_max=220, alto_max=220, calidad=82)
        if thumbnail is not None:
            return Image(thumbnail, width=width, height=height)
    except Exception:
        pass

    return ''


def _cargar_imagen_pdf_desde_ruta(ruta, width, height):
    if not ruta or not os.path.exists(ruta):
        return ''

    try:
        with open(ruta, 'rb') as archivo:
            contenido = BytesIO(archivo.read())
            thumbnail = _crear_thumbnail_pdf(contenido, ancho_max=220, alto_max=220, calidad=82)
            if thumbnail is not None:
                return Image(thumbnail, width=width, height=height)
    except Exception:
        pass

    return ''


def generar_pdf_venta_completo(venta):
    """
    Genera PDF completo de una venta (por ahora para tienda Almacén o Tienda).
    """
    buffer = BytesIO()
    # Reducir márgenes para aprovechar mejor el espacio
    doc = SimpleDocTemplate(
     buffer,
    pagesize=letter,
    topMargin=0.3 * inch,
    bottomMargin=0.3 * inch,
    leftMargin=0.35 * inch,
    rightMargin=0.35 * inch,
    )
    elements = []
    styles = getSampleStyleSheet()
    
    # ===== ESTILOS PERSONALIZADOS =====
    # estilos para celdas
    style_header_cell = ParagraphStyle(
    'HeaderCell',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=9,
    leading=11,
    alignment=TA_CENTER,
    textColor=colors.whitesmoke,
    )
    style_cell_left = ParagraphStyle(
    'CellLeft',
    parent=styles['Normal'],
    fontSize=8,
    leading=10,
    alignment=TA_LEFT,
    textColor=colors.HexColor('#111827'),
)

    style_cell_center = ParagraphStyle(
    'CellCenter',
    parent=style_cell_left,
    alignment=TA_CENTER,
    )

    style_cell_right = ParagraphStyle(
    'CellRight',
    parent=style_cell_left,
    alignment=TA_RIGHT,
    )

    style_titulo = ParagraphStyle(
        'TituloVenta',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    style_encabezado = ParagraphStyle(
        'Encabezado',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#374151'),
        spaceAfter=4
    )
    
    # Estilos para empresa info (sin atributos inline)
    style_empresa_nombre = ParagraphStyle(
        'EmpresaNombre',
        parent=styles['Normal'],
        fontSize=14,
        textColor=colors.HexColor('#000000'),
        fontName='Helvetica-Bold',
        spaceAfter=2
    )
    
    style_empresa_subtitulo = ParagraphStyle(
        'EmpresaSubtitulo',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#666666'),
        fontName='Helvetica-Oblique',
        spaceAfter=1
    )
    
    style_empresa_descripcion = ParagraphStyle(
        'EmpresaDescripcion',
        parent=styles['Normal'],
        fontSize=7,
        textColor=colors.HexColor('#999999'),
        fontName='Helvetica'
    )
    
    # ===== SECCIÓN 0: HEADER CON LOGO =====
    
    # Crear tabla con logo + empresa info
    logo_path = os.path.join(settings.BASE_DIR, 'static', 'img', 'logoAlmacen.png')
    
    header_data = []
    header_row = []
    
    # Agregar logo si existe
    if os.path.exists(logo_path):
        try:
            logo = _cargar_imagen_pdf_desde_ruta(logo_path, width=0.8*inch, height=0.8*inch)
            if logo:
                header_row.append(logo)
            else:
                header_row.append(Paragraph("<b>ALMAZEN</b>", style_empresa_nombre))
        except Exception:
            header_row.append(Paragraph("<b>ALMAZEN</b>", style_empresa_nombre))
    else:
        header_row.append(Paragraph("<b>ALMAZEN</b>", style_empresa_nombre))
    
    # Información empresa (sin estilos inline, usar ParagraphStyle)
    empresa_info_cell = []
    empresa_info_cell.append(Paragraph("<b>ALMAZEN</b>", style_empresa_nombre))
    empresa_info_cell.append(Paragraph("<i>Importadora por mayor y menor</i>", style_empresa_subtitulo))
    empresa_info_cell.append(Paragraph("Venta de productos al por mayor y menor", style_empresa_descripcion))
    
    # Crear una tabla interna para organizar el texto
    empresa_table = Table([
        [elem] for elem in empresa_info_cell
    ])
    empresa_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LINEBELOW', (0, 0), (-1, -1), 0, colors.white),
    ]))
    
    header_row.append(empresa_table)
    
    header_data.append(header_row)
    header_table = Table(header_data, colWidths=[1.2*inch, 5*inch])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (1, 0), (1, 0), 0.2*inch),
    ]))
    
    elements.append(header_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # Obtener etiqueta de moneda
    etiqueta_moneda = obtener_etiqueta_moneda(venta.moneda)
    moneda_liquidacion = f"{venta.moneda} ({etiqueta_moneda})"
    
    # ===== SECCIÓN 1: CABECERA =====
    
    # Título (inferir de rol del vendedor)
    titulo = "COMPROBANTE DE VENTA"
    
    elements.append(Paragraph(titulo, style_titulo))
    elements.append(Spacer(1, 0.1*inch))
    
    # Datos generales
    fecha_str = venta.fecha_elaboracion.strftime('%d/%m/%Y %H:%M') if hasattr(venta, 'fecha_elaboracion') else datetime.now().strftime('%d/%m/%Y %H:%M')
    codigo_venta_str = getattr(venta, 'codigo', f'VENTA-{venta.id}')
    vendedor_nombre = venta.vendedor.get_full_name() or venta.vendedor.username
    
    # MEJORADO: Obtener ubicación del vendedor (almacén o tienda)
    lugar_venta = venta.ubicacion.nombre_ubicacion if hasattr(venta.ubicacion, 'nombre_ubicacion') else 'Sin ubicación'
    vendedor_con_lugar = f"{vendedor_nombre} - {lugar_venta}"
    
    tipo_pago = venta.get_tipo_pago_display() if hasattr(venta, 'get_tipo_pago_display') else venta.tipo_pago
    
    info_general = f"""
    <b>Código:</b> {codigo_venta_str}<br/>
    <b>Fecha:</b> {fecha_str}<br/>
    <b>Cliente:</b> {venta.cliente}<br/>
    <b>Vendedor:</b> {vendedor_con_lugar}<br/>
    <b>Tipo Pago:</b> {tipo_pago}<br/>
    <b>Origen:</b> {obtener_resumen_origen_venta_pdf(venta)}<br/>
    <b>Moneda de liquidación:</b> {moneda_liquidacion}
    """
    elements.append(Paragraph(info_general, style_encabezado))

    elements.append(Spacer(1, 0.3*inch))
    
   # ===== SECCIÓN 2: TABLA DE DETALLES =====
    detalles = venta.detalles.all()

    # Estilos para las celdas de la tabla
    style_header_cell = ParagraphStyle(
        'HeaderCell',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=10,
        alignment=TA_CENTER,
        textColor=colors.whitesmoke,
    )

    style_cell_left = ParagraphStyle(
        'CellLeft',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=9.5,
        alignment=TA_LEFT,
        textColor=colors.HexColor('#111827'),
    )

    style_cell_center = ParagraphStyle(
        'CellCenter',
        parent=style_cell_left,
        alignment=TA_CENTER,
    )

    style_cell_right = ParagraphStyle(
        'CellRight',
        parent=style_cell_left,
        alignment=TA_RIGHT,
    )

    ancho_tabla = doc.width
    col_widths = [
        ancho_tabla * 0.12,  # Foto
        ancho_tabla * 0.11,  # Código
        ancho_tabla * 0.22,  # Detalle Producto
        ancho_tabla * 0.10,  # Origen
        ancho_tabla * 0.16,  # Detalle
        ancho_tabla * 0.08,  # Cantidad
        ancho_tabla * 0.10,  # P. Unitario
        ancho_tabla * 0.11,  # Subtotal
    ]

    datos_tabla = [[
        Paragraph('Foto', style_header_cell),
        Paragraph('Codigo', style_header_cell),
        Paragraph('Detalle Producto', style_header_cell),
        Paragraph('Origen', style_header_cell),
        Paragraph('Detalle', style_header_cell),
        Paragraph('Cantidad', style_header_cell),
        Paragraph('P. Unitario', style_header_cell),
        Paragraph('Subtotal', style_header_cell),
    ]]
    imagen_cache = {}
    def resolver_imagen_producto(producto):
        """
        Devuelve una imagen de ReportLab o una celda vacía si no hay foto.
        Optimizado: cache por producto y miniatura reducida en memoria.
        """
        producto_id = getattr(producto, 'id', None)
        if producto_id in imagen_cache:
            return imagen_cache[producto_id]

        foto = getattr(producto, 'foto', None)
        if not foto:
            imagen_cache[producto_id] = ''
            return ''

        # 1) Leer desde el storage del ImageField
        try:
            img = _cargar_imagen_pdf_desde_file(foto, width=0.50 * inch, height=0.50 * inch)
            if img:
                imagen_cache[producto_id] = img
                return img
        except Exception:
            pass

        # 2) Fallback local
        posibles_rutas = []
        try:
            if hasattr(foto, 'path'):
                posibles_rutas.append(foto.path)
        except Exception:
            pass

        if getattr(foto, 'name', None):
            posibles_rutas.append(os.path.join(settings.MEDIA_ROOT, foto.name))

        for ruta_foto in posibles_rutas:
            img = _cargar_imagen_pdf_desde_ruta(ruta_foto, width=0.50 * inch, height=0.50 * inch)
            if img:
                imagen_cache[producto_id] = img
                return img

        imagen_cache[producto_id] = ''
        return ''

    for detalle in detalles:
        precio = float(convertir_desde_bob_para_pdf(detalle.precio_unitario, venta))
        cantidad = int(detalle.cantidad)
        subtotal_base = detalle.subtotal if hasattr(detalle, 'subtotal') else (detalle.precio_unitario * cantidad)
        subtotal_valor = float(convertir_desde_bob_para_pdf(subtotal_base, venta))
        tipo_vendedor = obtener_tipo_vendedor_detalle_pdf(detalle)
        modalidad = obtener_modalidad_detalle_pdf(detalle)
        cantidad_cajas = obtener_cantidad_cajas_pdf(detalle)

        detalle_linea = obtener_label_modalidad_pdf(modalidad)
        if cantidad_cajas > 0:
            detalle_linea += f' | {cantidad_cajas} caja(s)'

        foto = resolver_imagen_producto(detalle.producto)

        codigo = str(detalle.producto.codigo or 'N/A')[:15]
        descripcion = str(detalle.producto.descripcion or '-')
        origen = str(obtener_label_tipo_vendedor_pdf(tipo_vendedor) or '-')
        detalle_texto = str(detalle_linea or '-')

        datos_tabla.append([
            foto,
            Paragraph(escape(codigo), style_cell_left),
            Paragraph(escape(descripcion), style_cell_left),
            Paragraph(escape(origen), style_cell_center),
            Paragraph(escape(detalle_texto), style_cell_left),
            Paragraph(str(cantidad), style_cell_center),
            Paragraph(f'{etiqueta_moneda} {precio:,.2f}', style_cell_right),
            Paragraph(f'{etiqueta_moneda} {subtotal_valor:,.2f}', style_cell_right),
        ])

    tabla_detalles = Table(
        datos_tabla,
        colWidths=col_widths,
        repeatRows=1
    )

    tabla_detalles.setStyle(TableStyle([
        # Encabezado
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

        # Alineaciones cuerpo
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),   # Foto
        ('ALIGN', (1, 1), (2, -1), 'LEFT'),     # Código, Detalle Producto
        ('ALIGN', (3, 1), (3, -1), 'CENTER'),   # Origen
        ('ALIGN', (4, 1), (4, -1), 'LEFT'),     # Detalle
        ('ALIGN', (5, 1), (5, -1), 'CENTER'),   # Cantidad
        ('ALIGN', (6, 1), (7, -1), 'RIGHT'),    # Montos

        # Padding encabezado
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),

        # Padding cuerpo
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),

        # Padding horizontal general
        ('LEFTPADDING', (1, 0), (-1, -1), 5),
        ('RIGHTPADDING', (1, 0), (-1, -1), 5),

        # Padding reducido para la foto
        ('LEFTPADDING', (0, 0), (0, -1), 3),
        ('RIGHTPADDING', (0, 0), (0, -1), 3),

        # Bordes y fondos
        ('GRID', (0, 0), (-1, -1), 0.6, colors.HexColor('#374151')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
    ]))

    elements.append(tabla_detalles)
    elements.append(Spacer(1, 0.2 * inch))

    # ===== SECCIÓN 3: TOTALES =====
    
    # Calcular totales (defensivo)
    if hasattr(venta, 'subtotal'):
        subtotal = float(convertir_desde_bob_para_pdf(venta.subtotal, venta))
    else:
        subtotal = sum(
            float(convertir_desde_bob_para_pdf(
                d.subtotal if hasattr(d, 'subtotal') else (d.precio_unitario * int(d.cantidad)),
                venta
            ))
            for d in detalles
        )
    
    descuento_info = obtener_descuento_info_pdf(venta)
    monto_descuento = float(convertir_desde_bob_para_pdf(venta.descuento, venta)) if hasattr(venta, 'descuento') and venta.descuento else 0
    
    total = subtotal - monto_descuento
    
    datos_totales = [
        ['', '', 'Subtotal:', f'{etiqueta_moneda} {subtotal:,.2f}'],
    ]
    
    if descuento_info['aplica']:
        datos_totales.append(['', '', f"{descuento_info['label']}:", f'-{etiqueta_moneda} {monto_descuento:,.2f}'])
    
    datos_totales.append(['', '', 'TOTAL:', f'{etiqueta_moneda} {total:,.2f}'])
    
    tabla_totales = Table(datos_totales, colWidths=[2.5*inch, 1*inch, 1.2*inch, 1.3*inch])
    tabla_totales.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (2, -1), (-1, -1), colors.HexColor('#1f2937')),
        ('TEXTCOLOR', (2, -1), (-1, -1), colors.whitesmoke),
        ('FONTNAME', (2, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (2, -1), (-1, -1), 12),
    ]))
    
    elements.append(tabla_totales)

    comentario_venta = (getattr(venta, 'comentario', '') or '').strip()
    if comentario_venta:
        comentario_pdf = escape(comentario_venta).replace('\r\n', '\n').replace('\r', '\n').replace('\n', '<br/>')
        style_comentario_titulo = ParagraphStyle(
            'ComentarioTitulo',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=12,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=6,
        )
        style_comentario_texto = ParagraphStyle(
            'ComentarioTexto',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#111827'),
        )
        tabla_comentario = Table(
            [[Paragraph(comentario_pdf, style_comentario_texto)]],
            colWidths=[doc.width]
        )
        tabla_comentario.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor('#9ca3af')),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))

        elements.append(Spacer(1, 0.18*inch))
        elements.append(Paragraph('Comentario', style_comentario_titulo))
        elements.append(tabla_comentario)

    elements.append(Spacer(1, 0.3*inch))
    
    # ===== SECCIÓN 3.5: RESUMEN DE AMORTIZACIONES (si aplica) =====
    
    # Incluir resumen de amortizaciones si la venta es a crédito
    if venta.tipo_pago == 'credito':
        from apps.ventas.models import AmortizacionCredito
        from django.db.models import Sum
        
        amortizaciones = AmortizacionCredito.objects.filter(venta=venta)
        total_amortizado = amortizaciones.aggregate(total=Sum('monto'))['total'] or Decimal('0.00')
        saldo_pendiente = venta.total - total_amortizado
        
        # Título
        style_titulo_amort = ParagraphStyle(
            'TituloAmort',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=10,
            fontName='Helvetica-Bold'
        )
        
        elements.append(Paragraph("DETALLES DE AMORTIZACIONES Y SALDO PENDIENTE", style_titulo_amort))
        
        # Tabla de resumen de amortizaciones
        datos_amort = [['#', 'Fecha', 'Moneda', 'Monto', 'Observaciones']]
        
        for idx, amort in enumerate(amortizaciones, 1):
            fecha_str = amort.fecha.strftime('%d/%m/%Y') if amort.fecha else 'N/A'
            monto_str = f'{etiqueta_moneda} {float(convertir_desde_bob_para_pdf(amort.monto, venta)):,.2f}'
            moneda_amort = f"{(amort.moneda or venta.moneda)} ({etiqueta_moneda})"
            obs_str = (amort.observaciones[:30] + '...') if amort.observaciones and len(amort.observaciones) > 30 else (amort.observaciones or '-')
            
            datos_amort.append([str(idx), fecha_str, moneda_amort, monto_str, obs_str])
        
        if amortizaciones.exists():
            tabla_amort = Table(datos_amort, colWidths=[0.4*inch, 1.0*inch, 1.2*inch, 1.1*inch, 2.3*inch])
            tabla_amort.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('ALIGN', (4, 0), (4, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#ddd')),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            
            elements.append(tabla_amort)
            elements.append(Spacer(1, 0.15*inch))
        
        # Información de saldo
        style_saldo = ParagraphStyle(
            'Saldo',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=4,
            fontName='Helvetica'
        )
        
        info_saldo = f"""
        <b>Moneda de liquidación:</b> {moneda_liquidacion}<br/>
        <b>Total de la venta:</b> {etiqueta_moneda} {float(convertir_desde_bob_para_pdf(venta.total, venta)):,.2f}<br/>
        <b>Total amortizado:</b> {etiqueta_moneda} {float(convertir_desde_bob_para_pdf(total_amortizado, venta)):,.2f}<br/>
        <b>Saldo pendiente:</b> <b style="color: {'#22c55e' if saldo_pendiente == 0 else '#ef4444'}">{etiqueta_moneda} {float(convertir_desde_bob_para_pdf(saldo_pendiente, venta)):,.2f}</b>
        """
        
        elements.append(Paragraph(info_saldo, style_saldo))
        
        # Comprobantes de amortizaciones (en página separada si existen)
        amortizaciones_con_comprobante = amortizaciones.exclude(comprobante__exact='')
        
        if amortizaciones_con_comprobante.exists():
            total_comprobantes = amortizaciones_con_comprobante.count()
            elements.append(PageBreak())
            
            style_titulo_comprobantes = ParagraphStyle(
                'TituloComprobantes',
                parent=styles['Heading2'],
                fontSize=13,
                textColor=colors.HexColor('#1f2937'),
                spaceAfter=12,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold'
            )
            
            elements.append(Paragraph("COMPROBANTES DE AMORTIZACIÓN", style_titulo_comprobantes))
            elements.append(Spacer(1, 0.2*inch))
            
            # Iterar sobre amortizaciones con comprobante
            for idx, amort in enumerate(amortizaciones_con_comprobante, 1):
                if amort.comprobante:
                    # Información de la amortización
                    fecha_str = amort.fecha.strftime('%d/%m/%Y %H:%M') if amort.fecha else 'N/A'
                    
                    amort_info = f"""
                    <b>Comprobante #{idx}</b><br/>
                    <b>Moneda de liquidación:</b> {moneda_liquidacion}<br/>
                    <b>Monto abonado:</b> {etiqueta_moneda} {float(convertir_desde_bob_para_pdf(amort.monto, venta)):,.2f}<br/>
                    <b>Fecha y hora:</b> {fecha_str}<br/>
                    """
                    
                    if amort.observaciones:
                        amort_info += f"<b>Observaciones:</b> {amort.observaciones}<br/>"
                    
                    elements.append(Paragraph(amort_info, style_encabezado))
                    elements.append(Spacer(1, 0.15*inch))
                    
                    # Intentar agregar imagen de comprobante
                    try:
                        if amort.comprobante:
                            # Usar contenido en bytes en lugar de ruta absoluta
                            # para evitar problema de "absolute paths" en ReportLab
                            try:
                                # Leer contenido del archivo
                                comprobante_file = amort.comprobante
                                if hasattr(comprobante_file, 'open'):
                                    comprobante_file.open('rb')
                                contenido_archivo = BytesIO(comprobante_file.read())
                                thumbnail = _crear_thumbnail_pdf(
                                    contenido_archivo,
                                    ancho_max=720,
                                    alto_max=520,
                                    calidad=80,
                                )
                                if thumbnail is None:
                                    raise ValueError('No se pudo optimizar la imagen del comprobante')
                                
                                # Crear tabla para centrar imagen
                                img_data = [[Image(thumbnail, width=3.5*inch, height=2.5*inch)]]
                                img_table = Table(img_data)
                                img_table.setStyle(TableStyle([
                                    ('ALIGN', (0, 0), (0, 0), 'CENTER'),
                                    ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
                                ]))
                                elements.append(img_table)
                                elements.append(Spacer(1, 0.3*inch))
                            except Exception as img_err:
                                error_msg = f"<i>Imagen en BD pero no se pudo procesar: {str(img_err)[:50]}</i>"
                                elements.append(Paragraph(error_msg, style_encabezado))
                                elements.append(Spacer(1, 0.2*inch))
                    except Exception as e:
                        error_msg = f"<i>No se pudo cargar imagen: {str(e)}</i>"
                        elements.append(Paragraph(error_msg, style_encabezado))
                        elements.append(Spacer(1, 0.2*inch))
                    
                    # Salto de página entre comprobantes si hay más
                    if idx < total_comprobantes:
                        elements.append(PageBreak())
    
    # ===== SECCIÓN 4: INFORMACIÓN EMPRESA Y LEYENDA =====
    
    # Datos de empresa
    nombre_empresa = "ALMAZEN"
    subtitulo_empresa = "Importadora por mayor y por menor"
    
    # Estilos para empresa
    style_empresa = ParagraphStyle(
        'NombreEmpresa',
        parent=styles['Normal'],
        fontSize=16,
        textColor=colors.HexColor('#000000'),
        spaceAfter=0,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    style_subtitulo = ParagraphStyle(
        'Subtitulo',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#555555'),
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Helvetica-Oblique'
    )
    
    style_leyenda = ParagraphStyle(
        'Leyenda',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#d32f2f'),
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Helvetica-Oblique'
    )
    
    # Agregar información empresa
    elements.append(Spacer(1, 0.2*inch))
    elements.append(Paragraph(nombre_empresa, style_empresa))
    elements.append(Paragraph(subtitulo_empresa, style_subtitulo))
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Spacer(1, 0.15*inch))
    
    # ===== SECCIÓN 5: PIE DE PÁGINA =====
    
    estado_str = venta.get_estado_display() if hasattr(venta, 'get_estado_display') else venta.estado
    pie = f"""
    <b>Estado:</b> {estado_str}<br/>
    <b>Generado:</b> {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}<br/>
    <br/>
    <i>Gracias por su preferencia</i>
    """
    elements.append(Paragraph(pie, style_encabezado))
    
    # Construir PDF
    try:
        doc.build(elements)
        buffer.seek(0)
        return buffer
    except Exception as e:
        raise Exception(f"Error al construir PDF: {str(e)}")
