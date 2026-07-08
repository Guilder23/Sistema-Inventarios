"""
Generador de PDFs para traspasos
Este módulo es reutilizable y eficiente
"""

from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from datetime import datetime
from decimal import Decimal
import os
from xml.sax.saxutils import escape
from django.conf import settings
from PIL import Image as PILImage, ImageOps


def _crear_thumbnail_pdf(contenido, ancho_max=220, alto_max=220, calidad=82):
    """
    Reduce una imagen en memoria antes de pasársela a ReportLab.
    Esto evita que el PDF procese fotos originales demasiado pesadas.
    Optimiza automáticamente formato y EXIF.
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
    """Carga imagen desde un ImageField"""
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
    """Carga imagen desde una ruta local"""
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


def obtener_nombre_ubicacion_pdf(ubicacion):
    """Obtiene el nombre legible de una ubicación"""
    if not ubicacion:
        return 'Sin especificar'
    
    nombre = ubicacion.nombre_ubicacion
    if not nombre and ubicacion.tienda:
        nombre = ubicacion.tienda.nombre
    if not nombre and ubicacion.almacen:
        nombre = ubicacion.almacen.nombre
    if not nombre and ubicacion.usuario:
        nombre = ubicacion.usuario.username
    
    return nombre or 'Sin especificar'


def obtener_cantidad_cajas_pdf(detalle):
    """Calcula cantidad de cajas basado en unidades por caja"""
    unidades_por_caja = int(getattr(detalle.producto, 'unidades_por_caja', 0) or 0)
    if unidades_por_caja <= 0:
        return '0'

    cantidad = int(getattr(detalle, 'cantidad', 0) or 0)
    cajas = float(cantidad) / unidades_por_caja
    
    if cajas == int(cajas):
        return str(int(cajas))
    return f'{cajas:.2f}'


def generar_pdf_traspaso_completo(traspaso):
    """
    Genera PDF completo de un traspaso.
    Versión optimizada y reutilizable.
    """
    buffer = BytesIO()
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
    style_titulo = ParagraphStyle(
        'TituloTraspaso',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    style_encabezado = ParagraphStyle(
        'Encabezado',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#374151'),
        spaceAfter=4
    )

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
        fontSize=8,
        textColor=colors.HexColor('#666666'),
        fontName='Helvetica-Oblique',
        spaceAfter=1
    )

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

    # ===== SECCIÓN 0: HEADER CON LOGO =====
    logo_path = os.path.join(settings.BASE_DIR, 'static', 'img', 'logoAlmacen.png')

    if os.path.exists(logo_path):
        try:
            logo = _cargar_imagen_pdf_desde_ruta(
                logo_path,
                width=1.1 * inch,
                height=1.1 * inch
            )
            if not logo:
                logo = Paragraph("<b>ALMAZEN</b>", style_empresa_nombre)
        except Exception:
            logo = Paragraph("<b>ALMAZEN</b>", style_empresa_nombre)
    else:
        logo = Paragraph("<b>ALMAZEN</b>", style_empresa_nombre)

    # ===== DATOS GENERALES =====
    titulo = "COMPROBANTE DE TRASPASO"
    
    fecha_str = (
        traspaso.fecha_creacion.strftime('%d/%m/%Y %H:%M')
        if hasattr(traspaso, 'fecha_creacion')
        else datetime.now().strftime('%d/%m/%Y %H:%M')
    )

    codigo_traspaso_str = str(traspaso.codigo)
    
    origen_nombre = obtener_nombre_ubicacion_pdf(traspaso.origen)
    destino_nombre = obtener_nombre_ubicacion_pdf(traspaso.destino)
    
    tipo_traspaso = (
        traspaso.get_tipo_display()
        if hasattr(traspaso, 'get_tipo_display')
        else traspaso.tipo
    )
    
    estado_traspaso = (
        traspaso.get_estado_display()
        if hasattr(traspaso, 'get_estado_display')
        else traspaso.estado
    )

    info_general = f"""
    <b>Código:</b> {codigo_traspaso_str}<br/>
    <b>Fecha:</b> {fecha_str}<br/>
    <b>Origen:</b> {escape(origen_nombre)}<br/>
    <b>Destino:</b> {escape(destino_nombre)}<br/>
    <b>Tipo:</b> {tipo_traspaso}<br/>
    <b>Estado:</b> {estado_traspaso}
    """

    # ===== CELDAS ENCABEZADO =====
    logo_cell = logo
    title_cell = Paragraph(titulo, style_titulo)
    info_cell = Paragraph(info_general, style_encabezado)

    logo_col_width = 1.4 * inch

    header_top = Table(
        [[
            logo_cell,
            title_cell,
            ''
        ]],
        colWidths=[
            logo_col_width,
            doc.width - (logo_col_width * 2),
            logo_col_width
        ]
    )

    header_top.setStyle(TableStyle([
        ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (0, 0), 0),
        ('RIGHTPADDING', (0, 0), (0, 0), 10),
        ('TOPPADDING', (0, 0), (0, 0), 0),
        ('BOTTOMPADDING', (0, 0), (0, 0), 0),
        ('VALIGN', (1, 0), (1, 0), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))

    info_table = Table(
        [[info_cell]],
        colWidths=[doc.width]
    )

    info_table.setStyle(TableStyle([
        ('LEFTPADDING', (0, 0), (0, 0), 0),
        ('TOPPADDING', (0, 0), (0, 0), 10),
    ]))

    elements.append(header_top)
    elements.append(info_table)
    elements.append(Spacer(1, 0.2 * inch))

    # ===== SECCIÓN 1: TABLA DE DETALLES =====
    detalles = traspaso.detalles.all()

    ancho_tabla = doc.width
    col_widths = [
        ancho_tabla * 0.12,  # Foto
        ancho_tabla * 0.11,  # Código
        ancho_tabla * 0.22,  # Nombre
        ancho_tabla * 0.22,  # Descripción
        ancho_tabla * 0.16,  # Cantidad Unidad
        ancho_tabla * 0.17,  # Cantidad Caja
    ]

    datos_tabla = [[
        Paragraph('Foto', style_header_cell),
        Paragraph('Código', style_header_cell),
        Paragraph('Nombre Producto', style_header_cell),
        Paragraph('Descripción', style_header_cell),
        Paragraph('Cantidad Unidad', style_header_cell),
        Paragraph('Cantidad Caja', style_header_cell),
    ]]

    imagen_cache = {}

    def resolver_imagen_producto(producto):
        """
        Devuelve una imagen optimizada o una celda vacía.
        Con cache por producto para mejor rendimiento.
        """
        producto_id = getattr(producto, 'id', None)
        if producto_id in imagen_cache:
            return imagen_cache[producto_id]

        foto = getattr(producto, 'foto', None)
        if not foto:
            imagen_cache[producto_id] = ''
            return ''

        # Intentar desde ImageField
        try:
            img = _cargar_imagen_pdf_desde_file(foto, width=0.50 * inch, height=0.50 * inch)
            if img:
                imagen_cache[producto_id] = img
                return img
        except Exception:
            pass

        # Fallback a ruta local
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
        codigo = str(detalle.producto.codigo or 'N/A')[:15]
        nombre = str(detalle.producto.nombre or '-')
        descripcion = str(detalle.producto.descripcion or '-')
        cantidad = int(detalle.cantidad)
        cantidad_cajas = obtener_cantidad_cajas_pdf(detalle)

        foto = resolver_imagen_producto(detalle.producto)

        datos_tabla.append([
            foto,
            Paragraph(escape(codigo), style_cell_left),
            Paragraph(escape(nombre), style_cell_left),
            Paragraph(escape(descripcion), style_cell_left),
            Paragraph(str(cantidad), style_cell_center),
            Paragraph(cantidad_cajas, style_cell_center),
        ])

    tabla_detalles = Table(
        datos_tabla,
        colWidths=col_widths,
        repeatRows=1
    )

    tabla_detalles.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

        ('ALIGN', (0, 1), (0, -1), 'CENTER'),   # Foto
        ('ALIGN', (1, 1), (3, -1), 'LEFT'),     # Código, Nombre, Descripción
        ('ALIGN', (4, 1), (5, -1), 'CENTER'),   # Cantidades

        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),

        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),

        ('LEFTPADDING', (1, 0), (-1, -1), 5),
        ('RIGHTPADDING', (1, 0), (-1, -1), 5),

        ('LEFTPADDING', (0, 0), (0, -1), 3),
        ('RIGHTPADDING', (0, 0), (0, -1), 3),

        ('GRID', (0, 0), (-1, -1), 0.6, colors.HexColor('#374151')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
    ]))

    elements.append(tabla_detalles)
    elements.append(Spacer(1, 0.2 * inch))

    # ===== SECCIÓN 2: COMENTARIO =====
    comentario_traspaso = (getattr(traspaso, 'comentario', '') or '').strip()
    if comentario_traspaso:
        comentario_pdf = escape(comentario_traspaso).replace('\r\n', '\n').replace('\r', '\n').replace('\n', '<br/>')
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

        elements.append(Paragraph('Comentario', style_comentario_titulo))
        elements.append(tabla_comentario)
        elements.append(Spacer(1, 0.2 * inch))

    elements.append(Spacer(1, 0.25 * inch))

    # ===== SECCIÓN 3: FIRMAS =====
    style_firma_linea = ParagraphStyle(
        'FirmaLinea',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#0f172a'),
        alignment=TA_CENTER
    )

    style_firma_etiqueta = ParagraphStyle(
        'FirmaEtiqueta',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#4b5563'),
        alignment=TA_CENTER
    )

    style_firma_titulo = ParagraphStyle(
        'FirmaTitulo',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#1f2937'),
        fontName='Helvetica-Bold',
        alignment=TA_CENTER
    )

    firma_line = Paragraph('___________________________', style_firma_linea)
    firma_label = Paragraph('Nombre y firma', style_firma_etiqueta)

    firma_table = Table(
        [
            [firma_line, firma_line],
            [
                Paragraph(escape(origen_nombre), style_firma_titulo),
                Paragraph(escape(destino_nombre), style_firma_titulo)
            ],
            [firma_label, firma_label],
        ],
        colWidths=[3.4 * inch, 3.4 * inch],
        hAlign='LEFT'
    )

    firma_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))

    elements.append(firma_table)
    elements.append(Spacer(1, 0.2 * inch))

    # ===== SECCIÓN 4: PIE DE PÁGINA =====
    pie = f"""
    <b>Generado:</b> {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}<br/>
    <br/>
    <i>Comprobante oficial de traspaso</i>
    """
    elements.append(Paragraph(pie, style_encabezado))

    # Construir PDF
    try:
        doc.build(elements)
        buffer.seek(0)
        return buffer
    except Exception as e:
        raise Exception(f"Error al construir PDF de traspaso: {str(e)}")
