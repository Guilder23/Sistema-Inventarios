from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages

@login_required
def ver_inventario(request):
    return render(request, 'inventario/ver.html')

@login_required
def ver_inventario_ubicacion(request, ubicacion_id):
    return render(request, 'inventario/ver.html')

@login_required
def asignar_precio(request, producto_id):
    return render(request, 'inventario/asignar_precio.html')

@login_required
def listar_movimientos(request):
    return render(request, 'inventario/movimientos.html')
