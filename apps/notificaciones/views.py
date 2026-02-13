from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

@login_required
def listar_notificaciones(request):
    return render(request, 'notificaciones/listar.html')

@login_required
def contador_notificaciones(request):
    return JsonResponse({'no_leidas': 0})

@login_required
def marcar_leida(request, id):
    return JsonResponse({'success': True})

@login_required
def marcar_todas_leidas(request):
    return JsonResponse({'success': True})
