"""Utilidades para crear notificaciones"""
from .models import Notificacion
from django.contrib.auth.models import User
from apps.usuarios.models import PerfilUsuario

def crear_notificacion(usuario, tipo, titulo, mensaje, url=None):
    """
    Crear una notificación para un usuario específico
    
    Args:
        usuario: Usuario destinatario de la notificación
        tipo: Tipo de notificación (producto_creado, producto_editado, etc)
        titulo: Título de la notificación
        mensaje: Mensaje de la notificación
        url: URL opcional para redirigir
    """
    try:
        Notificacion.objects.create(
            usuario=usuario,
            tipo=tipo,
            titulo=titulo,
            mensaje=mensaje,
            url=url
        )
        return True
    except Exception as e:
        print(f"Error al crear notificación: {str(e)}")
        return False

def notificar_administrador_producto(tipo, titulo, mensaje, url=None):
    """
    Enviar notificación a todos los administradores sobre acción de producto
    
    Args:
        tipo: Tipo de notificación (producto_creado, producto_editado, producto_eliminado)
        titulo: Título del evento
        mensaje: Descripción del evento
        url: URL opcional
    """
    try:
        # Obtener todos los administradores
        administradores = User.objects.filter(is_staff=True) | User.objects.filter(is_superuser=True)
        
        for admin in administradores:
            crear_notificacion(admin, tipo, titulo, mensaje, url)
        
        return True
    except Exception as e:
        print(f"Error al notificar administradores: {str(e)}")
        return False

def notificar_almacen_precio(titulo, mensaje, url=None):
    """
    Enviar notificación al personal del almacén sobre cambio de precio
    
    Args:
        titulo: Título del evento
        mensaje: Descripción del evento
        url: URL opcional
    """
    try:
        # Obtener todos los usuarios del almacén
        almacen_users = PerfilUsuario.objects.filter(rol='almacen').values_list('usuario', flat=True)
        usuarios_almacen = User.objects.filter(id__in=almacen_users)
        
        for user in usuarios_almacen:
            crear_notificacion(user, 'precio_modificado', titulo, mensaje, url)
        
        return True
    except Exception as e:
        print(f"Error al notificar almacén: {str(e)}")
        return False
