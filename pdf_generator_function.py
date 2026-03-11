def generar_pdf_lista(ventas, tipo_pago='contado'):
    """Genera PDF con lista de ventas por tipo de pago."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    
    elements = []
    
    # Título
    tipo_display = "Al Contado" if tipo_pago == 'contado' else "A Crédito"
    title = Paragraph(f"<b>Listado de Ventas - {tipo_display}</b>", styles['Title'])
    elements.append(title)
    
    # Tabla de ventas
    data = [['Código', 'Cliente', 'Fecha', 'Total', 'Estado']]
    total_general = 0
    
    for venta in ventas:
        data.append([
            venta.codigo,
            venta.cliente,
            venta.fecha_elaboracion.strftime('%d/%m/%Y'),
            f"Bs. {venta.total:.2f}",
            venta.get_estado_display()
        ])
        total_general += venta.total
    
    # Agregar total
    data.append(['', '', '', f"Bs. {total_general:.2f}", ''])
    
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), '#2c6fbb'),
        ('TEXTCOLOR', (0, 0), (-1, 0), 'white'),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -2), '#f8f9fc'),
        ('BACKGROUND', (-1, -1), (-1, -1), '#e9ecef'),
        ('FONTNAME', (-1, -1), (-1, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, '#d1d5db'),
    ]))
    elements.append(table)
    
    doc.build(elements)
    
    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="ventas_{tipo_pago}.pdf"'
    
    return response
