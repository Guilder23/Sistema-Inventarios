from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import Vendedor


@login_required
def listar_vendedores(request):
    """Listar todos los vendedores con filtros"""
    from apps.almacenes.models import Almacen
    from apps.tiendas.models import Tienda
    
    # Obtener parámetros de búsqueda
    buscar = request.GET.get('buscar', '')
    estado = request.GET.get('estado', '')
    ubicacion_tipo = request.GET.get('ubicacion_tipo', '')
    ubicacion_id = request.GET.get('ubicacion_id', '')
    
    # Query base
    vendedores = Vendedor.objects.select_related('almacen', 'tienda', 'creado_por').order_by('-fecha_creacion')
    
    # Aplicar filtros
    if buscar:
        vendedores = vendedores.filter(
            Q(nombre__icontains=buscar) |
            Q(apellido__icontains=buscar) |
            Q(cedula__icontains=buscar) |
            Q(email__icontains=buscar) |
            Q(telefono__icontains=buscar)
        )
    
    if estado:
        vendedores = vendedores.filter(estado=estado)
    
    if ubicacion_tipo == 'almacen' and ubicacion_id:
        vendedores = vendedores.filter(almacen_id=ubicacion_id)
    elif ubicacion_tipo == 'tienda' and ubicacion_id:
        vendedores = vendedores.filter(tienda_id=ubicacion_id)
    
    context = {
        'vendedores': vendedores,
        'buscar': buscar,
        'estado': estado,
        'ubicacion_tipo': ubicacion_tipo,
        'ubicacion_id': ubicacion_id,
        'almacenes': Almacen.objects.filter(estado='activo'),
        'tiendas': Tienda.objects.filter(estado='activo'),
        'estados': Vendedor.ESTADO_CHOICES,
    }
    
    return render(request, 'vendedores/vendedores.html', context)


@login_required
@require_http_methods(["POST"])
def crear_vendedor(request):
    """Crear nuevo vendedor"""
    try:
        # Obtener datos del formulario
        nombre = request.POST.get('nombre', '').strip()
        apellido = request.POST.get('apellido', '').strip()
        cedula = request.POST.get('cedula', '').strip()
        email = request.POST.get('email', '').strip()
        telefono = request.POST.get('telefono', '').strip()
        direccion = request.POST.get('direccion', '').strip()
        
        # Datos de asignación
        almacen_id = request.POST.get('almacen', '')
        tienda_id = request.POST.get('tienda', '')
        comision = request.POST.get('comision', '0')
        estado = request.POST.get('estado', 'activo')
        
        # Validaciones
        if not nombre:
            messages.error(request, 'El nombre es requerido')
            return redirect('listar_vendedores')
        
        if not apellido:
            messages.error(request, 'El apellido es requerido')
            return redirect('listar_vendedores')
        
        if not cedula:
            messages.error(request, 'La cédula/DNI es requerida')
            return redirect('listar_vendedores')
        
        # Validar cédula única
        if Vendedor.objects.filter(cedula=cedula).exists():
            messages.error(request, f'Ya existe un vendedor con cédula "{cedula}"')
            return redirect('listar_vendedores')
        
        # Validar que sea asignado a almacén o tienda
        if not almacen_id and not tienda_id:
            messages.error(request, 'Debe asignar el vendedor a un almacén o tienda')
            return redirect('listar_vendedores')
        
        # Obtener almacén y tienda si aplica
        almacen = None
        tienda = None
        
        if almacen_id:
            from apps.almacenes.models import Almacen
            almacen = Almacen.objects.filter(id=almacen_id).first()
        
        if tienda_id:
            from apps.tiendas.models import Tienda
            tienda = Tienda.objects.filter(id=tienda_id).first()
        
        # Crear vendedor
        vendedor = Vendedor.objects.create(
            nombre=nombre,
            apellido=apellido,
            cedula=cedula,
            email=email if email else None,
            telefono=telefono,
            direccion=direccion,
            almacen=almacen,
            tienda=tienda,
            comision=float(comision) if comision else 0,
            estado=estado,
            creado_por=request.user
        )
        
        messages.success(request, f'Vendedor "{vendedor.nombre_completo}" creado exitosamente')
        return redirect('listar_vendedores')
            
    except Exception as e:
        messages.error(request, f'Error al crear vendedor: {str(e)}')
        return redirect('listar_vendedores')


@login_required
def obtener_vendedor(request, id):
    """Obtener datos de un vendedor en formato JSON"""
    try:
        vendedor = get_object_or_404(Vendedor, id=id)
        
        data = {
            'id': vendedor.id,
            'nombre': vendedor.nombre,
            'apellido': vendedor.apellido,
            'cedula': vendedor.cedula,
            'email': vendedor.email or '',
            'telefono': vendedor.telefono or '',
            'direccion': vendedor.direccion or '',
            'almacen_id': vendedor.almacen_id or '',
            'tienda_id': vendedor.tienda_id or '',
            'comision': str(vendedor.comision),
            'estado': vendedor.estado,
            'creado_por': vendedor.creado_por.username if vendedor.creado_por else 'Sistema',
            'fecha_creacion': vendedor.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
        }
        
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(["POST"])
def editar_vendedor(request, id):
    """Editar datos de un vendedor"""
    try:
        vendedor = get_object_or_404(Vendedor, id=id)
        
        # Obtener datos del formulario
        nombre = request.POST.get('nombre', '').strip()
        apellido = request.POST.get('apellido', '').strip()
        cedula = request.POST.get('cedula', '').strip()
        email = request.POST.get('email', '').strip()
        telefono = request.POST.get('telefono', '').strip()
        direccion = request.POST.get('direccion', '').strip()
        
        almacen_id = request.POST.get('almacen', '')
        tienda_id = request.POST.get('tienda', '')
        comision = request.POST.get('comision', '0')
        estado = request.POST.get('estado', 'activo')
        
        # Validaciones
        if not nombre:
            messages.error(request, 'El nombre es requerido')
            return redirect('listar_vendedores')
        
        if not apellido:
            messages.error(request, 'El apellido es requerido')
            return redirect('listar_vendedores')
        
        if not cedula:
            messages.error(request, 'La cédula/DNI es requerida')
            return redirect('listar_vendedores')
        
        # Validar cédula única (excluyendo al vendedor actual)
        if Vendedor.objects.filter(cedula=cedula).exclude(id=id).exists():
            messages.error(request, f'Ya existe otro vendedor con cédula "{cedula}"')
            return redirect('listar_vendedores')
        
        # Validar asignación
        if not almacen_id and not tienda_id:
            messages.error(request, 'Debe asignar el vendedor a un almacén o tienda')
            return redirect('listar_vendedores')
        
        # Obtener almacén y tienda
        almacen = None
        tienda = None
        
        if almacen_id:
            from apps.almacenes.models import Almacen
            almacen = Almacen.objects.filter(id=almacen_id).first()
        
        if tienda_id:
            from apps.tiendas.models import Tienda
            tienda = Tienda.objects.filter(id=tienda_id).first()
        
        # Actualizar vendedor
        vendedor.nombre = nombre
        vendedor.apellido = apellido
        vendedor.cedula = cedula
        vendedor.email = email if email else None
        vendedor.telefono = telefono
        vendedor.direccion = direccion
        vendedor.almacen = almacen
        vendedor.tienda = tienda
        vendedor.comision = float(comision) if comision else 0
        vendedor.estado = estado
        vendedor.save()
        
        messages.success(request, f'Vendedor "{vendedor.nombre_completo}" actualizado exitosamente')
        return redirect('listar_vendedores')
        
    except Exception as e:
        messages.error(request, f'Error al actualizar vendedor: {str(e)}')
        return redirect('listar_vendedores')


@login_required
@require_http_methods(["POST"])
def eliminar_vendedor(request, id):
    """Eliminar un vendedor"""
    try:
        vendedor = get_object_or_404(Vendedor, id=id)
        nombre = vendedor.nombre_completo
        vendedor.delete()
        
        messages.success(request, f'Vendedor "{nombre}" eliminado exitosamente')
        return redirect('listar_vendedores')
        
    except Exception as e:
        messages.error(request, f'Error al eliminar vendedor: {str(e)}')
        return redirect('listar_vendedores')


@login_required
def obtener_tiendas_por_almacen(request, almacen_id):
    """Obtener tiendas de un almacén específico en formato JSON"""
    try:
        from apps.tiendas.models import Tienda
        
        tiendas = Tienda.objects.filter(almacen_id=almacen_id, estado='activo').values('id', 'nombre')
        return JsonResponse({'tiendas': list(tiendas)})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
