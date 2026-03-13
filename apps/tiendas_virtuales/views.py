from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import TiendaVirtual

@login_required
def listar_tiendas_virtuales(request):
    """Listar todas las tiendas virtuales con filtros"""
    # Obtener parámetros de búsqueda
    buscar = request.GET.get('buscar', '')
    estado = request.GET.get('estado', '')
    plataforma = request.GET.get('plataforma', '')
    
    # Query base
    tiendas_virtuales = TiendaVirtual.objects.select_related('creado_por').all()
    
    # Aplicar filtros
    if buscar:
        tiendas_virtuales = tiendas_virtuales.filter(
            Q(nombre__icontains=buscar) |
            Q(codigo__icontains=buscar) |
            Q(dominio__icontains=buscar) |
            Q(url__icontains=buscar)
        )
    
    if estado:
        tiendas_virtuales = tiendas_virtuales.filter(estado=estado)
    
    if plataforma:
        tiendas_virtuales = tiendas_virtuales.filter(plataforma=plataforma)
    
    context = {
        'tiendas_virtuales': tiendas_virtuales,
        'buscar': buscar,
        'estado': estado,
        'plataforma': plataforma,
    }
    
    return render(request, 'tiendas_virtuales/tiendas_virtuales.html', context)

@login_required
@require_http_methods(["POST"])
def crear_tienda_virtual(request):
    """Crear una nueva tienda virtual"""
    try:
        tienda = TiendaVirtual.objects.create(
            nombre=request.POST.get('nombre'),
            codigo=request.POST.get('codigo'),
            descripcion=request.POST.get('descripcion', ''),
            url=request.POST.get('url'),
            dominio=request.POST.get('dominio'),
            plataforma=request.POST.get('plataforma', 'propia'),
            version_plataforma=request.POST.get('version_plataforma', ''),
            servidor_hosting=request.POST.get('servidor_hosting', ''),
            certificado_ssl=request.POST.get('certificado_ssl') == 'on',
            email_soporte=request.POST.get('email_soporte'),
            email_ventas=request.POST.get('email_ventas', ''),
            telefono=request.POST.get('telefono', ''),
            facebook_url=request.POST.get('facebook_url', ''),
            instagram_url=request.POST.get('instagram_url', ''),
            twitter_url=request.POST.get('twitter_url', ''),
            moneda=request.POST.get('moneda', 'COP'),
            idioma=request.POST.get('idioma', 'es'),
            zona_horaria=request.POST.get('zona_horaria', 'America/Bogota'),
            estado=request.POST.get('estado', 'desarrollo'),
            fecha_lanzamiento=request.POST.get('fecha_lanzamiento') or None,
            creado_por=request.user
        )
        messages.success(request, f'Tienda Virtual {tienda.nombre} creada exitosamente')
    except Exception as e:
        messages.error(request, f'Error al crear tienda virtual: {str(e)}')
    
    return redirect('tiendas_virtuales:listar')

@login_required
@require_http_methods(["POST"])
def editar_tienda_virtual(request, pk):
    """Editar una tienda virtual existente"""
    tienda = get_object_or_404(TiendaVirtual, pk=pk)
    
    try:
        tienda.nombre = request.POST.get('nombre')
        tienda.codigo = request.POST.get('codigo')
        tienda.descripcion = request.POST.get('descripcion', '')
        tienda.url = request.POST.get('url')
        tienda.dominio = request.POST.get('dominio')
        tienda.plataforma = request.POST.get('plataforma')
        tienda.version_plataforma = request.POST.get('version_plataforma', '')
        tienda.servidor_hosting = request.POST.get('servidor_hosting', '')
        tienda.certificado_ssl = request.POST.get('certificado_ssl') == 'on'
        tienda.email_soporte = request.POST.get('email_soporte')
        tienda.email_ventas = request.POST.get('email_ventas', '')
        tienda.telefono = request.POST.get('telefono', '')
        tienda.facebook_url = request.POST.get('facebook_url', '')
        tienda.instagram_url = request.POST.get('instagram_url', '')
        tienda.twitter_url = request.POST.get('twitter_url', '')
        tienda.moneda = request.POST.get('moneda', 'COP')
        tienda.idioma = request.POST.get('idioma', 'es')
        tienda.zona_horaria = request.POST.get('zona_horaria', 'America/Bogota')
        tienda.estado = request.POST.get('estado')
        tienda.fecha_lanzamiento = request.POST.get('fecha_lanzamiento') or None
        tienda.save()
        
        messages.success(request, f'Tienda Virtual {tienda.nombre} actualizada exitosamente')
    except Exception as e:
        messages.error(request, f'Error al actualizar tienda virtual: {str(e)}')
    
    return redirect('tiendas_virtuales:listar')

@login_required
@require_http_methods(["POST"])
def cambiar_estado_tienda_virtual(request, pk):
    """Cambiar el estado de una tienda virtual"""
    tienda = get_object_or_404(TiendaVirtual, pk=pk)
    
    try:
        nuevo_estado = request.POST.get('estado')
        tienda.estado = nuevo_estado
        tienda.save()
        
        messages.success(request, f'Estado de la tienda virtual {tienda.nombre} cambiado a {tienda.get_estado_display()}')
    except Exception as e:
        messages.error(request, f'Error al cambiar estado: {str(e)}')
    
    return redirect('tiendas_virtuales:listar')

@login_required
def obtener_tienda_virtual(request, pk):
    """Obtener datos de una tienda virtual en formato JSON"""
    tienda = get_object_or_404(TiendaVirtual, pk=pk)
    
    data = {
        'id': tienda.id,
        'nombre': tienda.nombre,
        'codigo': tienda.codigo,
        'descripcion': tienda.descripcion or '',
        'url': tienda.url,
        'dominio': tienda.dominio,
        'plataforma': tienda.plataforma,
        'plataforma_display': tienda.get_plataforma_display(),
        'version_plataforma': tienda.version_plataforma or '',
        'servidor_hosting': tienda.servidor_hosting or '',
        'certificado_ssl': tienda.certificado_ssl,
        'email_soporte': tienda.email_soporte,
        'email_ventas': tienda.email_ventas or '',
        'telefono': tienda.telefono or '',
        'facebook_url': tienda.facebook_url or '',
        'instagram_url': tienda.instagram_url or '',
        'twitter_url': tienda.twitter_url or '',
        'moneda': tienda.moneda,
        'idioma': tienda.idioma,
        'zona_horaria': tienda.zona_horaria,
        'estado': tienda.estado,
        'estado_display': tienda.get_estado_display(),
        'fecha_lanzamiento': tienda.fecha_lanzamiento.strftime('%Y-%m-%d') if tienda.fecha_lanzamiento else '',
        'creado_por': tienda.creado_por.get_full_name() if tienda.creado_por else 'Sistema',
        'fecha_creacion': tienda.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
        'fecha_actualizacion': tienda.fecha_actualizacion.strftime('%d/%m/%Y %H:%M'),
    }
    
    return JsonResponse(data)
