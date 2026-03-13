from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import Tienda
from apps.almacenes.models import Almacen

@login_required
def listar_tiendas(request):
    """Listar todas las tiendas con filtros"""
    # Obtener parámetros de búsqueda
    buscar = request.GET.get('buscar', '')
    estado = request.GET.get('estado', '')
    almacen_id = request.GET.get('almacen', '')
    
    # Query base
    tiendas = Tienda.objects.select_related('almacen', 'creado_por').all()
    
    # Aplicar filtros
    if buscar:
        tiendas = tiendas.filter(
            Q(nombre__icontains=buscar) |
            Q(ciudad__icontains=buscar) |
            Q(almacen__nombre__icontains=buscar)
        )
    
    if estado:
        tiendas = tiendas.filter(estado=estado)
    
    if almacen_id:
        tiendas = tiendas.filter(almacen_id=almacen_id)
    
    # Obtener todos los almacenes para el filtro
    almacenes = Almacen.objects.filter(estado='activo').order_by('nombre')
    
    context = {
        'tiendas': tiendas,
        'almacenes': almacenes,
        'buscar': buscar,
        'estado': estado,
        'almacen_id': almacen_id,
    }
    
    return render(request, 'tiendas/tiendas.html', context)

@login_required
@require_http_methods(["POST"])
def crear_tienda(request):
    """Crear una nueva tienda"""
    try:
        tienda = Tienda.objects.create(
            nombre=request.POST.get('nombre'),
            descripcion=request.POST.get('descripcion', ''),
            tipo=request.POST.get('tipo', 'sucursal'),
            almacen_id=request.POST.get('almacen'),
            direccion=request.POST.get('direccion'),
            ciudad=request.POST.get('ciudad'),
            departamento=request.POST.get('departamento'),
            coordenadas=request.POST.get('coordenadas', ''),
            estado=request.POST.get('estado', 'activo'),
            creado_por=request.user
        )
        messages.success(request, f'Tienda {tienda.nombre} creada exitosamente')
    except Exception as e:
        messages.error(request, f'Error al crear tienda: {str(e)}')
    
    return redirect('tiendas:listar')

@login_required
@require_http_methods(["POST"])
def editar_tienda(request, pk):
    """Editar una tienda existente"""
    tienda = get_object_or_404(Tienda, pk=pk)
    
    try:
        tienda.nombre = request.POST.get('nombre')
        tienda.descripcion = request.POST.get('descripcion', '')
        tienda.tipo = request.POST.get('tipo')
        tienda.almacen_id = request.POST.get('almacen')
        tienda.direccion = request.POST.get('direccion')
        tienda.ciudad = request.POST.get('ciudad')
        tienda.departamento = request.POST.get('departamento')
        tienda.coordenadas = request.POST.get('coordenadas', '')
        tienda.estado = request.POST.get('estado')
        tienda.save()
        
        messages.success(request, f'Tienda {tienda.nombre} actualizada exitosamente')
    except Exception as e:
        messages.error(request, f'Error al actualizar tienda: {str(e)}')
    
    return redirect('tiendas:listar')

@login_required
@require_http_methods(["POST"])
def cambiar_estado_tienda(request, pk):
    """Cambiar el estado de una tienda"""
    tienda = get_object_or_404(Tienda, pk=pk)
    
    try:
        nuevo_estado = request.POST.get('estado')
        tienda.estado = nuevo_estado
        tienda.save()
        
        messages.success(request, f'Estado de la tienda {tienda.nombre} cambiado a {tienda.get_estado_display()}')
    except Exception as e:
        messages.error(request, f'Error al cambiar estado: {str(e)}')
    
    return redirect('tiendas:listar')

@login_required
def obtener_tienda(request, pk):
    """Obtener datos de una tienda en formato JSON"""
    tienda = get_object_or_404(Tienda, pk=pk)
    
    data = {
        'id': tienda.id,
        'nombre': tienda.nombre,
        'descripcion': tienda.descripcion or '',
        'tipo': tienda.tipo,
        'tipo_display': tienda.get_tipo_display(),
        'almacen_id': tienda.almacen.id,
        'almacen_nombre': tienda.almacen.nombre,
        'direccion': tienda.direccion,
        'ciudad': tienda.ciudad,
        'departamento': tienda.departamento,
        'coordenadas': tienda.coordenadas or '',
        'estado': tienda.estado,
        'estado_display': tienda.get_estado_display(),
        'creado_por': tienda.creado_por.get_full_name() if tienda.creado_por else 'Sistema',
        'fecha_creacion': tienda.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
        'fecha_actualizacion': tienda.fecha_actualizacion.strftime('%d/%m/%Y %H:%M'),
    }
    
    return JsonResponse(data)
