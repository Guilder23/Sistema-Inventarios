from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse

@login_required
def listar_ventas(request):
    return render(request, 'ventas/listar.html')

@login_required
def crear_venta(request):
    return render(request, 'ventas/crear.html')

@login_required
def ver_venta(request, id):
    return render(request, 'ventas/ver.html')

@login_required
def generar_pdf_venta(request, id):
    return HttpResponse('PDF de venta')

@login_required
def registrar_amortizacion(request, venta_id):
    return render(request, 'ventas/amortizacion.html')
