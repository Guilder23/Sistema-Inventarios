from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q

from .models import Inventario, MovimientoInventario
from apps.usuarios.models import PerfilUsuario

@login_required
def ver_inventario(request):
    perfil = getattr(request.user, 'perfil', None)

    if not perfil:
        messages.error(request, 'No tiene una ubicación asignada para consultar inventario')
        return redirect('dashboard')

    buscar = request.GET.get('buscar', '').strip()
    estado = request.GET.get('estado', '').strip()

    inventarios = Inventario.objects.select_related(
        'producto',
        'producto__categoria',
        'producto__contenedor',
        'ubicacion'
    ).filter(ubicacion=perfil, producto__activo=True)

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

    total_items = len(inventarios_lista)
    total_unidades = sum(item.cantidad for item in inventarios_lista)

    context = {
        'inventarios': inventarios_lista,
        'buscar': buscar,
        'estado': estado,
        'ubicacion_actual': perfil,
        'es_tienda': perfil.rol == 'tienda',
        'total_items': total_items,
        'total_unidades': total_unidades,
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
