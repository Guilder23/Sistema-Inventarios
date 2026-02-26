from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth.models import User
from django.db.models import Q
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import json
from .models import Categoria, Producto, HistorialProducto, ProductoDanado
from apps.inventario.models import MovimientoInventario
from apps.notificaciones.utils import notificar_administrador_producto, notificar_almacen_precio

def verificar_permiso_productos(request):
    """Verifica si el usuario tiene permiso para gestionar productos"""
    if not request.user.is_authenticated:
        return False
    
    # Administrador tiene acceso total
    if request.user.is_superuser or request.user.is_staff:
        return True
    
    # Verificar si es almacén
    if hasattr(request.user, 'perfil') and request.user.perfil.rol == 'almacen':
        return True
    
    return False

def es_administrador(request):
    """Verifica si el usuario es administrador"""
    return request.user.is_superuser or request.user.is_staff

def es_almacen(request):
    """Verifica si el usuario es del almacén"""
    return hasattr(request.user, 'perfil') and request.user.perfil.rol == 'almacen'


@login_required
def listar_categorias(request):
    """Listar categorías con filtros"""
    if not es_almacen(request):
        messages.error(request, 'Solo el personal de almacén puede gestionar categorías')
        return redirect('dashboard')

    buscar = request.GET.get('buscar', '')
    estado = request.GET.get('estado', '')

    categorias = Categoria.objects.all().order_by('-fecha_creacion')

    if buscar:
        categorias = categorias.filter(
            Q(nombre__icontains=buscar) |
            Q(descripcion__icontains=buscar)
        )

    if estado == 'activo':
        categorias = categorias.filter(activo=True)
    elif estado == 'inactivo':
        categorias = categorias.filter(activo=False)

    context = {
        'categorias': categorias,
        'buscar': buscar,
        'estado': estado,
    }
    return render(request, 'categorias/categorias.html', context)


@login_required
@require_http_methods(["POST"])
def crear_categoria(request):
    """Crear nueva categoría"""
    if not es_almacen(request):
        messages.error(request, 'No tiene permisos para crear categorías')
        return redirect('dashboard')

    try:
        nombre = request.POST.get('nombre', '').strip()
        descripcion = request.POST.get('descripcion', '').strip()
        activo = request.POST.get('activo') == 'on'

        if not nombre:
            messages.error(request, 'El nombre de la categoría es requerido')
            return redirect('listar_categorias')

        if Categoria.objects.filter(nombre__iexact=nombre).exists():
            messages.error(request, f'La categoría "{nombre}" ya existe')
            return redirect('listar_categorias')

        Categoria.objects.create(
            nombre=nombre,
            descripcion=descripcion,
            activo=activo,
            creado_por=request.user
        )

        messages.success(request, f'Categoría "{nombre}" creada exitosamente')
    except Exception as e:
        messages.error(request, f'Error al crear categoría: {str(e)}')

    return redirect('listar_categorias')


@login_required
def obtener_categoria(request, id):
    """Obtener datos de una categoría en JSON"""
    if not es_almacen(request):
        return JsonResponse({'error': 'No autorizado'}, status=403)

    try:
        categoria = get_object_or_404(Categoria, id=id)

        creado_por_str = ''
        if categoria.creado_por:
            creado_por_str = f"{categoria.creado_por.first_name} {categoria.creado_por.last_name}".strip()
            if not creado_por_str:
                creado_por_str = categoria.creado_por.username

        data = {
            'id': categoria.id,
            'nombre': categoria.nombre,
            'descripcion': categoria.descripcion or '',
            'activo': categoria.activo,
            'creado_por': creado_por_str,
            'fecha_creacion': categoria.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
            'fecha_actualizacion': categoria.fecha_actualizacion.strftime('%d/%m/%Y %H:%M'),
        }
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=404)


@login_required
@require_http_methods(["POST"])
def editar_categoria(request, id):
    """Editar categoría existente"""
    if not es_almacen(request):
        messages.error(request, 'No tiene permisos para editar categorías')
        return redirect('dashboard')

    categoria = get_object_or_404(Categoria, id=id)

    try:
        nombre = request.POST.get('nombre', '').strip()
        descripcion = request.POST.get('descripcion', '').strip()
        activo = request.POST.get('activo') == 'on'

        if not nombre:
            messages.error(request, 'El nombre de la categoría es requerido')
            return redirect('listar_categorias')

        existe = Categoria.objects.filter(nombre__iexact=nombre).exclude(id=categoria.id).exists()
        if existe:
            messages.error(request, f'La categoría "{nombre}" ya existe')
            return redirect('listar_categorias')

        categoria.nombre = nombre
        categoria.descripcion = descripcion
        categoria.activo = activo
        categoria.save()

        messages.success(request, f'Categoría "{categoria.nombre}" actualizada exitosamente')
    except Exception as e:
        messages.error(request, f'Error al actualizar categoría: {str(e)}')

    return redirect('listar_categorias')


@login_required
@require_http_methods(["POST"])
def eliminar_categoria(request, id):
    """Cambiar estado activo/inactivo de categoría"""
    if not es_almacen(request):
        messages.error(request, 'No tiene permisos para cambiar estado de categorías')
        return redirect('dashboard')

    categoria = get_object_or_404(Categoria, id=id)
    categoria.activo = not categoria.activo
    categoria.save(update_fields=['activo', 'fecha_actualizacion'])

    estado = 'activada' if categoria.activo else 'desactivada'
    messages.success(request, f'Categoría "{categoria.nombre}" {estado} correctamente')
    return redirect('listar_categorias')

@login_required
def listar_productos(request):
    """Listar todos los productos con filtros"""
    # Verificar permisos
    if not verificar_permiso_productos(request):
        messages.error(request, 'No tiene permisos para ver esta página')
        return redirect('dashboard')
    
    # Obtener parámetros de búsqueda
    buscar = request.GET.get('buscar', '')
    estado = request.GET.get('estado', '')
    
    # Query base
    productos = Producto.objects.all().order_by('-fecha_creacion')
    
    # Aplicar filtros
    if buscar:
        productos = productos.filter(
            Q(codigo__icontains=buscar) |
            Q(nombre__icontains=buscar) |
            Q(descripcion__icontains=buscar)
        )
    
    if estado == 'activo':
        productos = productos.filter(activo=True)
    elif estado == 'inactivo':
        productos = productos.filter(activo=False)
    
    context = {
        'productos': productos,
        'buscar': buscar,
        'estado': estado,
        'es_administrador': es_administrador(request),
        'es_almacen': es_almacen(request),
    }
    
    return render(request, 'productos/productos.html', context)

@login_required
@require_http_methods(["GET", "POST"])
def crear_producto(request):
    """Crear nuevo producto - Solo almacén"""
    # Verificar permisos
    if not es_almacen(request):
        return JsonResponse({'error': 'No tiene permisos para crear productos'}, status=403)
    
    if request.method == 'POST':
        try:
            # Obtener datos del formulario
            codigo = request.POST.get('codigo', '').strip()
            nombre = request.POST.get('nombre', '').strip()
            descripcion = request.POST.get('descripcion', '')
            stock = request.POST.get('stock', 0)
            unidades_por_caja = request.POST.get('unidades_por_caja', 1)
            precio_unidad = request.POST.get('precio_unidad', 0)
            stock_critico = request.POST.get('stock_critico', 10)
            stock_bajo = request.POST.get('stock_bajo', 30)
            foto = request.FILES.get('foto')
            
            # Validaciones
            if not codigo or not nombre:
                messages.error(request, 'Código y nombre son requeridos')
                return redirect('listar_productos')
            
            # Verificar código único
            if Producto.objects.filter(codigo=codigo).exists():
                messages.error(request, f'El código "{codigo}" ya existe')
                return redirect('listar_productos')
            
            # Crear producto
            producto = Producto.objects.create(
                codigo=codigo,
                nombre=nombre,
                descripcion=descripcion,
                stock=int(stock),
                unidades_por_caja=int(unidades_por_caja),
                precio_unidad=float(precio_unidad),
                stock_critico=int(stock_critico),
                stock_bajo=int(stock_bajo),
                creado_por=request.user,
                activo=True
            )
            
            if foto:
                producto.foto = foto
                producto.save()
            
            # Registrar en historial
            HistorialProducto.objects.create(
                producto=producto,
                accion='creacion',
                usuario=request.user,
                detalles=f'Producto creado: {nombre}'
            )
            
            # Notificar a administrador
            notificar_administrador_producto(
                tipo='producto_creado',
                titulo='Nuevo Producto',
                mensaje=f'{request.user.username} creó el producto "{nombre}" (código: {codigo})',
                url=f'/productos/'
            )
            
            messages.success(request, f'Producto "{nombre}" creado exitosamente')
            return redirect('listar_productos')
            
        except Exception as e:
            messages.error(request, f'Error al crear producto: {str(e)}')
            return redirect('listar_productos')
    
    return redirect('listar_productos')

@login_required
def obtener_producto(request, id):
    """Obtener datos de un producto en formato JSON"""
    try:
        producto = get_object_or_404(Producto, id=id)
        
        creado_por_str = ''
        if producto.creado_por:
            creado_por_str = f"{producto.creado_por.first_name} {producto.creado_por.last_name}".strip()
            if not creado_por_str:
                creado_por_str = producto.creado_por.username
        
        data = {
            'id': producto.id,
            'codigo': producto.codigo,
            'nombre': producto.nombre,
            'descripcion': producto.descripcion or '',
            'stock': producto.stock,
            'unidades_por_caja': producto.unidades_por_caja,
            'precio_unidad': float(producto.precio_unidad),
            'precio_compra': float(producto.precio_compra),
            'precio_caja': float(producto.precio_caja),
            'precio_mayor': float(producto.precio_mayor),
            'poliza': float(producto.poliza) if producto.poliza else 0,
            'gastos': float(producto.gastos) if producto.gastos else 0,
            'stock_critico': producto.stock_critico,
            'stock_bajo': producto.stock_bajo,
            'foto': producto.foto.url if producto.foto else '',
            'creado_por': creado_por_str,
            'fecha_creacion': producto.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
            'fecha_actualizacion': producto.fecha_actualizacion.strftime('%d/%m/%Y %H:%M'),
            'activo': producto.activo,
        }
        return JsonResponse(data)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=404)

@login_required
@require_http_methods(["GET", "POST"])
def editar_producto(request, id):
    """Editar producto existente"""
    producto = get_object_or_404(Producto, id=id)
    
    if request.method == 'POST':
        try:
            # Solo almacén puede editar todos los campos
            # Administrador solo puede editar precio_unidad
            if es_almacen(request):
                # Almacén puede editar todo
                producto.codigo = request.POST.get('codigo', producto.codigo)
                producto.nombre = request.POST.get('nombre', producto.nombre)
                producto.descripcion = request.POST.get('descripcion', '')
                producto.stock = int(request.POST.get('stock', producto.stock))
                producto.unidades_por_caja = int(request.POST.get('unidades_por_caja', producto.unidades_por_caja))
                producto.precio_unidad = float(request.POST.get('precio_unidad', producto.precio_unidad))
                producto.precio_compra = float(request.POST.get('precio_compra', producto.precio_compra))
                producto.precio_caja = float(request.POST.get('precio_caja', producto.precio_caja))
                producto.precio_mayor = float(request.POST.get('precio_mayor', producto.precio_mayor))
                producto.stock_critico = int(request.POST.get('stock_critico', producto.stock_critico))
                producto.stock_bajo = int(request.POST.get('stock_bajo', producto.stock_bajo))
                producto.activo = request.POST.get('activo') == 'on'
                
                # Actualizar foto si se proporciona
                if request.FILES.get('foto'):
                    producto.foto = request.FILES.get('foto')
                
                # Registrar cambios en historial
                cambios = []
                if producto.precio_unidad != float(request.POST.get('precio_unidad', producto.precio_unidad)):
                    cambios.append(f"Precio: {producto.precio_unidad}")
                
                detalles = f"Producto actualizado: {producto.nombre}"
                if cambios:
                    detalles += f" - Cambios: {', '.join(cambios)}"
                
            elif es_administrador(request):
                # Administrador solo puede editar precio_unidad
                nuevo_precio = float(request.POST.get('precio_unidad', producto.precio_unidad))
                if nuevo_precio != producto.precio_unidad:
                    precio_anterior = producto.precio_unidad
                    producto.precio_unidad = nuevo_precio
                    detalles = f"Precio actualizado de {precio_anterior} a {nuevo_precio}"
                else:
                    detalles = f"Producto visualizado: {producto.nombre}"
            else:
                return JsonResponse({'error': 'No tiene permisos para editar'}, status=403)
            
            producto.save()
            
            # Registrar en historial
            HistorialProducto.objects.create(
                producto=producto,
                accion='edicion',
                usuario=request.user,
                detalles=detalles
            )
            
            # Notificar a administrador de cambios importantes del almacén
            if es_almacen(request):
                notificar_administrador_producto(
                    tipo='producto_editado',
                    titulo='Producto Editado',
                    mensaje=f'{request.user.username} editó el producto "{producto.nombre}" (código: {producto.codigo})',
                    url=f'/productos/'
                )
            
            messages.success(request, f'Producto "{producto.nombre}" actualizado exitosamente')
            return redirect('listar_productos')
            
        except Exception as e:
            messages.error(request, f'Error al actualizar producto: {str(e)}')
            return redirect('listar_productos')
    
    # Si es GET AJAX, retornar datos del producto en JSON
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return obtener_producto(request, id)
    
    return redirect('listar_productos')

@login_required
@require_http_methods(["POST"])
def eliminar_producto(request, id):
    """Eliminar producto - Solo almacén"""
    # Verificar permisos
    if not es_almacen(request):
        messages.error(request, 'No tiene permisos para eliminar productos')
        return redirect('listar_productos')
    
    producto = get_object_or_404(Producto, id=id)
    
    try:
        nombre_producto = producto.nombre
        codigo_producto = producto.codigo
        
        # Registrar en historial antes de eliminar
        HistorialProducto.objects.create(
            producto=producto,
            accion='eliminacion',
            usuario=request.user,
            detalles=f'Producto eliminado: {nombre_producto}'
        )
        
        # Desactivar en lugar de eliminar (soft delete)
        producto.activo = False
        producto.save()
        
        # Notificar a administrador
        notificar_administrador_producto(
            tipo='producto_eliminado',
            titulo='Producto Eliminado',
            mensaje=f'{request.user.username} eliminó el producto "{nombre_producto}" (código: {codigo_producto})',
            url=f'/productos/'
        )
        
        messages.success(request, f'Producto "{nombre_producto}" eliminado correctamente')
        
    except Exception as e:
        messages.error(request, f'Error al eliminar producto: {str(e)}')
    
    return redirect('listar_productos')

@login_required
def historial_producto(request, id):
    """Ver historial de cambios de un producto"""
    # Verificar permisos
    if not verificar_permiso_productos(request):
        messages.error(request, 'No tiene permisos para ver esta página')
        return redirect('dashboard')
    
    producto = get_object_or_404(Producto, id=id)
    historial = HistorialProducto.objects.filter(producto=producto).order_by('-fecha')
    
    context = {
        'producto': producto,
        'historial': historial,
    }
    
    return render(request, 'productos/historial.html', context)

# GESTION DE PRODUCTOS DAÑADOS
@login_required
@require_http_methods(["GET", "POST"])
def listar_danados(request):
    perfil = getattr(request.user, 'perfil', None)
    if not perfil or perfil.rol != 'almacen':
        messages.error(request, 'Solo el personal de almacén puede gestionar devoluciones')
        return redirect('dashboard')

    if request.method == 'POST':
        try:
            producto_id = request.POST.get('producto')
            cantidad = int(request.POST.get('cantidad', 0))
            comentario = request.POST.get('comentario', '').strip()
            foto = request.FILES.get('foto')

            if not producto_id:
                messages.error(request, 'Debe seleccionar un producto')
                return redirect('listar_danados')

            if cantidad <= 0:
                messages.error(request, 'La cantidad dañada debe ser mayor a 0')
                return redirect('listar_danados')

            producto = get_object_or_404(Producto, id=producto_id, activo=True)

            if producto.stock < cantidad:
                messages.error(request, f'No hay stock suficiente para registrar daño. Stock actual: {producto.stock}')
                return redirect('listar_danados')

            with transaction.atomic():
                producto.stock -= cantidad
                producto.save(update_fields=['stock', 'fecha_actualizacion'])

                danado = ProductoDanado.objects.create(
                    producto=producto,
                    ubicacion=perfil,
                    cantidad=cantidad,
                    comentario=comentario,
                    foto=foto,
                    registrado_por=request.user,
                )

                HistorialProducto.objects.create(
                    producto=producto,
                    accion='edicion',
                    usuario=request.user,
                    detalles=f'Registro de dañado #{danado.id}: -{cantidad} unidades. Comentario: {comentario or "Sin comentario"}'
                )

                MovimientoInventario.objects.create(
                    producto=producto,
                    ubicacion=perfil,
                    tipo='danado',
                    cantidad=cantidad,
                    referencia=f'DAN-{danado.id}',
                    comentario=comentario or 'Registro de producto dañado'
                )

            messages.success(request, f'Se registró daño para {producto.nombre}: {cantidad} unidades')
        except ValueError:
            messages.error(request, 'Cantidad inválida')
        except Exception as e:
            messages.error(request, f'Error al registrar producto dañado: {str(e)}')

        return redirect('listar_danados')

    buscar = request.GET.get('buscar', '').strip()
    estado = request.GET.get('estado', '').strip()

    danados = ProductoDanado.objects.select_related('producto', 'registrado_por', 'ubicacion').filter(ubicacion=perfil)

    if buscar:
        danados = danados.filter(
            Q(producto__codigo__icontains=buscar) |
            Q(producto__nombre__icontains=buscar) |
            Q(comentario__icontains=buscar)
        )

    if estado in ['pendiente', 'parcial', 'cerrado']:
        danados = danados.filter(estado=estado)

    danados = danados.order_by('-fecha_registro')

    total_registros = danados.count()
    total_pendientes = sum(item.cantidad_pendiente for item in danados)

    context = {
        'danados': danados,
        'productos': Producto.objects.filter(activo=True).order_by('nombre'),
        'buscar': buscar,
        'estado': estado,
        'total_registros': total_registros,
        'total_pendientes': total_pendientes,
    }
    return render(request, 'productos/devoluciones/devoluciones.html', context)

@login_required
def registrar_danado(request):
    return redirect('listar_danados')


def _actualizar_estado_danado(danado):
    if danado.cantidad_pendiente == 0:
        danado.estado = 'cerrado'
    elif danado.cantidad_recuperada > 0 or danado.cantidad_repuesta > 0:
        danado.estado = 'parcial'
    else:
        danado.estado = 'pendiente'


def _procesar_devolucion(request, danado_id, tipo_accion):
    perfil = getattr(request.user, 'perfil', None)
    if not perfil or perfil.rol != 'almacen':
        messages.error(request, 'No tiene permisos para esta acción')
        return redirect('listar_danados')

    danado = get_object_or_404(ProductoDanado.objects.select_related('producto'), id=danado_id, ubicacion=perfil)

    try:
        cantidad = int(request.POST.get('cantidad', 0))
    except ValueError:
        messages.error(request, 'Cantidad inválida')
        return redirect('listar_danados')

    if cantidad <= 0:
        messages.error(request, 'La cantidad debe ser mayor a 0')
        return redirect('listar_danados')

    if cantidad > danado.cantidad_pendiente:
        messages.error(request, f'La cantidad excede lo pendiente ({danado.cantidad_pendiente})')
        return redirect('listar_danados')

    comentario_accion = request.POST.get('comentario', '').strip()

    with transaction.atomic():
        if tipo_accion == 'agregar':
            danado.cantidad_recuperada += cantidad
            tipo_movimiento = 'devolucion'
            detalle = f'Devolución por recuperación de dañado #{danado.id}: +{cantidad} unidades'
        else:
            danado.cantidad_repuesta += cantidad
            tipo_movimiento = 'entrada'
            detalle = f'Reposición por dañado #{danado.id}: +{cantidad} unidades'

        _actualizar_estado_danado(danado)
        danado.save(update_fields=['cantidad_recuperada', 'cantidad_repuesta', 'estado'])

        danado.producto.stock += cantidad
        danado.producto.save(update_fields=['stock', 'fecha_actualizacion'])

        HistorialProducto.objects.create(
            producto=danado.producto,
            accion='edicion',
            usuario=request.user,
            detalles=f'{detalle}. Estado dañado: {danado.get_estado_display()}'
        )

        MovimientoInventario.objects.create(
            producto=danado.producto,
            ubicacion=perfil,
            tipo=tipo_movimiento,
            cantidad=cantidad,
            referencia=f'DAN-{danado.id}',
            comentario=comentario_accion or detalle
        )

    accion = 'agregado' if tipo_accion == 'agregar' else 'repuesto'
    messages.success(request, f'Stock {accion} correctamente para {danado.producto.nombre} (+{cantidad})')
    return redirect('listar_danados')


@login_required
@require_http_methods(["POST"])
def agregar_mas_danado(request, id):
    perfil = getattr(request.user, 'perfil', None)
    if not perfil or perfil.rol != 'almacen':
        messages.error(request, 'No tiene permisos para esta acción')
        return redirect('listar_danados')

    danado = get_object_or_404(ProductoDanado.objects.select_related('producto'), id=id, ubicacion=perfil)

    try:
        cantidad = int(request.POST.get('cantidad', 0))
    except ValueError:
        messages.error(request, 'Cantidad inválida')
        return redirect('listar_danados')

    if cantidad <= 0:
        messages.error(request, 'La cantidad debe ser mayor a 0')
        return redirect('listar_danados')

    if danado.producto.stock < cantidad:
        messages.error(request, f'No hay stock suficiente para registrar más dañados. Stock actual: {danado.producto.stock}')
        return redirect('listar_danados')

    comentario_accion = request.POST.get('comentario', '').strip()

    with transaction.atomic():
        danado.cantidad += cantidad
        _actualizar_estado_danado(danado)
        danado.save(update_fields=['cantidad', 'estado'])

        danado.producto.stock -= cantidad
        danado.producto.save(update_fields=['stock', 'fecha_actualizacion'])

        detalle = f'Se agregaron {cantidad} unidades dañadas al registro #{danado.id}'

        HistorialProducto.objects.create(
            producto=danado.producto,
            accion='edicion',
            usuario=request.user,
            detalles=f'{detalle}. Pendiente actual: {danado.cantidad_pendiente}'
        )

        MovimientoInventario.objects.create(
            producto=danado.producto,
            ubicacion=perfil,
            tipo='danado',
            cantidad=cantidad,
            referencia=f'DAN-{danado.id}',
            comentario=comentario_accion or detalle
        )

    messages.success(request, f'Se agregaron {cantidad} unidades dañadas para {danado.producto.nombre}')
    return redirect('listar_danados')


@login_required
@require_http_methods(["POST"])
def agregar_stock_danado(request, id):
    return _procesar_devolucion(request, id, 'agregar')


@login_required
@require_http_methods(["POST"])
def reponer_stock_danado(request, id):
    return _procesar_devolucion(request, id, 'reponer')

# AGREGAR PRECIOS A PRODUCTOS DESDE EL PANEL DE ADMINISTRADOR
@login_required
@require_http_methods(["POST"])
def editar_precio_producto(request, id):
    """Editar precios de un producto - Solo administrador"""
    # Verificar permisos
    if not es_administrador(request):
        return JsonResponse({'error': 'No tiene permisos para editar precios'}, status=403)
    
    try:
        producto = get_object_or_404(Producto, id=id)
        
        # Obtener precios anteriores
        precios_anteriores = {
            'precio_unidad': float(producto.precio_unidad),
            'precio_compra': float(producto.precio_compra),
            'precio_caja': float(producto.precio_caja),
            'precio_mayor': float(producto.precio_mayor),
            'poliza': float(producto.poliza) if producto.poliza else 0,
            'gastos': float(producto.gastos) if producto.gastos else 0,
        }
        
        # Obtener nuevos precios del formulario
        nuevo_precio_unidad = float(request.POST.get('precio_unidad', producto.precio_unidad))
        nuevo_precio_compra = float(request.POST.get('precio_compra', producto.precio_compra))
        nuevo_precio_caja = float(request.POST.get('precio_caja', producto.precio_caja))
        nuevo_precio_mayor = float(request.POST.get('precio_mayor', producto.precio_mayor))
        nueva_poliza = float(request.POST.get('poliza', producto.poliza or 0))
        nuevos_gastos = float(request.POST.get('gastos', producto.gastos or 0))
        
        # Validar que al menos un precio sea mayor a 0
        if nuevo_precio_unidad <= 0:
            return JsonResponse({'error': 'El precio unitario debe ser mayor a 0'}, status=400)
        
        # Registrar cambios
        cambios_realizados = []
        
        if nuevo_precio_unidad != precios_anteriores['precio_unidad']:
            cambios_realizados.append(f"P. Unitario: {precios_anteriores['precio_unidad']} → {nuevo_precio_unidad}")
            producto.precio_unidad = nuevo_precio_unidad
        
        if nuevo_precio_compra != precios_anteriores['precio_compra']:
            cambios_realizados.append(f"P. Compra: {precios_anteriores['precio_compra']} → {nuevo_precio_compra}")
            producto.precio_compra = nuevo_precio_compra
        
        if nuevo_precio_caja != precios_anteriores['precio_caja']:
            cambios_realizados.append(f"P. Caja: {precios_anteriores['precio_caja']} → {nuevo_precio_caja}")
            producto.precio_caja = nuevo_precio_caja
        
        if nuevo_precio_mayor != precios_anteriores['precio_mayor']:
            cambios_realizados.append(f"P. Mayor: {precios_anteriores['precio_mayor']} → {nuevo_precio_mayor}")
            producto.precio_mayor = nuevo_precio_mayor
        
        if nueva_poliza != precios_anteriores['poliza']:
            cambios_realizados.append(f"Póliza: {precios_anteriores['poliza']} → {nueva_poliza}")
            producto.poliza = nueva_poliza
        
        if nuevos_gastos != precios_anteriores['gastos']:
            cambios_realizados.append(f"Gastos: {precios_anteriores['gastos']} → {nuevos_gastos}")
            producto.gastos = nuevos_gastos
        
        # Si no hay cambios, retornar mensaje
        if not cambios_realizados:
            return JsonResponse({'mensaje': 'No se realizaron cambios en los precios'}, status=200)
        
        # Guardar cambios
        producto.save()
        
        # Registrar en historial
        detalles_cambios = " | ".join(cambios_realizados)
        HistorialProducto.objects.create(
            producto=producto,
            accion='edicion',
            usuario=request.user,
            detalles=f'Precios actualizados: {detalles_cambios}'
        )
        
        # Notificar a almacén del cambio de precios
        notificar_almacen_precio(
            titulo='Precios Modificados',
            mensaje=f'Administrador actualizó precios del producto "{producto.nombre}" (código: {producto.codigo})',
            url=f'/productos/'
        )
        
        # Crear notificación en sistema
        from apps.notificaciones.models import Notificacion
        Notificacion.objects.create(
            usuario=request.user,
            tipo='precio_modificado',
            titulo='Precios Actualizados',
            mensaje=f'Se actualizaron los precios del producto "{producto.nombre}"',
            url=f'/productos/{id}/'
        )
        
        return JsonResponse({
            'success': True,
            'mensaje': 'Precios actualizados correctamente',
            'cambios': len(cambios_realizados),
            'detalles': cambios_realizados
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

