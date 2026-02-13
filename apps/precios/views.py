from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import Precio, HistorialPrecio
from apps.productos.models import Producto


@login_required(login_url='index')
def precios_list(request):
    """Listar precios"""
    precios = Precio.objects.select_related('producto')
    
    context = {
        'precios': precios,
    }
    return render(request, 'precios/precios_list.html', context)


@login_required(login_url='index')
def precio_editar(request, producto_id):
    """Editar precio de un producto"""
    producto = get_object_or_404(Producto, id=producto_id)
    
    try:
        precio = Precio.objects.get(producto=producto)
    except Precio.DoesNotExist:
        precio = Precio.objects.create(producto=producto, precio_unitario=0)
    
    if request.method == 'POST':
        precio_unitario = request.POST.get('precio_unitario', '0')
        precio_mayorista = request.POST.get('precio_mayorista', '')
        precio_especial = request.POST.get('precio_especial', '')
        
        try:
            nuevo_precio = float(precio_unitario)
            
            if nuevo_precio <= 0:
                messages.error(request, 'El precio debe ser mayor a cero.')
                return redirect('precio_editar', producto_id=producto_id)
            
            # Registrar en historial
            if precio.precio_unitario != nuevo_precio:
                HistorialPrecio.objects.create(
                    producto=producto,
                    precio_anterior=precio.precio_unitario,
                    precio_nuevo=nuevo_precio,
                    actualizado_por=request.user,
                )
            
            # Actualizar precio
            precio.precio_unitario = nuevo_precio
            
            if precio_mayorista:
                precio.precio_mayorista = float(precio_mayorista)
            
            if precio_especial:
                precio.precio_especial = float(precio_especial)
            
            precio.actualizado_por = request.user
            precio.save()
            
            messages.success(request, f'Precio actualizado para {producto.nombre}')
            return redirect('precios_list')
        except ValueError:
            messages.error(request, 'Los precios deben ser números válidos.')
            return redirect('precio_editar', producto_id=producto_id)
    
    context = {
        'producto': producto,
        'precio': precio,
    }
    return render(request, 'precios/precio_form.html', context)
