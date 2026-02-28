from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import Notificacion
from django.utils import timezone
import json
import queue
from threading import Thread
from django.views.decorators.cache import never_cache
from django.http import StreamingHttpResponse

# Cola global para notificaciones en tiempo real
notificacion_queues = {}

@login_required
def listar_notificaciones(request):
    """Listar todas las notificaciones del usuario"""
    notificaciones = Notificacion.objects.filter(usuario=request.user).order_by('-fecha_creacion')
    
    # Obtener contexto adicional
    no_leidas = notificaciones.filter(leida=False).count()
    
    context = {
        'notificaciones': notificaciones,
        'no_leidas': no_leidas,
    }
    
    return render(request, 'notificaciones/notificaciones.html', context)

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
@require_http_methods(["POST"])
def marcar_todas_leidas(request):
    """Marcar todas las notificaciones como leídas"""
    try:
        notificaciones = Notificacion.objects.filter(usuario=request.user, leida=False)
        for notif in notificaciones:
            notif.marcar_como_leida()
        
        no_leidas = Notificacion.objects.filter(usuario=request.user, leida=False).count()
        
        return JsonResponse({
            'success': True,
            'no_leidas': no_leidas,
            'mensaje': f'Se marcaron {notificaciones.count()} notificación(es) como leída(s)'
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@never_cache
def notificaciones_sse(request):
    """
    Server-Sent Events para notificaciones en tiempo real
    """
    def evento_generador():
        usuario_id = request.user.id
        
        # Crear una cola para este usuario
        if usuario_id not in notificacion_queues:
            notificacion_queues[usuario_id] = queue.Queue()
        
        user_queue = notificacion_queues[usuario_id]
        
        # Enviar ping inicial
        yield f"data: {json.dumps({'tipo': 'ping'})}\n\n"
        
        try:
            while True:
                try:
                    # Esperar notificación (timeout 30 seg)
                    notificacion = user_queue.get(timeout=30)
                    
                    # Obtener última notificación
                    ultima_notif = Notificacion.objects.filter(
                        usuario=request.user
                    ).order_by('-fecha_creacion').first()
                    
                    if ultima_notif:
                        # Mapeo de iconos
                        iconos = {
                            'producto_creado': 'fa-plus-circle',
                            'producto_editado': 'fa-edit',
                            'producto_eliminado': 'fa-trash',
                            'precio_modificado': 'fa-dollar-sign',
                            'pedido': 'fa-shopping-bag',
                            'traspaso': 'fa-exchange-alt',
                            'stock_critico': 'fa-exclamation-triangle',
                            'stock_bajo': 'fa-exclamation-circle',
                            'venta': 'fa-check-circle',
                            'general': 'fa-bell',
                        }
                        
                        datos = {
                            'id': ultima_notif.id,
                            'titulo': ultima_notif.titulo,
                            'mensaje': ultima_notif.mensaje,
                            'tipo': ultima_notif.tipo,
                            'icono': iconos.get(ultima_notif.tipo, 'fa-bell'),
                            'url': ultima_notif.url or '#',
                        }
                        
                        yield f"data: {json.dumps(datos)}\n\n"
                    
                except queue.Empty:
                    # Enviar ping cada 30 segundos
                    yield f"data: {json.dumps({'tipo': 'ping'})}\n\n"
                    
        except GeneratorExit:
            # Limpiar cuando se cierre conexión
            if usuario_id in notificacion_queues:
                del notificacion_queues[usuario_id]
    
    return StreamingHttpResponse(
        evento_generador(),
        content_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        }
    )

def disparar_notificacion_realtime(usuario_id):
    """
    Dispara una notificación en tiempo real
    Se llama después de crear una notificación
    """
    if usuario_id in notificacion_queues:
        try:
            notificacion_queues[usuario_id].put_nowait({'nuevo': True})
        except queue.Full:
            pass