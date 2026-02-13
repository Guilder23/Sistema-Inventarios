from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages

@login_required
def listar_productos(request):
    return render(request, 'productos/listar.html')

@login_required
def crear_producto(request):
    return render(request, 'productos/crear.html')

@login_required
def editar_producto(request, id):
    return render(request, 'productos/editar.html')

@login_required
def eliminar_producto(request, id):
    messages.success(request, 'Producto eliminado')
    return redirect('listar_productos')

@login_required
def historial_producto(request, id):
    return render(request, 'productos/historial.html')

@login_required
def listar_danados(request):
    return render(request, 'productos/danados.html')

@login_required
def registrar_danado(request):
    return render(request, 'productos/registrar_danado.html')
