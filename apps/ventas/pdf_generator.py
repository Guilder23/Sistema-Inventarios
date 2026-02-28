"""
Generador de PDFs para ventas
Este módulo es reutilizable
"""

from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from datetime import datetime


def generar_pdf_venta_completo(venta):
    """
    Genera PDF completo de una venta (por ahora para tienda Almacén o Tienda).
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    # ===== ESTILOS PERSONALIZADOS =====
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
    
    # ===== SECCIÓN 1: CABECERA =====
    
    # Título (inferir de rol del vendedor)
    titulo = "COMPROBANTE DE VENTA"
    if hasattr(venta.vendedor, 'perfil') and venta.vendedor.perfil.rol == 'tienda':
        titulo += " - TIENDA"
    else:
        titulo += " - ALMACÉN"
    
    elements.append(Paragraph(titulo, style_titulo))
    
    # Datos generales
    fecha_str = venta.fecha_elaboracion.strftime('%d/%m/%Y %H:%M') if hasattr(venta, 'fecha_elaboracion') else datetime.now().strftime('%d/%m/%Y %H:%M')
    codigo_venta_str = getattr(venta, 'codigo', f'VENTA-{venta.id}')
    vendedor_nombre = venta.vendedor.get_full_name() or venta.vendedor.username
    tipo_pago = venta.get_tipo_pago_display() if hasattr(venta, 'get_tipo_pago_display') else venta.tipo_pago
    
    info_general = f"""
    <b>Código:</b> {codigo_venta_str}<br/>
    <b>Fecha:</b> {fecha_str}<br/>
    <b>Cliente:</b> {venta.cliente}<br/>
    <b>Vendedor:</b> {vendedor_nombre}<br/>
    <b>Tipo Pago:</b> {tipo_pago}
    """
    elements.append(Paragraph(info_general, style_encabezado))
    elements.append(Spacer(1, 0.3*inch))
    
    # ===== SECCIÓN 2: TABLA DE DETALLES =====
    
    detalles = venta.detalles.all()
    datos_tabla = [['Producto', 'Cantidad', 'P. Unitario', 'Subtotal']]
    
    for detalle in detalles:
        precio = float(detalle.precio_unitario)
        cantidad = int(detalle.cantidad)
        subtotal_valor = float(detalle.subtotal) if hasattr(detalle, 'subtotal') else (precio * cantidad)
        
        datos_tabla.append([
            detalle.producto.nombre[:40],
            str(cantidad),
            f'${precio:,.2f}',
            f'${subtotal_valor:,.2f}'
        ])
    
    # Calcular desglose si es tienda con cantidad > unidades_por_caja
    datos_tabla_final = []
    if hasattr(venta.vendedor, 'perfil') and venta.vendedor.perfil.rol == 'tienda':
        for fila in datos_tabla:
            if fila == datos_tabla[0]:  # Es encabezado
                datos_tabla_final.append(fila)
            else:
                # Calcular desglose
                try:
                    cantidad = int(fila[1])
                    producto_id = next((d.producto.id for d in venta.detalles.all() if d.producto.nombre[:40] == fila[0]), None)
                    if producto_id:
                        producto = next((d.producto for d in venta.detalles.all() if d.producto.id == producto_id), None)
                        if producto and producto.unidades_por_caja and cantidad > producto.unidades_por_caja:
                            cajas = cantidad // producto.unidades_por_caja
                            mayoristas = cantidad % producto.unidades_por_caja
                            cantidad_display = f"{cajas} caja{'s' if cajas > 1 else ''} + {mayoristas} mayor"
                            datos_tabla_final.append([fila[0], cantidad_display, fila[2], fila[3]])
                        else:
                            datos_tabla_final.append(fila)
                    else:
                        datos_tabla_final.append(fila)
                except:
                    datos_tabla_final.append(fila)
    else:
        datos_tabla_final = datos_tabla
    
    tabla_detalles = Table(datos_tabla_final, colWidths=[2.5*inch, 1*inch, 1.2*inch, 1.3*inch])
    tabla_detalles.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')])
    ]))
    
    elements.append(tabla_detalles)
    elements.append(Spacer(1, 0.2*inch))
    
    #TODO: Aquí va desglose de modalidades si aplica (Tienda)
    # Ejemplo: "1 caja + 8 mayor" para ventas mixtas
    
    # ===== SECCIÓN 3: TOTALES =====
    
    # Calcular totales (defensivo)
    if hasattr(venta, 'subtotal'):
        subtotal = float(venta.subtotal)
    else:
        subtotal = sum(float(d.subtotal) if hasattr(d, 'subtotal') else (float(d.precio_unitario) * int(d.cantidad)) for d in detalles)
    
    # Descuento (comentado para futuro)
    monto_descuento = float(venta.monto_descuento) if hasattr(venta, 'monto_descuento') else 0
    #TODO: Descuento de dinero se aplicará aquí
    
    total = subtotal - monto_descuento
    
    datos_totales = [
        ['', '', 'Subtotal:', f'${subtotal:,.2f}'],
    ]
    
    if monto_descuento > 0:
        datos_totales.append(['', '', 'Descuento:', f'-${monto_descuento:,.2f}'])
    
    datos_totales.append(['', '', 'TOTAL:', f'${total:,.2f}'])
    
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
    elements.append(Spacer(1, 0.3*inch))
    
    # ===== SECCIÓN 4: INFORMACIÓN EMPRESA Y LEYENDA =====
    
    # Datos de empresa
    nombre_empresa = "ALMAZEN"
    subtitulo_empresa = "Importadora por mayor y por menor"
    leyenda_devolucion = (
        "*En caso de hacer la devolución de esta compra aproximarse con el código "
        "de la venta que está impreso en esta factura, caso contrario no podrá hacer la devolución*"
    )
    
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
    elements.append(Paragraph(leyenda_devolucion, style_leyenda))
    elements.append(Spacer(1, 0.15*inch))
    
    # ===== SECCIÓN 5: PIE DE PÁGINA =====
    
    estado_str = venta.get_estado_display() if hasattr(venta, 'get_estado_display') else venta.estado
    pie = f"""
    <b>Estado:</b> {estado_str}<br/>
    <b>Generado:</b> {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}<br/>
    <br/>
    <i>Este documento fue generado automáticamente por el sistema de ventas</i>
    """
    elements.append(Paragraph(pie, style_encabezado))
    
    # Construir PDF
    try:
        doc.build(elements)
        buffer.seek(0)
        return buffer
    except Exception as e:
        raise Exception(f"Error al construir PDF: {str(e)}")