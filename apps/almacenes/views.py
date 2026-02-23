from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import Almacen

@login_required
def listar_almacenes(request):
    """Listar todos los almacenes con filtros"""
    # Obtener parámetros de búsqueda
    buscar = request.GET.get('buscar', '')
    estado = request.GET.get('estado', '')
    
    # Query base
    almacenes = Almacen.objects.select_related('creado_por').all()
    
    # Aplicar filtros
    if buscar:
        almacenes = almacenes.filter(
            Q(nombre__icontains=buscar) |
            Q(codigo__icontains=buscar) |
            Q(ciudad__icontains=buscar) |
            Q(departamento__icontains=buscar)
        )
    
    if estado:
        almacenes = almacenes.filter(estado=estado)
    
    context = {
        'almacenes': almacenes,
        'buscar': buscar,
        'estado': estado,
    }
    
    return render(request, 'almacenes/almacenes.html', context)

@login_required
@require_http_methods(["POST"])
def crear_almacen(request):
    """Crear un nuevo almacén"""
    try:
        almacen = Almacen.objects.create(
            nombre=request.POST.get('nombre'),
            codigo=request.POST.get('codigo'),
            descripcion=request.POST.get('descripcion', ''),
            direccion=request.POST.get('direccion'),
            ciudad=request.POST.get('ciudad'),
            departamento=request.POST.get('departamento'),
            pais=request.POST.get('pais', 'Colombia'),
            codigo_postal=request.POST.get('codigo_postal', ''),
            telefono=request.POST.get('telefono', ''),
            email=request.POST.get('email', ''),
            capacidad_m2=request.POST.get('capacidad_m2') or None,
            capacidad_productos=request.POST.get('capacidad_productos') or None,
            estado=request.POST.get('estado', 'activo'),
            creado_por=request.user
        )
        messages.success(request, f'Almacén {almacen.nombre} creado exitosamente')
    except Exception as e:
        messages.error(request, f'Error al crear almacén: {str(e)}')
    
    return redirect('almacenes:listar')

@login_required
@require_http_methods(["POST"])
def editar_almacen(request, pk):
    """Editar un almacén existente"""
    almacen = get_object_or_404(Almacen, pk=pk)
    
    try:
        almacen.nombre = request.POST.get('nombre')
        almacen.codigo = request.POST.get('codigo')
        almacen.descripcion = request.POST.get('descripcion', '')
        almacen.direccion = request.POST.get('direccion')
        almacen.ciudad = request.POST.get('ciudad')
        almacen.departamento = request.POST.get('departamento')
        almacen.pais = request.POST.get('pais', 'Colombia')
        almacen.codigo_postal = request.POST.get('codigo_postal', '')
        almacen.telefono = request.POST.get('telefono', '')
        almacen.email = request.POST.get('email', '')
        almacen.capacidad_m2 = request.POST.get('capacidad_m2') or None
        almacen.capacidad_productos = request.POST.get('capacidad_productos') or None
        almacen.estado = request.POST.get('estado')
        almacen.save()
        
        messages.success(request, f'Almacén {almacen.nombre} actualizado exitosamente')
    except Exception as e:
        messages.error(request, f'Error al actualizar almacén: {str(e)}')
    
    return redirect('almacenes:listar')

@login_required
@require_http_methods(["POST"])
def cambiar_estado_almacen(request, pk):
    """Cambiar el estado de un almacén"""
    almacen = get_object_or_404(Almacen, pk=pk)
    
    try:
        nuevo_estado = request.POST.get('estado')
        almacen.estado = nuevo_estado
        almacen.save()
        
        messages.success(request, f'Estado del almacén {almacen.nombre} cambiado a {almacen.get_estado_display()}')
    except Exception as e:
        messages.error(request, f'Error al cambiar estado: {str(e)}')
    
    return redirect('almacenes:listar')

@login_required
def obtener_almacen(request, pk):
    """Obtener datos de un almacén en formato JSON"""
    almacen = get_object_or_404(Almacen, pk=pk)
    
    data = {
        'id': almacen.id,
        'nombre': almacen.nombre,
        'codigo': almacen.codigo,
        'descripcion': almacen.descripcion or '',
        'direccion': almacen.direccion,
        'ciudad': almacen.ciudad,
        'departamento': almacen.departamento,
        'pais': almacen.pais,
        'codigo_postal': almacen.codigo_postal or '',
        'telefono': almacen.telefono or '',
        'email': almacen.email or '',
        'capacidad_m2': str(almacen.capacidad_m2) if almacen.capacidad_m2 else '',
        'capacidad_productos': almacen.capacidad_productos or '',
        'estado': almacen.estado,
        'estado_display': almacen.get_estado_display(),
        'creado_por': almacen.creado_por.get_full_name() if almacen.creado_por else 'Sistema',
        'fecha_creacion': almacen.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
        'fecha_actualizacion': almacen.fecha_actualizacion.strftime('%d/%m/%Y %H:%M'),
        'total_tiendas': almacen.total_tiendas,
    }
    
    return JsonResponse(data)
