from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db.models import Q
from django.core.paginator import Paginator

from apps.ventas.models import Venta, DetalleVenta
from apps.traspasos.models import Traspaso, DetalleTraspaso
from apps.inventario.models import MovimientoInventario
from apps.usuarios.models import PerfilUsuario


@login_required
def historial(request):
    """Página principal del historial"""
    return render(request, 'reportes/reportes.html')


# ── PERMISOS ─────────────────────────────────────────────────────
def get_perfil(request):
    return getattr(request.user, 'perfil', None)

def es_admin(perfil):
    return perfil and perfil.rol == 'administrador'


# ── API VENTAS ────────────────────────────────────────────────────
@login_required
def api_ventas(request):
    perfil = get_perfil(request)
    if not perfil:
        return JsonResponse({'error': 'Sin perfil'}, status=403)

    qs = Venta.objects.select_related(
        'ubicacion', 'vendedor'
    ).prefetch_related('detalles__producto').order_by('-fecha_elaboracion')

    # Administrador ve todo, otros solo su ubicación
    if not es_admin(perfil):
        qs = qs.filter(ubicacion=perfil)

    # Filtros
    search = request.GET.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(codigo__icontains=search) |
            Q(cliente__icontains=search) |
            Q(vendedor__first_name__icontains=search)
        )

    estado = request.GET.get('estado', '').strip()
    if estado:
        qs = qs.filter(estado=estado)

    tipo_pago = request.GET.get('tipo_pago', '').strip()
    if tipo_pago:
        qs = qs.filter(tipo_pago=tipo_pago)

    fecha_desde = request.GET.get('fecha_desde', '').strip()
    if fecha_desde:
        qs = qs.filter(fecha_elaboracion__date__gte=fecha_desde)

    fecha_hasta = request.GET.get('fecha_hasta', '').strip()
    if fecha_hasta:
        qs = qs.filter(fecha_elaboracion__date__lte=fecha_hasta)

    # Paginación
    page_size = 10
    paginator = Paginator(qs, page_size)
    page_num = request.GET.get('page', 1)
    page = paginator.get_page(page_num)

    # Construir URL base para next/previous
    base_url = request.build_absolute_uri(request.path)
    params = request.GET.copy()

    def make_url(p):
        params['page'] = p
        return f"{base_url}?{'&'.join(f'{k}={v}' for k, v in params.items())}"

    data = {
        'count': paginator.count,
        'next': make_url(page.next_page_number()) if page.has_next() else None,
        'previous': make_url(page.previous_page_number()) if page.has_previous() else None,
        'results': [
            {
                'id': v.id,
                'codigo': v.codigo,
                'cliente': v.cliente,
                'telefono': v.telefono or '',
                'tipo_pago': v.tipo_pago,
                'tipo_pago_display': v.get_tipo_pago_display(),
                'estado': v.estado,
                'estado_display': v.get_estado_display(),
                'vendedor': v.vendedor.get_full_name() or v.vendedor.username if v.vendedor else 'N/A',
                'ubicacion': str(v.ubicacion) if v.ubicacion else 'N/A',
                'total': str(v.total),
                'fecha': v.fecha_elaboracion.strftime('%d/%m/%Y %H:%M'),
                'productos': [
                    {
                        'nombre': d.producto.nombre,
                        'cantidad': d.cantidad,
                        'precio_unitario': str(d.precio_unitario),
                        'subtotal': str(d.subtotal),
                    }
                    for d in v.detalles.all()
                ]
            }
            for v in page
        ]
    }
    return JsonResponse(data)


# ── API TRASPASOS ─────────────────────────────────────────────────
@login_required
def api_traspasos(request):
    perfil = get_perfil(request)
    if not perfil:
        return JsonResponse({'error': 'Sin perfil'}, status=403)

    qs = Traspaso.objects.select_related(
        'origen', 'destino', 'creado_por'
    ).prefetch_related('detalles__producto').order_by('-fecha_creacion')

    if not es_admin(perfil):
        qs = qs.filter(Q(origen=perfil) | Q(destino=perfil))

    search = request.GET.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(codigo__icontains=search) |
            Q(origen__usuario__first_name__icontains=search) |
            Q(destino__usuario__first_name__icontains=search)
        )

    estado = request.GET.get('estado', '').strip()
    if estado:
        qs = qs.filter(estado=estado)

    tipo = request.GET.get('tipo', '').strip()
    if tipo:
        qs = qs.filter(tipo=tipo)

    fecha_desde = request.GET.get('fecha_desde', '').strip()
    if fecha_desde:
        qs = qs.filter(fecha_creacion__date__gte=fecha_desde)

    fecha_hasta = request.GET.get('fecha_hasta', '').strip()
    if fecha_hasta:
        qs = qs.filter(fecha_creacion__date__lte=fecha_hasta)

    page_size = 10
    paginator = Paginator(qs, page_size)
    page_num = request.GET.get('page', 1)
    page = paginator.get_page(page_num)

    base_url = request.build_absolute_uri(request.path)
    params = request.GET.copy()

    def make_url(p):
        params['page'] = p
        return f"{base_url}?{'&'.join(f'{k}={v}' for k, v in params.items())}"

    data = {
        'count': paginator.count,
        'next': make_url(page.next_page_number()) if page.has_next() else None,
        'previous': make_url(page.previous_page_number()) if page.has_previous() else None,
        'results': [
            {
                'id': t.id,
                'codigo': t.codigo,
                'tipo': t.tipo,
                'tipo_display': t.get_tipo_display(),
                'estado': t.estado,
                'estado_display': t.get_estado_display(),
                'origen': str(t.origen) if t.origen else 'N/A',
                'destino': str(t.destino) if t.destino else 'N/A',
                'creado_por': t.creado_por.get_full_name() or t.creado_por.username if t.creado_por else 'N/A',
                'total': str(t.total),
                'fecha': t.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
                'fecha_envio': t.fecha_envio.strftime('%d/%m/%Y %H:%M') if t.fecha_envio else None,
                'fecha_recepcion': t.fecha_recepcion.strftime('%d/%m/%Y %H:%M') if t.fecha_recepcion else None,
                'comentario': t.comentario or '',
                'productos': [
                    {
                        'nombre': d.producto.nombre,
                        'codigo': d.producto.codigo,
                        'cantidad': d.cantidad,
                    }
                    for d in t.detalles.all()
                ]
            }
            for t in page
        ]
    }
    return JsonResponse(data)


# ── API MOVIMIENTOS ───────────────────────────────────────────────
@login_required
def api_movimientos(request):
    perfil = get_perfil(request)
    if not perfil:
        return JsonResponse({'error': 'Sin perfil'}, status=403)

    qs = MovimientoInventario.objects.select_related(
        'producto', 'ubicacion'
    ).order_by('-fecha')

    if not es_admin(perfil):
        qs = qs.filter(ubicacion=perfil)

    search = request.GET.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(producto__codigo__icontains=search) |
            Q(producto__nombre__icontains=search)
        )

    tipo = request.GET.get('tipo', '').strip()
    if tipo:
        qs = qs.filter(tipo=tipo)

    fecha_desde = request.GET.get('fecha_desde', '').strip()
    if fecha_desde:
        qs = qs.filter(fecha__date__gte=fecha_desde)

    fecha_hasta = request.GET.get('fecha_hasta', '').strip()
    if fecha_hasta:
        qs = qs.filter(fecha__date__lte=fecha_hasta)

    page_size = 10
    paginator = Paginator(qs, page_size)
    page_num = request.GET.get('page', 1)
    page = paginator.get_page(page_num)

    base_url = request.build_absolute_uri(request.path)
    params = request.GET.copy()

    def make_url(p):
        params['page'] = p
        return f"{base_url}?{'&'.join(f'{k}={v}' for k, v in params.items())}"

    data = {
        'count': paginator.count,
        'next': make_url(page.next_page_number()) if page.has_next() else None,
        'previous': make_url(page.previous_page_number()) if page.has_previous() else None,
        'results': [
            {
                'id': m.id,
                'producto_codigo': m.producto.codigo,
                'producto_nombre': m.producto.nombre,
                'tipo': m.tipo,
                'cantidad': m.cantidad,
                'ubicacion': str(m.ubicacion) if m.ubicacion else 'N/A',
                'fecha': m.fecha.strftime('%d/%m/%Y %H:%M'),
            }
            for m in page
        ]
    }
    return JsonResponse(data)