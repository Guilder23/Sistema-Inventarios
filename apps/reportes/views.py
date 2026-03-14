from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, JsonResponse
from django.db.models import Q, Sum, Count
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from apps.productos.models import Producto, ProductoContenedor, Contenedor, Categoria
from datetime import datetime

@login_required
def index_reportes(request):
    return render(request, 'reportes/index.html')

@login_required
def reporte_inventario(request):
    return HttpResponse('Reporte de Inventario PDF')

@login_required
def reporte_ventas(request):
    return HttpResponse('Reporte de Ventas PDF')

@login_required
def reporte_traspasos(request):
    return HttpResponse('Reporte de Traspasos PDF')

@login_required
def reporte_contenedores(request):
    """Vista para reporte de contenedores y productos"""
    
    # Obtener todos los productos con sus relaciones en contenedores
    productos_contenedores = ProductoContenedor.objects.select_related(
        'producto', 'producto__categoria', 'contenedor'
    ).all()
    
    # Obtener filtros de la petición
    buscar = request.GET.get('buscar', '').strip()
    contenedor_id = request.GET.get('contenedor', '').strip()
    categoria_id = request.GET.get('categoria', '').strip()
    proveedor = request.GET.get('proveedor', '').strip()
    estado = request.GET.get('estado', '').strip()
    fecha_desde = request.GET.get('fecha_desde', '').strip()
    fecha_hasta = request.GET.get('fecha_hasta', '').strip()
    ordenar_por = request.GET.get('ordenar', 'producto').strip()
    stock_minimo = request.GET.get('stock_minimo', '').strip()
    
    # Aplicar filtros
    if buscar:
        productos_contenedores = productos_contenedores.filter(
            Q(producto__nombre__icontains=buscar) |
            Q(producto__codigo__icontains=buscar) |
            Q(contenedor__nombre__icontains=buscar) |
            Q(contenedor__proveedor__icontains=buscar)
        )
    
    if contenedor_id:
        productos_contenedores = productos_contenedores.filter(contenedor_id=contenedor_id)
    
    if categoria_id:
        productos_contenedores = productos_contenedores.filter(producto__categoria_id=categoria_id)
    
    if proveedor:
        productos_contenedores = productos_contenedores.filter(contenedor__proveedor__icontains=proveedor)
    
    if fecha_desde:
        try:
            fecha_desde_dt = datetime.strptime(fecha_desde, '%Y-%m-%d')
            productos_contenedores = productos_contenedores.filter(fecha_creacion__gte=fecha_desde_dt)
        except ValueError:
            pass
    
    if fecha_hasta:
        try:
            fecha_hasta_dt = datetime.strptime(fecha_hasta, '%Y-%m-%d')
            productos_contenedores = productos_contenedores.filter(fecha_creacion__lte=fecha_hasta_dt)
        except ValueError:
            pass
    
    if stock_minimo:
        try:
            stock_min = int(stock_minimo)
            productos_contenedores = productos_contenedores.filter(cantidad__gte=stock_min)
        except ValueError:
            pass
    
    # Aplicar ordenamiento
    if ordenar_por == 'producto':
        productos_contenedores = productos_contenedores.order_by('producto__nombre')
    elif ordenar_por == 'codigo':
        productos_contenedores = productos_contenedores.order_by('producto__codigo')
    elif ordenar_por == 'contenedor':
        productos_contenedores = productos_contenedores.order_by('contenedor__nombre')
    elif ordenar_por == 'proveedor':
        productos_contenedores = productos_contenedores.order_by('contenedor__proveedor')
    elif ordenar_por == 'stock_desc':
        productos_contenedores = productos_contenedores.order_by('-cantidad')
    elif ordenar_por == 'stock_asc':
        productos_contenedores = productos_contenedores.order_by('cantidad')
    elif ordenar_por == 'fecha_desc':
        productos_contenedores = productos_contenedores.order_by('-fecha_actualizacion')
    elif ordenar_por == 'fecha_asc':
        productos_contenedores = productos_contenedores.order_by('fecha_actualizacion')
    
    # Preparar datos con estado de stock
    items_reporte = []
    for pc in productos_contenedores:
        producto = pc.producto
        
        # Determinar estado de stock
        if producto.stock_critico and pc.cantidad <= producto.stock_critico:
            estado_stock = 'critico'
        elif producto.stock_bajo and pc.cantidad <= producto.stock_bajo:
            estado_stock = 'bajo'
        else:
            estado_stock = 'normal'
        
        # Filtrar por estado si está seleccionado
        if estado and estado_stock != estado:
            continue
        
        items_reporte.append({
            'producto': producto,
            'contenedor': pc.contenedor,
            'cantidad': pc.cantidad,
            'cantidad_recibida': pc.cantidad_recibida,
            'estado': estado_stock,
            'fecha_actualizacion': pc.fecha_actualizacion,
        })
    
    # Obtener todos los contenedores y categorías para los filtros
    contenedores = Contenedor.objects.filter(activo=True).order_by('nombre')
    categorias = Categoria.objects.filter(activo=True).order_by('nombre')
    proveedores = Contenedor.objects.filter(activo=True).values_list('proveedor', flat=True).distinct().order_by('proveedor')
    
    # Calcular totales
    total_items = len(items_reporte)
    total_unidades = sum(item['cantidad'] for item in items_reporte)
    total_contenedores = contenedores.count()
    
    # Contar filtros activos
    filtros_activos = sum([
        bool(buscar),
        bool(contenedor_id),
        bool(categoria_id),
        bool(proveedor),
        bool(estado),
        bool(fecha_desde),
        bool(fecha_hasta),
        bool(stock_minimo),
    ])
    
    # Configurar paginación (20 items por página)
    paginator = Paginator(items_reporte, 20)
    page = request.GET.get('page', 1)
    
    try:
        items_paginados = paginator.page(page)
    except PageNotAnInteger:
        items_paginados = paginator.page(1)
    except EmptyPage:
        items_paginados = paginator.page(paginator.num_pages)
    
    context = {
        'items_reporte': items_paginados,
        'contenedores': contenedores,
        'categorias': categorias,
        'proveedores': proveedores,
        'total_items': total_items,
        'total_unidades': total_unidades,
        'total_contenedores': total_contenedores,
        'filtros_activos': filtros_activos,
        # Mantener valores de filtros
        'buscar': buscar,
        'contenedor_id': contenedor_id,
        'categoria_id': categoria_id,
        'proveedor': proveedor,
        'estado': estado,
        'fecha_desde': fecha_desde,
        'fecha_hasta': fecha_hasta,
        'ordenar_por': ordenar_por,
        'stock_minimo': stock_minimo,
    }
    
    return render(request, 'reportes/contenedores.html', context)
