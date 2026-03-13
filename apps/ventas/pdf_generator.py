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
from django.conf import settings
from apps.moneda.utils import obtener_etiqueta_moneda


def generar_pdf_venta_completo(venta):
    """
    Genera PDF completo de una venta (por ahora para tienda Almacén o Tienda).
    """
    buffer = BytesIO()
    # Reducir márgenes para aprovechar mejor el espacio
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.3*inch, bottomMargin=0.3*inch)
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
            # Leer logo en BytesIO para evitar problema de absolute paths en Windows
            with open(logo_path, 'rb') as logo_file:
                logo_bytes = BytesIO(logo_file.read())
                logo_bytes.seek(0)  # ⬅️ IMPORTANTE: resetear posición del cursor
                logo = Image(logo_bytes, width=0.8*inch, height=0.8*inch)
                header_row.append(logo)
        except Exception as e:
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
    
    # ===== SECCIÓN 1: CABECERA =====
    
    # Título (inferir de rol del vendedor)
    titulo = "COMPROBANTE DE VENTA"
    
    elements.append(Paragraph(titulo, style_titulo))
    elements.append(Spacer(1, 0.1*inch))
    
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
            f'{etiqueta_moneda} {precio:,.2f}',
            f'{etiqueta_moneda} {subtotal_valor:,.2f}'
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
    
    # Descuento (aplicar de campo descuento del modelo)
    monto_descuento = float(venta.descuento) if hasattr(venta, 'descuento') and venta.descuento else 0
    
    total = subtotal - monto_descuento
    
    datos_totales = [
        ['', '', 'Subtotal:', f'{etiqueta_moneda} {subtotal:,.2f}'],
    ]
    
    if monto_descuento > 0:
        datos_totales.append(['', '', 'Descuento:', f'-{etiqueta_moneda} {monto_descuento:,.2f}'])
    
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
        datos_amort = [['#', 'Fecha', 'Monto', 'Observaciones']]
        
        for idx, amort in enumerate(amortizaciones, 1):
            fecha_str = amort.fecha.strftime('%d/%m/%Y') if amort.fecha else 'N/A'
            monto_str = f'Bs. {float(amort.monto):,.2f}'
            obs_str = (amort.observaciones[:30] + '...') if amort.observaciones and len(amort.observaciones) > 30 else (amort.observaciones or '-')
            
            datos_amort.append([str(idx), fecha_str, monto_str, obs_str])
        
        if amortizaciones.exists():
            tabla_amort = Table(datos_amort, colWidths=[0.5*inch, 1.2*inch, 1.3*inch, 2.5*inch])
            tabla_amort.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('ALIGN', (3, 0), (3, -1), 'LEFT'),
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
        <b>Total de la venta:</b> Bs. {float(venta.total):,.2f}<br/>
        <b>Total amortizado:</b> Bs. {float(total_amortizado):,.2f}<br/>
        <b>Saldo pendiente:</b> <b style="color: {'#22c55e' if saldo_pendiente == 0 else '#ef4444'}">Bs. {float(saldo_pendiente):,.2f}</b>
        """
        
        elements.append(Paragraph(info_saldo, style_saldo))
        
        # Comprobantes de amortizaciones (en página separada si existen)
        amortizaciones_con_comprobante = amortizaciones.exclude(comprobante__exact='')
        
        if amortizaciones_con_comprobante.exists():
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
                    <b>Monto abonado:</b> Bs. {float(amort.monto):,.2f}<br/>
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
                                comprobante_file.seek(0)
                                contenido_archivo = BytesIO(comprobante_file.read())
                                
                                # Crear tabla para centrar imagen
                                img_data = [[Image(contenido_archivo, width=3.5*inch, height=2.5*inch)]]
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
                    if idx < amortizaciones_con_comprobante.count():
                        elements.append(PageBreak())
    
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