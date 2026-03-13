from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import Deposito
from apps.tiendas.models import Tienda

@login_required
def listar_depositos(request):
    """Listar todos los depósitos con filtros"""
    # Obtener parámetros de búsqueda
    buscar = request.GET.get('buscar', '')
    estado = request.GET.get('estado', '')
    tienda_id = request.GET.get('tienda', '')
    
    # Query base
    depositos = Deposito.objects.select_related('tienda', 'tienda__almacen', 'creado_por').all()
    
    # Aplicar filtros
    if buscar:
        depositos = depositos.filter(
            Q(nombre__icontains=buscar) |
            Q(ciudad__icontains=buscar) |
            Q(tienda__nombre__icontains=buscar)
        )
    
    if estado:
        depositos = depositos.filter(estado=estado)
    
    if tienda_id:
        depositos = depositos.filter(tienda_id=tienda_id)
    
    # Obtener todas las tiendas para los filtros
    tiendas = Tienda.objects.filter(estado='activo').order_by('nombre')
    
    context = {
        'depositos': depositos,
        'tiendas': tiendas,
        'buscar': buscar,
        'estado': estado,
        'tienda_id': tienda_id,
    }
    
    return render(request, 'depositos/depositos.html', context)

@login_required
@require_http_methods(["POST"])
def crear_deposito(request):
    """Crear un nuevo depósito"""
    try:
        deposito = Deposito.objects.create(
            nombre=request.POST.get('nombre'),
            descripcion=request.POST.get('descripcion', ''),
            tipo=request.POST.get('tipo', 'principal'),
            tienda_id=request.POST.get('tienda'),
            direccion=request.POST.get('direccion'),
            ciudad=request.POST.get('ciudad'),
            departamento=request.POST.get('departamento'),
            coordenadas=request.POST.get('coordenadas', ''),
            estado=request.POST.get('estado', 'activo'),
            creado_por=request.user
        )
        messages.success(request, f'Depósito {deposito.nombre} creado exitosamente')
    except Exception as e:
        messages.error(request, f'Error al crear depósito: {str(e)}')
    
    return redirect('depositos:listar')

@login_required
@require_http_methods(["POST"])
def editar_deposito(request, pk):
    """Editar un depósito existente"""
    deposito = get_object_or_404(Deposito, pk=pk)
    
    try:
        deposito.nombre = request.POST.get('nombre')
        deposito.descripcion = request.POST.get('descripcion', '')
        deposito.tipo = request.POST.get('tipo')
        deposito.tienda_id = request.POST.get('tienda')
        deposito.direccion = request.POST.get('direccion')
        deposito.ciudad = request.POST.get('ciudad')
        deposito.departamento = request.POST.get('departamento')
        deposito.coordenadas = request.POST.get('coordenadas', '')
        deposito.estado = request.POST.get('estado')
        deposito.save()
        
        messages.success(request, f'Depósito {deposito.nombre} actualizado exitosamente')
    except Exception as e:
        messages.error(request, f'Error al actualizar depósito: {str(e)}')
    
    return redirect('depositos:listar')

@login_required
@require_http_methods(["POST"])
def cambiar_estado_deposito(request, pk):
    """Cambiar el estado de un depósito"""
    deposito = get_object_or_404(Deposito, pk=pk)
    
    try:
        nuevo_estado = request.POST.get('estado')
        deposito.estado = nuevo_estado
        deposito.save()
        
        messages.success(request, f'Estado del depósito {deposito.nombre} cambiado a {deposito.get_estado_display()}')
    except Exception as e:
        messages.error(request, f'Error al cambiar estado: {str(e)}')
    
    return redirect('depositos:listar')

@login_required
def obtener_deposito(request, pk):
    """Obtener datos de un depósito en formato JSON"""
    try:
        deposito = get_object_or_404(Deposito, pk=pk)
        
        data = {
            'id': deposito.id,
            'nombre': deposito.nombre,
            'descripcion': deposito.descripcion or '',
            'tipo': deposito.tipo,
            'tipo_display': deposito.get_tipo_display(),
            'tienda_id': deposito.tienda.id if deposito.tienda else None,
            'tienda_nombre': deposito.tienda.nombre if deposito.tienda else 'Sin tienda',
            'almacen_nombre': deposito.nombre_almacen,
            'direccion': deposito.direccion,
            'ciudad': deposito.ciudad,
            'departamento': deposito.departamento,
            'coordenadas': deposito.coordenadas or '',
            'estado': deposito.estado,
            'estado_display': deposito.get_estado_display(),
            'creado_por': deposito.creado_por.get_full_name() if deposito.creado_por else 'Sistema',
            'fecha_creacion': deposito.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
            'fecha_actualizacion': deposito.fecha_actualizacion.strftime('%d/%m/%Y %H:%M'),
        }
        
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
