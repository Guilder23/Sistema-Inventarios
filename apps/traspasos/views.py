from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse

@login_required
def listar_traspasos(request):
    return render(request, 'traspasos/listar.html')

@login_required
def crear_traspaso(request):
    return render(request, 'traspasos/crear.html')

@login_required
def ver_traspaso(request, id):
    return render(request, 'traspasos/ver.html')

@login_required
def aceptar_traspaso(request, id):
    messages.success(request, 'Traspaso aceptado')
    return redirect('listar_traspasos')

@login_required
def rechazar_traspaso(request, id):
    messages.warning(request, 'Traspaso rechazado')
    return redirect('listar_traspasos')

@login_required
def generar_pdf_traspaso(request, id):
    return HttpResponse('PDF de traspaso')

@login_required
def listar_devoluciones(request):
    return render(request, 'traspasos/devoluciones.html')

@login_required
def crear_devolucion(request):
    return render(request, 'traspasos/crear_devolucion.html')
