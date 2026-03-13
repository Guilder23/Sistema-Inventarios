from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q, Sum
from django.http import JsonResponse

from .models import Inventario, MovimientoInventario
from apps.usuarios.models import PerfilUsuario
from apps.depositos.models import Deposito
from apps.productos.models import Producto, ProductoContenedor

@login_required
def ver_inventario(request):
    perfil = getattr(request.user, 'perfil', None)

    if not perfil:
        messages.error(request, 'No tiene una ubicación asignada para consultar inventario')
        return redirect('dashboard')

    buscar = request.GET.get('buscar', '').strip()
    estado = request.GET.get('estado', '').strip()

    ubicaciones_inventario = [perfil]
    nombre_ubicacion = perfil.nombre_ubicacion or perfil.usuario.username

    if perfil.rol == 'tienda' and perfil.tienda_id:
        ubicaciones_inventario = list(
            PerfilUsuario.objects.filter(rol='tienda', tienda_id=perfil.tienda_id)
        )
        nombre_ubicacion = perfil.tienda.nombre if perfil.tienda else nombre_ubicacion

    # Para almacén: mostrar TODOS los productos activos con stock desde ProductoContenedor
    if perfil.rol == 'almacen':
        productos_almacen = Producto.objects.filter(activo=True).prefetch_related('productos_contenedores')
        
        inventarios_lista = []
        for prod in productos_almacen:
            stock_total = prod.stock  # Calcula desde ProductoContenedor
            
            # Crear objeto "fake" para compatibilidad con template
            clase_inventario = type('InventarioAlmacen', (), {
                'producto': prod,
                'cantidad': stock_total,
                'ubicacion': perfil,
                'id': f"almacen_{prod.id}",
                'fecha_actualizacion': prod.fecha_actualizacion,
                'estado_stock': 'critico' if stock_total <= prod.stock_critico 
                               else 'bajo' if stock_total <= prod.stock_bajo 
                               else 'normal'
            })()
            
            if not buscar or (
                prod.codigo.lower().find(buscar.lower()) != -1 or
                prod.nombre.lower().find(buscar.lower()) != -1 or
                (prod.categoria and prod.categoria.nombre.lower().find(buscar.lower()) != -1)
            ):
                if not estado or clase_inventario.estado_stock == estado:
                    inventarios_lista.append(clase_inventario)
    else:
        # Para tienda/depósito: usar tabla Inventario
        inventarios = Inventario.objects.select_related(
            'producto',
            'producto__categoria',
            'ubicacion'
        ).filter(ubicacion__in=ubicaciones_inventario, producto__activo=True)

        if buscar:
            inventarios = inventarios.filter(
                Q(producto__codigo__icontains=buscar)
                | Q(producto__nombre__icontains=buscar)
                | Q(producto__categoria__nombre__icontains=buscar)
            )

        inventarios_lista = list(inventarios)

        if estado in ['normal', 'bajo', 'critico']:
            inventarios_lista = [item for item in inventarios_lista if item.estado_stock == estado]

    total_items = len(inventarios_lista)
    total_unidades = sum(item.cantidad for item in inventarios_lista)

    context = {
        'inventarios': inventarios_lista,
        'buscar': buscar,
        'estado': estado,
        'ubicacion_actual': perfil,
        'nombre_ubicacion': nombre_ubicacion,
        'tipo_inventario': 'tienda' if perfil.rol == 'tienda' else 'ubicacion',
        'titulo_inventario': 'Inventario de Tienda' if perfil.rol == 'tienda' else 'Inventario',
        'label_stock': 'Stock Tienda' if perfil.rol == 'tienda' else 'Stock',
        'es_tienda': perfil.rol == 'tienda',
        'es_almacen': perfil.rol == 'almacen',
        'total_items': total_items,
        'total_unidades': total_unidades,
    }
    return render(request, 'inventario/ver.html', context)


@login_required
def ver_inventario_deposito(request):
    perfil = getattr(request.user, 'perfil', None)

    if not perfil or perfil.rol != 'tienda':
        messages.error(request, 'Solo el personal de tienda puede acceder al inventario de depósito')
        return redirect('dashboard')

    if not perfil.tienda_id:
        messages.error(request, 'Su usuario no tiene una tienda asignada')
        return redirect('ver_inventario')

    buscar = request.GET.get('buscar', '').strip()
    estado = request.GET.get('estado', '').strip()

    depositos = Deposito.objects.filter(tienda_id=perfil.tienda_id).order_by('id')
    tiene_depositos_vinculados = depositos.exists()
    nombres_depositos = list(depositos.values_list('nombre', flat=True))

    ubicaciones_deposito = PerfilUsuario.objects.filter(
        rol='deposito',
        tienda_id=perfil.tienda_id,
    )

    inventarios = Inventario.objects.select_related(
        'producto',
        'producto__categoria',
        'ubicacion'
    ).filter(ubicacion__in=ubicaciones_deposito, producto__activo=True)

    if buscar:
        inventarios = inventarios.filter(
            Q(producto__codigo__icontains=buscar)
            | Q(producto__nombre__icontains=buscar)
            | Q(producto__categoria__nombre__icontains=buscar)
            | Q(producto__contenedor__nombre__icontains=buscar)
        )

    inventarios_lista = list(inventarios)

    if estado in ['normal', 'bajo', 'critico']:
        inventarios_lista = [item for item in inventarios_lista if item.estado_stock == estado]

    nombre_deposito = ', '.join(nombres_depositos) if nombres_depositos else 'Depósito no configurado'

    context = {
        'inventarios': inventarios_lista,
        'buscar': buscar,
        'estado': estado,
        'ubicacion_actual': perfil,
        'nombre_ubicacion': nombre_deposito,
        'tipo_inventario': 'deposito',
        'titulo_inventario': 'Inventario Depósito',
        'label_stock': 'Stock Depósito',
        'es_tienda': True,
        'total_items': len(inventarios_lista),
        'total_unidades': sum(item.cantidad for item in inventarios_lista),
        'sin_depositos_vinculados': not tiene_depositos_vinculados,
    }
    return render(request, 'inventario/ver.html', context)

@login_required
def ver_inventario_ubicacion(request, ubicacion_id):
    perfil = getattr(request.user, 'perfil', None)
    if not perfil or perfil.rol not in ['administrador', 'almacen']:
        messages.error(request, 'No tiene permisos para consultar inventario de otra ubicación')
        return redirect('ver_inventario')

    ubicacion = get_object_or_404(PerfilUsuario, id=ubicacion_id)
    inventarios = Inventario.objects.select_related('producto', 'ubicacion').filter(ubicacion=ubicacion)

    context = {
        'inventarios': inventarios,
        'ubicacion_actual': ubicacion,
        'es_tienda': ubicacion.rol == 'tienda',
        'total_items': inventarios.count(),
        'total_unidades': sum(item.cantidad for item in inventarios),
        'buscar': '',
        'estado': '',
    }
    return render(request, 'inventario/ver.html', context)

@login_required
def asignar_precio(request, producto_id):
    messages.info(request, 'Funcionalidad disponible desde Gestión de Productos')
    return redirect('listar_productos')

@login_required
def listar_movimientos(request):
    perfil = getattr(request.user, 'perfil', None)
    if not perfil:
        messages.error(request, 'No tiene una ubicación asignada para consultar movimientos')
        return redirect('dashboard')

    movimientos = MovimientoInventario.objects.select_related('producto', 'ubicacion').filter(
        ubicacion=perfil
    )[:200]

    return render(request, 'inventario/movimientos.html', {'movimientos': movimientos})

# INVENTARIO GENERAL CONSOLIDADO PARA ADMIN, ALMACÉN Y TIENDA ONLINE
@login_required
def ver_inventario_general(request):
    """Vista de inventario general consolidado para Admin, Almacén y Tienda Online"""
    perfil = getattr(request.user, 'perfil', None)
    
    # Verificar permisos: solo admin, almacen y tienda_online
    if not perfil or perfil.rol not in ['administrador', 'almacen', 'tienda_online']:
        messages.error(request, 'No tiene permisos para acceder al inventario general')
        return redirect('dashboard')
    
    # Obtener parámetros de filtros
    buscar = request.GET.get('buscar', '').strip()
    estado = request.GET.get('estado', '').strip()
    categoria_id = request.GET.get('categoria', '').strip()
    tipo_ubicacion = request.GET.get('tipo_ubicacion', '').strip()
    stock_minimo = request.GET.get('stock_minimo', '').strip()
    ordenar_por = request.GET.get('ordenar', 'nombre').strip()
    
    # Nuevos filtros: rol y ubicación específica
    rol_filtro = request.GET.get('rol_filtro', '').strip()
    ubicacion_filtro_id = request.GET.get('ubicacion_filtro', '').strip()
    
    # Detectar tipo de vista (normal o avanzada)
    vista_tipo = request.GET.get('vista_tipo', 'normal').strip()
    
    # Obtener todos los productos activos
    productos = Producto.objects.filter(activo=True).prefetch_related(
        'productos_contenedores',
        'inventario_set__ubicacion__almacen',
        'inventario_set__ubicacion__tienda'
    ).select_related('categoria')
    
    # Aplicar filtro de búsqueda
    if buscar:
        productos = productos.filter(
            Q(codigo__icontains=buscar) |
            Q(nombre__icontains=buscar) |
            Q(categoria__nombre__icontains=buscar)
        )
    
    # Aplicar filtro de categoría
    if categoria_id:
        productos = productos.filter(categoria_id=categoria_id)
    
    # Consolidar inventario por producto con detalles de ubicaciones
    inventario_consolidado = []
    
    for producto in productos:
        # Stock en almacén (desde ProductoContenedor)
        stock_almacen = producto.stock
        
        # Obtener detalles de stock por ubicación específica
        ubicaciones_detalle = []
        
        # Almacenes - obtener el nombre del almacén y agregar al detalle
        perfiles_almacen = PerfilUsuario.objects.filter(rol='almacen', activo=True).select_related('almacen')
        almacenes_info = []
        for perfil_alm in perfiles_almacen:
            nombre_almacen = perfil_alm.almacen.nombre if perfil_alm.almacen else perfil_alm.nombre_ubicacion or 'Almacén'
            almacenes_info.append(nombre_almacen)
        nombre_almacenes = ', '.join(almacenes_info) if almacenes_info else 'Almacén'
        
        # Agregar el stock del almacén al detalle
        if stock_almacen > 0:
            ubicaciones_detalle.append({
                'nombre': f"Almacén - {nombre_almacenes}",
                'cantidad': stock_almacen,
                'rol': 'almacen'
            })
        
        # Inventarios por ubicación detallada (excluir almacenes ya que vienen de ProductoContenedor)
        inventarios_ubicacion = Inventario.objects.filter(
            producto=producto
        ).exclude(ubicacion__rol='almacen').select_related('ubicacion', 'ubicacion__tienda', 'ubicacion__almacen')
        
        for inv in inventarios_ubicacion:
            ubicacion_nombre = ''
            if inv.ubicacion.rol == 'deposito':
                if inv.ubicacion.tienda:
                    ubicacion_nombre = f"Depósito - {inv.ubicacion.tienda.nombre}"
                else:
                    ubicacion_nombre = f"Depósito - {inv.ubicacion.nombre_ubicacion or 'Sin nombre'}"
            elif inv.ubicacion.rol == 'tienda':
                if inv.ubicacion.tienda:
                    ubicacion_nombre = f"Tienda - {inv.ubicacion.tienda.nombre}"
                else:
                    ubicacion_nombre = f"Tienda - {inv.ubicacion.nombre_ubicacion or 'Sin nombre'}"
            elif inv.ubicacion.rol == 'tienda_online':
                ubicacion_nombre = f"T. Online - {inv.ubicacion.nombre_ubicacion or 'Tienda Virtual'}"
            else:
                # Para cualquier otro rol no contemplado
                ubicacion_nombre = inv.ubicacion.nombre_ubicacion or f"{inv.ubicacion.get_rol_display()}"
            
            ubicaciones_detalle.append({
                'nombre': ubicacion_nombre,
                'cantidad': inv.cantidad,
                'rol': inv.ubicacion.rol
            })
        
        # Totales por tipo
        stock_depositos = sum(u['cantidad'] for u in ubicaciones_detalle if u['rol'] == 'deposito')
        stock_tiendas = sum(u['cantidad'] for u in ubicaciones_detalle if u['rol'] == 'tienda')
        stock_tiendas_virtuales = sum(u['cantidad'] for u in ubicaciones_detalle if u['rol'] == 'tienda_online')
        
        # Total consolidado
        total_stock = stock_almacen + stock_depositos + stock_tiendas + stock_tiendas_virtuales
        
        # Determinar estado según el total
        if total_stock <= producto.stock_critico:
            estado_stock = 'critico'
        elif total_stock <= producto.stock_bajo:
            estado_stock = 'bajo'
        else:
            estado_stock = 'normal'
        
        # Crear objeto consolidado
        item = {
            'producto': producto,
            'stock_almacen': stock_almacen,
            'nombre_almacenes': nombre_almacenes,
            'ubicaciones_detalle': ubicaciones_detalle,
            'stock_depositos': stock_depositos,
            'stock_tiendas': stock_tiendas,
            'stock_tiendas_virtuales': stock_tiendas_virtuales,
            'total_stock': total_stock,
            'estado_stock': estado_stock,
            'fecha_actualizacion': producto.fecha_actualizacion,
        }
        
        # Aplicar filtros
        agregar_item = True
        
        # Filtrar por estado
        if estado and estado_stock != estado:
            agregar_item = False
        
        # Filtrar por tipo de ubicación
        if tipo_ubicacion and agregar_item:
            if tipo_ubicacion == 'almacen' and stock_almacen == 0:
                agregar_item = False
            elif tipo_ubicacion == 'deposito' and stock_depositos == 0:
                agregar_item = False
            elif tipo_ubicacion == 'tienda' and stock_tiendas == 0:
                agregar_item = False
            elif tipo_ubicacion == 'tienda_online' and stock_tiendas_virtuales == 0:
                agregar_item = False
        
        # Filtrar por stock mínimo
        if stock_minimo and agregar_item:
            try:
                min_stock = int(stock_minimo)
                if total_stock < min_stock:
                    agregar_item = False
            except ValueError:
                pass
        
        # Filtrar por rol específico
        if rol_filtro and agregar_item:
            tiene_stock_en_rol = False
            for ub in ubicaciones_detalle:
                if ub['rol'] == rol_filtro and ub['cantidad'] > 0:
                    tiene_stock_en_rol = True
                    break
            if not tiene_stock_en_rol:
                agregar_item = False
        
        # Filtrar por ubicación específica
        if ubicacion_filtro_id and agregar_item:
            tiene_stock_en_ubicacion = False
            try:
                ubicacion_id_int = int(ubicacion_filtro_id)
                # Verificar si hay stock en esa ubicación específica
                if rol_filtro == 'almacen':
                    # Para almacén, verificar si es el perfil de almacén correcto
                    perfil_almacen = PerfilUsuario.objects.filter(id=ubicacion_id_int, rol='almacen').first()
                    if perfil_almacen and stock_almacen > 0:
                        tiene_stock_en_ubicacion = True
                else:
                    # Para otras ubicaciones, buscar en inventario
                    inv_ubicacion = Inventario.objects.filter(
                        producto=producto,
                        ubicacion_id=ubicacion_id_int,
                        cantidad__gt=0
                    ).first()
                    if inv_ubicacion:
                        tiene_stock_en_ubicacion = True
                
                if not tiene_stock_en_ubicacion:
                    agregar_item = False
            except ValueError:
                pass
        
        if agregar_item:
            inventario_consolidado.append(item)
    
    # Aplicar ordenamiento
    if ordenar_por == 'codigo':
        inventario_consolidado.sort(key=lambda x: x['producto'].codigo)
    elif ordenar_por == 'nombre':
        inventario_consolidado.sort(key=lambda x: x['producto'].nombre.lower())
    elif ordenar_por == 'stock_asc':
        inventario_consolidado.sort(key=lambda x: x['total_stock'])
    elif ordenar_por == 'stock_desc':
        inventario_consolidado.sort(key=lambda x: x['total_stock'], reverse=True)
    elif ordenar_por == 'estado':
        orden_estado = {'critico': 0, 'bajo': 1, 'normal': 2}
        inventario_consolidado.sort(key=lambda x: orden_estado.get(x['estado_stock'], 3))
    else:  # Por defecto: nombre
        inventario_consolidado.sort(key=lambda x: x['producto'].nombre.lower())
    
    # Calcular totales
    total_items = len(inventario_consolidado)
    total_unidades = sum(item['total_stock'] for item in inventario_consolidado)
    total_almacen = sum(item['stock_almacen'] for item in inventario_consolidado)
    total_depositos = sum(item['stock_depositos'] for item in inventario_consolidado)
    total_tiendas = sum(item['stock_tiendas'] for item in inventario_consolidado)
    total_tiendas_virtuales = sum(item['stock_tiendas_virtuales'] for item in inventario_consolidado)
    
    # Obtener categorías para el filtro
    from apps.productos.models import Categoria
    categorias = Categoria.objects.filter(activo=True).order_by('nombre')
    
    # Verificar si es vista simplificada (ubicación específica seleccionada)
    vista_simplificada = False
    nombre_ubicacion_filtrada = ""
    tipo_rol_filtrado = ""
    
    # Determinar si es vista normal (Filtros Normales) o avanzada
    vista_normal = (vista_tipo == 'normal')
    
    # Crear inventario expandido para vista normal (una fila por ubicación)
    inventario_expandido = []
    
    if vista_normal:
        for item in inventario_consolidado:
            producto = item['producto']
            
            # Expandir por cada ubicación que tenga stock
            for ubicacion in item['ubicaciones_detalle']:
                if ubicacion['cantidad'] > 0:
                    # Determinar tipo de rol y nombre
                    tipo_rol = ""
                    if ubicacion['rol'] == 'almacen':
                        tipo_rol = 'Almacén'
                    elif ubicacion['rol'] == 'deposito':
                        tipo_rol = 'Depósito'
                    elif ubicacion['rol'] == 'tienda':
                        tipo_rol = 'Tienda'
                    elif ubicacion['rol'] == 'tienda_online':
                        tipo_rol = 'Tienda Online'
                    
                    # Extraer solo el nombre de la ubicación (sin el prefijo "Almacén -", etc.)
                    nombre_ubicacion = ubicacion['nombre']
                    if ' - ' in nombre_ubicacion:
                        nombre_ubicacion = nombre_ubicacion.split(' - ', 1)[1]
                    
                    # Determinar estado según el stock
                    if ubicacion['cantidad'] <= producto.stock_critico:
                        estado_item = 'critico'
                    elif ubicacion['cantidad'] <= producto.stock_bajo:
                        estado_item = 'bajo'
                    else:
                        estado_item = 'normal'
                    
                    inventario_expandido.append({
                        'producto': producto,
                        'tipo_rol': tipo_rol,
                        'nombre_ubicacion': nombre_ubicacion,
                        'stock': ubicacion['cantidad'],
                        'estado': estado_item,
                        'fecha_actualizacion': item['fecha_actualizacion'],
                    })
        
        # Aplicar filtros de rol si están activos
        if rol_filtro:
            rol_map = {
                'almacen': 'Almacén',
                'deposito': 'Depósito',
                'tienda': 'Tienda',
                'tienda_online': 'Tienda Online'
            }
            tipo_rol_buscado = rol_map.get(rol_filtro, '')
            inventario_expandido = [item for item in inventario_expandido if item['tipo_rol'] == tipo_rol_buscado]
        
        # Aplicar filtro de ubicación específica
        if ubicacion_filtro_id:
            try:
                ubicacion_id = int(ubicacion_filtro_id)
                perfil_ubicacion = PerfilUsuario.objects.filter(id=ubicacion_id).first()
                if perfil_ubicacion:
                    nombre_buscado = ""
                    if perfil_ubicacion.almacen:
                        nombre_buscado = perfil_ubicacion.almacen.nombre
                    elif perfil_ubicacion.tienda:
                        nombre_buscado = perfil_ubicacion.tienda.nombre
                    else:
                        nombre_buscado = perfil_ubicacion.nombre_ubicacion or ""
                    
                    inventario_expandido = [item for item in inventario_expandido if item['nombre_ubicacion'] == nombre_buscado]
            except (ValueError, AttributeError):
                pass
    
    if ubicacion_filtro_id and rol_filtro:
        try:
            ubicacion_id = int(ubicacion_filtro_id)
            perfil_ubicacion = PerfilUsuario.objects.filter(id=ubicacion_id).first()
            
            if perfil_ubicacion:
                vista_simplificada = True
                
                if rol_filtro == 'almacen':
                    nombre_ubicacion_filtrada = perfil_ubicacion.almacen.nombre if perfil_ubicacion.almacen else (perfil_ubicacion.nombre_ubicacion or 'Almacén')
                    tipo_rol_filtrado = 'Almacén'
                elif rol_filtro == 'deposito':
                    nombre_ubicacion_filtrada = perfil_ubicacion.tienda.nombre if perfil_ubicacion.tienda else (perfil_ubicacion.nombre_ubicacion or 'Depósito')
                    tipo_rol_filtrado = 'Depósito'
                elif rol_filtro == 'tienda':
                    nombre_ubicacion_filtrada = perfil_ubicacion.tienda.nombre if perfil_ubicacion.tienda else (perfil_ubicacion.nombre_ubicacion or 'Tienda')
                    tipo_rol_filtrado = 'Tienda'
                elif rol_filtro == 'tienda_online':
                    nombre_ubicacion_filtrada = perfil_ubicacion.nombre_ubicacion or 'Tienda Virtual'
                    tipo_rol_filtrado = 'Tienda Online'
        except (ValueError, AttributeError):
            pass
    
    # Contar filtros activos
    filtros_activos = sum([
        1 if buscar else 0,
        1 if estado else 0,
        1 if categoria_id else 0,
        1 if tipo_ubicacion else 0,
        1 if stock_minimo else 0,
        1 if rol_filtro else 0,
        1 if ubicacion_filtro_id else 0
    ])
    
    context = {
        'inventario_consolidado': inventario_consolidado,
        'inventario_expandido': inventario_expandido,
        'vista_normal': vista_normal,
        'vista_tipo': vista_tipo,
        'buscar': buscar,
        'estado': estado,
        'categoria_id': categoria_id,
        'tipo_ubicacion': tipo_ubicacion,
        'stock_minimo': stock_minimo,
        'ordenar_por': ordenar_por,
        'categorias': categorias,
        'filtros_activos': filtros_activos,
        'ubicacion_actual': perfil,
        'es_inventario_general': True,
        'total_items': total_items,
        'total_unidades': total_unidades,
        'total_almacen': total_almacen,
        'total_depositos': total_depositos,
        'total_tiendas': total_tiendas,
        'total_tiendas_virtuales': total_tiendas_virtuales,
        'rol_filtro': rol_filtro,
        'ubicacion_filtro_id': ubicacion_filtro_id,
        'vista_simplificada': vista_simplificada,
        'nombre_ubicacion_filtrada': nombre_ubicacion_filtrada,
        'tipo_rol_filtrado': tipo_rol_filtrado,
    }
    
    return render(request, 'inventario/general.html', context)


@login_required
def obtener_ubicaciones_por_rol(request):
    """
    Vista AJAX para obtener ubicaciones según el rol seleccionado
    """
    rol = request.GET.get('rol', '')
    
    ubicaciones = []
    
    if rol == 'almacen':
        # Obtener almacenes
        perfiles = PerfilUsuario.objects.filter(
            rol='almacen',
            activo=True
        ).select_related('almacen')
        
        for perfil in perfiles:
            nombre = perfil.almacen.nombre if perfil.almacen else (perfil.nombre_ubicacion or 'Almacén')
            ubicaciones.append({
                'id': perfil.id,
                'nombre': nombre
            })
    
    elif rol == 'deposito':
        # Obtener depósitos
        perfiles = PerfilUsuario.objects.filter(
            rol='deposito',
            activo=True
        ).select_related('tienda')
        
        for perfil in perfiles:
            nombre = perfil.tienda.nombre if perfil.tienda else (perfil.nombre_ubicacion or 'Depósito')
            ubicaciones.append({
                'id': perfil.id,
                'nombre': nombre
            })
    
    elif rol == 'tienda':
        # Obtener tiendas
        perfiles = PerfilUsuario.objects.filter(
            rol='tienda',
            activo=True
        ).select_related('tienda')
        
        for perfil in perfiles:
            nombre = perfil.tienda.nombre if perfil.tienda else (perfil.nombre_ubicacion or 'Tienda')
            ubicaciones.append({
                'id': perfil.id,
                'nombre': nombre
            })
    
    elif rol == 'tienda_online':
        # Obtener tiendas online
        perfiles = PerfilUsuario.objects.filter(
            rol='tienda_online',
            activo=True
        )
        
        for perfil in perfiles:
            nombre = perfil.nombre_ubicacion or 'Tienda Virtual'
            ubicaciones.append({
                'id': perfil.id,
                'nombre': nombre
            })
    
    return JsonResponse({'ubicaciones': ubicaciones})
