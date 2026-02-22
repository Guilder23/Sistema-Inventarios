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
            Q(codigo__icontains=buscar) |
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
            codigo=request.POST.get('codigo'),
            descripcion=request.POST.get('descripcion', ''),
            tipo=request.POST.get('tipo', 'principal'),
            tienda_id=request.POST.get('tienda'),
            direccion=request.POST.get('direccion'),
            ciudad=request.POST.get('ciudad'),
            departamento=request.POST.get('departamento'),
            pais=request.POST.get('pais', 'Colombia'),
            codigo_postal=request.POST.get('codigo_postal', ''),
            coordenadas=request.POST.get('coordenadas', ''),
            telefono=request.POST.get('telefono', ''),
            email=request.POST.get('email', ''),
            area_m2=request.POST.get('area_m2') or None,
            horario_apertura=request.POST.get('horario_apertura') or None,
            horario_cierre=request.POST.get('horario_cierre') or None,
            estado=request.POST.get('estado', 'activo'),
            fecha_apertura=request.POST.get('fecha_apertura') or None,
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
        deposito.codigo = request.POST.get('codigo')
        deposito.descripcion = request.POST.get('descripcion', '')
        deposito.tipo = request.POST.get('tipo')
        deposito.tienda_id = request.POST.get('tienda')
        deposito.direccion = request.POST.get('direccion')
        deposito.ciudad = request.POST.get('ciudad')
        deposito.departamento = request.POST.get('departamento')
        deposito.pais = request.POST.get('pais', 'Colombia')
        deposito.codigo_postal = request.POST.get('codigo_postal', '')
        deposito.coordenadas = request.POST.get('coordenadas', '')
        deposito.telefono = request.POST.get('telefono', '')
        deposito.email = request.POST.get('email', '')
        deposito.area_m2 = request.POST.get('area_m2') or None
        deposito.horario_apertura = request.POST.get('horario_apertura') or None
        deposito.horario_cierre = request.POST.get('horario_cierre') or None
        deposito.estado = request.POST.get('estado')
        deposito.fecha_apertura = request.POST.get('fecha_apertura') or None
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
            'codigo': deposito.codigo,
            'descripcion': deposito.descripcion or '',
            'tipo': deposito.tipo,
            'tipo_display': deposito.get_tipo_display(),
            'tienda_id': deposito.tienda.id if deposito.tienda else None,
            'tienda_nombre': deposito.tienda.nombre if deposito.tienda else 'Sin tienda',
            'almacen_nombre': deposito.nombre_almacen,
            'direccion': deposito.direccion,
            'ciudad': deposito.ciudad,
            'departamento': deposito.departamento,
            'pais': deposito.pais,
            'codigo_postal': deposito.codigo_postal or '',
            'coordenadas': deposito.coordenadas or '',
            'telefono': deposito.telefono or '',
            'email': deposito.email or '',
            'area_m2': str(deposito.area_m2) if deposito.area_m2 else '',
            'horario_apertura': deposito.horario_apertura.strftime('%H:%M') if deposito.horario_apertura else '',
            'horario_cierre': deposito.horario_cierre.strftime('%H:%M') if deposito.horario_cierre else '',
            'estado': deposito.estado,
            'estado_display': deposito.get_estado_display(),
            'fecha_apertura': deposito.fecha_apertura.strftime('%Y-%m-%d') if deposito.fecha_apertura else '',
            'creado_por': deposito.creado_por.get_full_name() if deposito.creado_por else 'Sistema',
            'fecha_creacion': deposito.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
            'fecha_actualizacion': deposito.fecha_actualizacion.strftime('%d/%m/%Y %H:%M'),
        }
        
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
