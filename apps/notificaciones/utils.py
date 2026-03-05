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

def crear_notificacion_realtime(usuario, tipo, titulo, mensaje, url=None):
    """
    Args:
        usuario: Usuario destinatario
        tipo: Tipo de notificación
        titulo: Título
        mensaje: Mensaje
        url: URL opcional (por ahora? xd)
    """
    try:
        notif = Notificacion.objects.create(
            usuario=usuario,
            tipo=tipo,
            titulo=titulo,
            mensaje=mensaje,
            url=url
        )
        
        # Disparar en tiempo real
        from .views import disparar_notificacion_realtime
        disparar_notificacion_realtime(usuario.id)
        
        return True
    except Exception as e:
        print(f"Error al crear notificación realtime: {str(e)}")
        return False

def crear_notificacion_venta(usuario, codigo_venta, cliente, monto, tipo_pago, url=None):
    """
    Args:
        usuario: Usuario destinatario
        codigo_venta: Código de la venta
        cliente: Nombre del cliente
        monto: Monto de la venta
        tipo_pago: 'contado' o 'credito'
        url: URL a detalles de venta
    """
    tipo_pago_display = "al contado" if tipo_pago == "contado" else "a crédito"
    
    titulo = 'Nueva Venta Registrada'
    mensaje = f'Venta {codigo_venta} de ${monto:.2f} de {cliente} ({tipo_pago_display}).'
    
    return crear_notificacion_realtime(usuario, 'venta', titulo, mensaje, url)

def crear_notificacion_traspaso(usuario, codigo_traspaso, almacen_origen, almacen_destino, estado, url=None):
    """
    Args:
        usuario: Usuario destinatario
        codigo_traspaso: Código del traspaso
        almacen_origen: Almacén origen
        almacen_destino: Almacén destino
        estado: 'completado', 'cancelado', o 'pendiente'
        url: URL a detalles del traspaso
    """
    titulos = {
        'completado': 'Traspaso Completado',
        'cancelado': 'Traspaso Cancelado',
        'pendiente': 'Nuevo Traspaso Pendiente',
    }
    
    mensajes = {
        'completado': f'El traspaso {codigo_traspaso} de {almacen_origen} a {almacen_destino} se completó.',
        'cancelado': f'El traspaso {codigo_traspaso} de {almacen_origen} a {almacen_destino} fue cancelado.',
        'pendiente': f'Nuevo traspaso {codigo_traspaso} pendiente de {almacen_origen} a {almacen_destino}.',
    }
    
    titulo = titulos.get(estado, 'Actualización de Traspaso')
    mensaje = mensajes.get(estado, f'El traspaso {codigo_traspaso} tiene una actualización.')
    
    return crear_notificacion_realtime(usuario, 'traspaso', titulo, mensaje, url)