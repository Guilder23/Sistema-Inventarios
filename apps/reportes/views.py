from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse

@login_required
def index_reportes(request):
    return render(request, 'reportes/index.html')

@login_required
def reporte_inventario(request):
    return HttpResponse('Reporte de Inventario PDF')

@login_required
def reporte_ventas(request):
    return HttpResponse('Reporte de Ventas PDF')

@login_required
def reporte_traspasos(request):
    return HttpResponse('Reporte de Traspasos PDF')
