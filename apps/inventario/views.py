from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q, Sum

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
