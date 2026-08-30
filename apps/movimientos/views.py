from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db.models import Q

from apps.usuarios.models import PerfilUsuario
from apps.tiendas.models import Tienda
from apps.depositos.models import Deposito
from apps.productos.models import Producto
from .models import MovimientoStock


def _get_perfil_almacen(request):
    """Retorna el perfil si el usuario es almacén, o None."""
    try:
        perfil = PerfilUsuario.objects.select_related('almacen').get(usuario=request.user)
        if perfil.rol == 'almacen':
            return perfil
        return None
    except PerfilUsuario.DoesNotExist:
        return None


@login_required
@require_http_methods(["GET"])
def listar_movimientos(request):
    """
    Vista principal de seguimiento de movimientos de stock.
    Solo accesible para el rol 'almacen'.
    Permite filtrar por Almacén propio, Tienda, Depósito, Producto, Tipo y Rango de fechas.
    """
    perfil = _get_perfil_almacen(request)
    if perfil is None:
        return render(request, 'movimientos/sin_acceso.html', status=403)

    almacen = perfil.almacen

    # ── Tiendas y depósitos del almacén logueado ────────────────────────────
    tiendas = Tienda.objects.filter(
        almacen=almacen, estado='activo'
    ).order_by('nombre') if almacen else Tienda.objects.none()

    # Perfiles del propio almacén
    perfiles_almacen_ids = list(
        PerfilUsuario.objects.filter(almacen=almacen, rol='almacen').values_list('id', flat=True)
    )
    if perfil.id not in perfiles_almacen_ids:
        perfiles_almacen_ids.append(perfil.id)

    # Perfiles de tiendas del almacén
    perfiles_tiendas_ids = list(
        PerfilUsuario.objects.filter(
            tienda__almacen=almacen, rol='tienda'
        ).values_list('id', flat=True)
    )

    # Perfiles de depósitos vinculados a tiendas del almacén
    perfiles_depositos_ids = list(
        PerfilUsuario.objects.filter(
            Q(rol='deposito') & (
                Q(tienda__almacen=almacen) |
                Q(ubicacion_relacionada__tienda__almacen=almacen)
            )
        ).values_list('id', flat=True)
    )

    todas_ubicaciones_ids = list(set(
        perfiles_almacen_ids + perfiles_tiendas_ids + perfiles_depositos_ids
    ))

    qs = MovimientoStock.objects.filter(
        ubicacion__id__in=todas_ubicaciones_ids
    ).select_related('producto', 'ubicacion', 'usuario')

    # ── Parámetros de Filtro ────────────────────────────────────────────────
    ubicacion_tipo = request.GET.get('ubicacion_tipo', '').strip()  # 'almacen', 'tienda', ''
    tienda_id      = request.GET.get('tienda', '').strip()
    deposito_id    = request.GET.get('deposito', '').strip()
    tipo           = request.GET.get('tipo', '').strip()
    buscar         = request.GET.get('buscar', '').strip()
    fecha_desde    = request.GET.get('fecha_desde', '').strip()
    fecha_hasta    = request.GET.get('fecha_hasta', '').strip()

    depositos_select = Deposito.objects.none()

    if ubicacion_tipo == 'almacen':
        qs = qs.filter(ubicacion__id__in=perfiles_almacen_ids)
    elif tienda_id:
        try:
            tienda_obj = Tienda.objects.get(id=tienda_id, almacen=almacen)
            depositos_select = Deposito.objects.filter(tienda=tienda_obj, estado='activo').order_by('nombre')
            
            if deposito_id:
                # Filtrar solo el depósito específico
                dep_obj = Deposito.objects.get(id=deposito_id, tienda=tienda_obj)
                p_dep_ids = list(
                    PerfilUsuario.objects.filter(
                        rol='deposito',
                        nombre_ubicacion__iexact=dep_obj.nombre
                    ).values_list('id', flat=True)
                )
                if not p_dep_ids:
                    p_dep_ids = list(
                        PerfilUsuario.objects.filter(
                            rol='deposito',
                            tienda=tienda_obj
                        ).values_list('id', flat=True)
                    )
                qs = qs.filter(ubicacion__id__in=p_dep_ids)
            else:
                # Filtrar tienda + sus depósitos
                p_tienda_ids = list(
                    PerfilUsuario.objects.filter(
                        Q(tienda=tienda_obj) |
                        Q(ubicacion_relacionada__tienda=tienda_obj)
                    ).values_list('id', flat=True)
                )
                qs = qs.filter(ubicacion__id__in=p_tienda_ids)
        except (Tienda.DoesNotExist, Deposito.DoesNotExist):
            pass

    if tipo:
        qs = qs.filter(tipo=tipo)

    if buscar:
        qs = qs.filter(
            Q(producto__nombre__icontains=buscar) |
            Q(producto__codigo__icontains=buscar) |
            Q(referencia__icontains=buscar) |
            Q(notas__icontains=buscar)
        )

    if fecha_desde:
        qs = qs.filter(fecha__date__gte=fecha_desde)

    if fecha_hasta:
        qs = qs.filter(fecha__date__lte=fecha_hasta)

    qs = qs.order_by('-fecha')

    # ── Estadísticas ─────────────────────────────────────────────────────────
    total_movimientos = qs.count()
    total_entradas = qs.filter(cantidad__gt=0).count()
    total_salidas  = qs.filter(cantidad__lt=0).count()

    # ── Paginación ────────────────────────────────────────────────────────────
    paginator = Paginator(qs, 25)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    context = {
        'page_obj':            page_obj,
        'is_paginated':        page_obj.has_other_pages(),
        'paginator':           paginator,
        'almacen':             almacen,
        'tiendas':             tiendas,
        'depositos_select':    depositos_select,
        'tipos':               MovimientoStock.TIPOS,
        # Valores de filtros activos
        'filtro_ubicacion_tipo': ubicacion_tipo,
        'filtro_tienda':       tienda_id,
        'filtro_deposito':     deposito_id,
        'filtro_tipo':         tipo,
        'filtro_buscar':       buscar,
        'filtro_fecha_desde':  fecha_desde,
        'filtro_fecha_hasta':  fecha_hasta,
        # Estadísticas
        'total_movimientos':   total_movimientos,
        'total_entradas':      total_entradas,
        'total_salidas':       total_salidas,
    }
    return render(request, 'movimientos/listar.html', context)


@login_required
@require_http_methods(["GET"])
def detalle_movimiento(request, pk):
    """Muestra el detalle de un movimiento específico."""
    perfil = _get_perfil_almacen(request)
    if perfil is None:
        return render(request, 'movimientos/sin_acceso.html', status=403)

    movimiento = get_object_or_404(
        MovimientoStock.objects.select_related(
            'producto', 'producto__categoria',
            'ubicacion', 'usuario'
        ),
        pk=pk,
    )
    return render(request, 'movimientos/detalle.html', {'movimiento': movimiento})


@login_required
@require_http_methods(["GET"])
def api_depositos_por_tienda(request, tienda_id):
    """
    API JSON: retorna los depósitos de una tienda (para el filtro dinámico).
    """
    perfil = _get_perfil_almacen(request)
    if perfil is None:
        return JsonResponse({'success': False, 'error': 'Sin acceso'}, status=403)

    try:
        tienda = Tienda.objects.get(id=tienda_id, almacen=perfil.almacen)
    except Tienda.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Tienda no encontrada'}, status=404)

    depositos = Deposito.objects.filter(tienda=tienda, estado='activo').order_by('nombre').values('id', 'nombre')
    return JsonResponse({'success': True, 'depositos': list(depositos)})
