from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages

@login_required
def listar_pedidos(request):
    return render(request, 'pedidos/listar.html')

@login_required
def crear_pedido(request):
    return render(request, 'pedidos/crear.html')

@login_required
def ver_pedido(request, id):
    return render(request, 'pedidos/ver.html')

@login_required
def aceptar_pedido(request, id):
    messages.success(request, 'Pedido aceptado')
    return redirect('listar_pedidos')

@login_required
def cancelar_pedido(request, id):
    messages.warning(request, 'Pedido cancelado')
    return redirect('listar_pedidos')
