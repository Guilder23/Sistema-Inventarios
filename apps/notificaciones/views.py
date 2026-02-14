from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import Notificacion
from django.utils import timezone

@login_required
def listar_notificaciones(request):
    """Listar todas las notificaciones del usuario"""
    notificaciones = Notificacion.objects.filter(usuario=request.user).order_by('-fecha_creacion')
    return render(request, 'notificaciones/listar.html', {'notificaciones': notificaciones})

@login_required
def obtener_notificaciones(request):
    """Obtener notificaciones en JSON para cargar dinámicamente"""
    try:
        notificaciones = Notificacion.objects.filter(usuario=request.user).order_by('-fecha_creacion')[:10]
        
        data = []
        for notif in notificaciones:
            minutos_atras = (timezone.now() - notif.fecha_creacion).total_seconds() / 60
            
            if minutos_atras < 1:
                tiempo_text = "Ahora"
            elif minutos_atras < 60:
                tiempo_text = f"Hace {int(minutos_atras)} min"
            elif minutos_atras < 1440:
                horas = int(minutos_atras / 60)
                tiempo_text = f"Hace {horas} hora{'s' if horas > 1 else ''}"
            else:
                dias = int(minutos_atras / 1440)
                tiempo_text = f"Hace {dias} día{'s' if dias > 1 else ''}"
            
            # Determinar icono según tipo
            iconos = {
                'producto_creado': 'fa-plus-circle bg-success',
                'producto_editado': 'fa-edit bg-info',
                'producto_eliminado': 'fa-trash bg-danger',
                'precio_modificado': 'fa-dollar-sign bg-warning',
                'pedido': 'fa-shopping-bag bg-primary',
                'traspaso': 'fa-exchange-alt bg-secondary',
                'stock_critico': 'fa-exclamation-triangle bg-danger',
                'stock_bajo': 'fa-exclamation-circle bg-warning',
                'venta': 'fa-check-circle bg-success',
                'general': 'fa-bell bg-muted',
            }
            
            icono = iconos.get(notif.tipo, 'fa-bell')
            
            data.append({
                'id': notif.id,
                'titulo': notif.titulo,
                'mensaje': notif.mensaje,
                'tipo': notif.tipo,
                'icono': icono,
                'tiempo': tiempo_text,
                'leida': notif.leida,
                'url': notif.url or '#',
            })
        
        no_leidas = Notificacion.objects.filter(usuario=request.user, leida=False).count()
        
        return JsonResponse({
            'notificaciones': data,
            'no_leidas': no_leidas,
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def contador_notificaciones(request):
    """Obtener cantidad de notificaciones no leídas"""
    try:
        no_leidas = Notificacion.objects.filter(usuario=request.user, leida=False).count()
        return JsonResponse({'no_leidas': no_leidas})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def marcar_leida(request, id):
    """Marcar una notificación como leída"""
    try:
        notificacion = Notificacion.objects.get(id=id, usuario=request.user)
        notificacion.marcar_como_leida()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=404)

@login_required
def marcar_todas_leidas(request):
    """Marcar todas las notificaciones como leídas"""
    try:
        notificaciones = Notificacion.objects.filter(usuario=request.user, leida=False)
        for notif in notificaciones:
            notif.marcar_como_leida()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

