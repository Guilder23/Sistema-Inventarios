from io import BytesIO
from datetime import datetime
import os

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from xml.sax.saxutils import escape


def _obtener_nombre_ubicacion_pdf(ubicacion):
    if not ubicacion:
        return 'Sin especificar'

    nombre = getattr(ubicacion, 'nombre_ubicacion', '')
    if not nombre and getattr(ubicacion, 'tienda', None):
        nombre = ubicacion.tienda.nombre
    if not nombre and getattr(ubicacion, 'almacen', None):
        nombre = ubicacion.almacen.nombre
    if not nombre and getattr(ubicacion, 'usuario', None):
        nombre = ubicacion.usuario.username

    return nombre or 'Sin especificar'


def generar_pdf_pedido_completo(pedido):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        topMargin=0.35 * inch,
        bottomMargin=0.35 * inch,
        leftMargin=0.4 * inch,
        rightMargin=0.4 * inch,
    )
    elements = []
    styles = getSampleStyleSheet()

    style_titulo = ParagraphStyle(
        'TituloPedido',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    style_encabezado = ParagraphStyle(
        'EncabezadoPedido',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#374151'),
        spaceAfter=4,
    )

    style_empresa = ParagraphStyle(
        'EmpresaPedido',
        parent=styles['Normal'],
        fontSize=14,
        textColor=colors.HexColor('#000000'),
        fontName='Helvetica-Bold',
        spaceAfter=2,
    )

    style_header_cell = ParagraphStyle(
        'HeaderCellPedido',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=10,
        alignment=TA_CENTER,
        textColor=colors.whitesmoke,
    )

    style_cell_left = ParagraphStyle(
        'CellLeftPedido',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=9.5,
        alignment=TA_LEFT,
        textColor=colors.HexColor('#111827'),
    )

    style_cell_center = ParagraphStyle(
        'CellCenterPedido',
        parent=style_cell_left,
        alignment=TA_CENTER,
    )

    style_cell_right = ParagraphStyle(
        'CellRightPedido',
        parent=style_cell_left,
        alignment=TA_RIGHT,
    )

    from reportlab.platypus import Image

    # Encabezado con texto a la izquierda y logo pegado a la derecha
    header_table = Table([
        [
            Paragraph('<b>ALMACÉN</b>', style_empresa),
            ''
        ]
    ], colWidths=[4.7 * inch, 1.3 * inch])

    logo_path = os.path.join(settings.BASE_DIR, 'static', 'img', 'logoAlmacen.png')
    if os.path.exists(logo_path):
        try:
            logo = Image(logo_path, width=1.0 * inch, height=1.0 * inch)
            header_table = Table([
                [
                    Paragraph('<b>ALMACÉN</b>', style_empresa),
                    logo,
                ]
            ], colWidths=[4.7 * inch, 1.3 * inch])
            header_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (1, 0), (1, 0), 0),
            ]))
        except Exception:
            header_table = Table([
                [
                    Paragraph('<b>ALMACÉN</b>', style_empresa),
                    Paragraph('', style_empresa),
                ]
            ], colWidths=[4.7 * inch, 1.3 * inch])
    elements.append(header_table)

    elements.append(Paragraph('COMPROBANTE DE PEDIDO', style_titulo))

    fecha_actual = getattr(pedido, 'fecha_solicitud', datetime.now())
    fecha_texto = fecha_actual.strftime('%d/%m/%Y %H:%M') if hasattr(fecha_actual, 'strftime') else str(fecha_actual)

    datos = [
        ['Código:', escape(str(pedido.codigo))],
        ['Estado:', escape(str(pedido.get_estado_display()))],
        ['Fecha:', fecha_texto],
        ['Solicitante:', _obtener_nombre_ubicacion_pdf(pedido.solicitante)],
        ['Proveedor:', _obtener_nombre_ubicacion_pdf(pedido.proveedor)],
    ]

    tabla_datos = Table(datos, colWidths=[2.1 * inch, 4.2 * inch])
    tabla_datos.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dbe2ea')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(Spacer(1, 0.15 * inch))
    elements.append(tabla_datos)

    comentario = (pedido.comentario or '').strip()
    if comentario:
        elements.append(Spacer(1, 0.18 * inch))
        elements.append(Paragraph('Comentario:', style_encabezado))
        elements.append(Paragraph(escape(comentario).replace('\r\n', '<br/>').replace('\n', '<br/>'), style_cell_left))

    elements.append(Spacer(1, 0.2 * inch))
    elements.append(Paragraph('Productos del pedido', style_encabezado))

    detalle_rows = [[
        Paragraph('Foto', style_header_cell),
        Paragraph('Código', style_header_cell),
        Paragraph('Nombre', style_header_cell),
        Paragraph('Descripción', style_header_cell),
        Paragraph('Cantidad Unidad', style_header_cell),
        Paragraph('Cantidad Caja', style_header_cell),
    ]]

    for detalle in pedido.detalles.select_related('producto').all():
        producto = detalle.producto
        foto = ''
        if producto.foto:
            try:
                foto = Image(producto.foto.path, width=0.5 * inch, height=0.5 * inch)
            except Exception:
                foto = Paragraph('Foto', style_cell_center)

        unidades_por_caja = int(getattr(producto, 'unidades_por_caja', 0) or 0)
        cantidad_cajas = (detalle.cantidad / unidades_por_caja) if unidades_por_caja > 0 else 0
        cantidad_cajas_format = f'{cantidad_cajas:.2f}' if cantidad_cajas % 1 else str(int(cantidad_cajas))

        detalle_rows.append([
            foto or Paragraph('-', style_cell_center),
            Paragraph(escape(str(producto.codigo)), style_cell_left),
            Paragraph(escape(str(producto.nombre)), style_cell_left),
            Paragraph(escape((producto.descripcion or 'Sin descripción')[:200]), style_cell_left),
            Paragraph(str(detalle.cantidad), style_cell_center),
            Paragraph(cantidad_cajas_format, style_cell_center),
        ])

    if len(detalle_rows) == 1:
        detalle_rows.append([
            Paragraph('-', style_cell_center),
            Paragraph('', style_cell_center),
            Paragraph('Sin productos', style_cell_left),
            Paragraph('', style_cell_center),
            Paragraph('', style_cell_center),
            Paragraph('', style_cell_center),
        ])

    tabla_productos = Table(detalle_rows, colWidths=[0.7 * inch, 1.0 * inch, 1.4 * inch, 1.9 * inch, 1.1 * inch, 1.0 * inch])
    tabla_productos.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dbe2ea')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7.2),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
    ]))
    elements.append(tabla_productos)

    elements.append(Spacer(1, 0.25 * inch))
    elements.append(Paragraph(f'Total de productos: {pedido.total_productos}', style_cell_right))

    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return BytesIO(pdf)
