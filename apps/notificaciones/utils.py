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


def notificar_destino_traspaso(traspaso):
    """
    Notifica a los usuarios responsables de la ubicación destino de un traspaso.
    """
    try:
        from django.urls import reverse
        destino = traspaso.destino
        url_ver = reverse('ver_traspaso', args=[traspaso.id])
        
        usuarios_a_notificar = []
        
        # 1. Si el destino tiene un usuario directo, notificarlo
        if destino.usuario:
            usuarios_a_notificar.append(destino.usuario)
        
        # 2. Si es tienda o depósito, notificar a todos los usuarios de la tienda asociada
        elif destino.rol in ['tienda', 'deposito'] and destino.tienda:
            tienda_users = PerfilUsuario.objects.filter(
                tienda=destino.tienda, 
                activo=True,
                usuario__isnull=False
            ).select_related('usuario')
            for perfil in tienda_users:
                usuarios_a_notificar.append(perfil.usuario)
                
        # 3. Si es almacén, notificar a todos los usuarios de ese almacén
        elif destino.rol == 'almacen' and destino.almacen:
            almacen_users = PerfilUsuario.objects.filter(
                almacen=destino.almacen,
                activo=True,
                usuario__isnull=False
            ).select_related('usuario')
            for perfil in almacen_users:
                usuarios_a_notificar.append(perfil.usuario)
        
        # Enviar las notificaciones (evitando duplicados)
        usuarios_unicos = set(usuarios_a_notificar)
        for user in usuarios_unicos:
            crear_notificacion(
                usuario=user,
                tipo='traspaso',
                titulo='Nuevo Traspaso Recibido',
                mensaje=f'Se ha enviado un traspaso ({traspaso.codigo}) desde {traspaso.origen.nombre_ubicacion or "otra ubicación"} hacia tu ubicación.',
                url=url_ver
            )
        return True
    except Exception as e:
        print(f"Error al notificar destino de traspaso: {str(e)}")
        return False


def notificar_cambio_estado_traspaso(traspaso, anterior_estado):
    """
    Notifica a los usuarios involucrados cuando el estado de un traspaso cambia.
    """
    try:
        from django.urls import reverse
        url_ver = reverse('ver_traspaso', args=[traspaso.id])
        
        # Si cambia a tránsito (enviado por el origen)
        if traspaso.estado == 'transito':
            destino = traspaso.destino
            usuarios_a_notificar = []
            if destino.usuario:
                usuarios_a_notificar.append(destino.usuario)
            elif destino.rol in ['tienda', 'deposito'] and destino.tienda:
                tienda_users = PerfilUsuario.objects.filter(tienda=destino.tienda, activo=True, usuario__isnull=False).select_related('usuario')
                usuarios_a_notificar.extend([p.usuario for p in tienda_users])
            elif destino.rol == 'almacen' and destino.almacen:
                almacen_users = PerfilUsuario.objects.filter(almacen=destino.almacen, activo=True, usuario__isnull=False).select_related('usuario')
                usuarios_a_notificar.extend([p.usuario for p in almacen_users])
                
            for user in set(usuarios_a_notificar):
                crear_notificacion(
                    usuario=user,
                    tipo='traspaso',
                    titulo='Traspaso en Tránsito',
                    mensaje=f'El traspaso ({traspaso.codigo}) de {traspaso.origen.nombre_ubicacion or "otra ubicación"} ya se encuentra en tránsito.',
                    url=url_ver
                )
                
        # Si cambia a recibido (recibido por el destino)
        elif traspaso.estado == 'recibido':
            if traspaso.creado_por:
                crear_notificacion(
                    usuario=traspaso.creado_por,
                    tipo='traspaso',
                    titulo='Traspaso Recibido',
                    mensaje=f'El traspaso ({traspaso.codigo}) enviado a {traspaso.destino.nombre_ubicacion} ha sido recibido.',
                    url=url_ver
                )
                
        # Si cambia a rechazado (rechazado por el destino)
        elif traspaso.estado == 'rechazado':
            if traspaso.creado_por:
                crear_notificacion(
                    usuario=traspaso.creado_por,
                    tipo='traspaso',
                    titulo='Traspaso Rechazado',
                    mensaje=f'El traspaso ({traspaso.codigo}) enviado a {traspaso.destino.nombre_ubicacion} ha sido rechazado.',
                    url=url_ver
                )
                
        # Si cambia a cancelado (cancelado por el origen)
        elif traspaso.estado == 'cancelado':
            destino = traspaso.destino
            usuarios_a_notificar = []
            if destino.usuario:
                usuarios_a_notificar.append(destino.usuario)
            elif destino.rol in ['tienda', 'deposito'] and destino.tienda:
                tienda_users = PerfilUsuario.objects.filter(tienda=destino.tienda, activo=True, usuario__isnull=False).select_related('usuario')
                usuarios_a_notificar.extend([p.usuario for p in tienda_users])
            elif destino.rol == 'almacen' and destino.almacen:
                almacen_users = PerfilUsuario.objects.filter(almacen=destino.almacen, activo=True, usuario__isnull=False).select_related('usuario')
                usuarios_a_notificar.extend([p.usuario for p in almacen_users])
                
            for user in set(usuarios_a_notificar):
                crear_notificacion(
                    usuario=user,
                    tipo='traspaso',
                    titulo='Traspaso Cancelado',
                    mensaje=f'El traspaso ({traspaso.codigo}) enviado por {traspaso.origen.nombre_ubicacion or "otra ubicación"} ha sido cancelado.',
                    url=url_ver
                )
        return True
    except Exception as e:
        print(f"Error al notificar cambio de estado del traspaso: {str(e)}")
        return False


def notificar_creacion_pedido(pedido):
    """
    Notifica a los usuarios del proveedor que se ha recibido un nuevo pedido.
    """
    try:
        from django.urls import reverse
        url_ver = reverse('ver_pedido', args=[pedido.id])
        
        # Obtener usuarios del proveedor
        proveedor = pedido.proveedor
        usuarios_a_notificar = []
        if proveedor.usuario:
            usuarios_a_notificar.append(proveedor.usuario)
        elif proveedor.rol == 'almacen' and proveedor.almacen:
            almacen_users = PerfilUsuario.objects.filter(almacen=proveedor.almacen, activo=True, usuario__isnull=False).select_related('usuario')
            usuarios_a_notificar.extend([p.usuario for p in almacen_users])
        elif proveedor.rol == 'tienda' and proveedor.tienda:
            tienda_users = PerfilUsuario.objects.filter(tienda=proveedor.tienda, activo=True, usuario__isnull=False).select_related('usuario')
            usuarios_a_notificar.extend([p.usuario for p in tienda_users])
            
        for user in set(usuarios_a_notificar):
            crear_notificacion(
                usuario=user,
                tipo='pedido',
                titulo='Nuevo Pedido Recibido',
                mensaje=f'Se ha recibido un nuevo pedido ({pedido.codigo}) solicitado por {pedido.solicitante.nombre_ubicacion or "otra ubicación"}.',
                url=url_ver
            )
        return True
    except Exception as e:
        print(f"Error al notificar creación de pedido: {str(e)}")
        return False


def notificar_cambio_estado_pedido(pedido, anterior_estado):
    """
    Notifica a los usuarios involucrados cuando el estado de un pedido cambia.
    """
    try:
        from django.urls import reverse
        url_ver = reverse('ver_pedido', args=[pedido.id])
        
        # Funciones auxiliares para obtener destinatarios
        def obtener_usuarios(perfil):
            u = []
            if perfil.usuario:
                u.append(perfil.usuario)
            elif perfil.rol == 'tienda' and perfil.tienda:
                tienda_users = PerfilUsuario.objects.filter(tienda=perfil.tienda, activo=True, usuario__isnull=False).select_related('usuario')
                u.extend([p.usuario for p in tienda_users])
            elif perfil.rol == 'almacen' and perfil.almacen:
                almacen_users = PerfilUsuario.objects.filter(almacen=perfil.almacen, activo=True, usuario__isnull=False).select_related('usuario')
                u.extend([p.usuario for p in almacen_users])
            return set(u)
            
        if pedido.estado == 'aceptado':
            # Notificar al solicitante
            for user in obtener_usuarios(pedido.solicitante):
                crear_notificacion(
                    usuario=user,
                    tipo='pedido',
                    titulo='Pedido Aceptado',
                    mensaje=f'Tu pedido ({pedido.codigo}) ha sido aceptado por {pedido.proveedor.nombre_ubicacion or "el proveedor"}.',
                    url=url_ver
                )
        elif pedido.estado == 'enviado':
            # Notificar al solicitante
            for user in obtener_usuarios(pedido.solicitante):
                crear_notificacion(
                    usuario=user,
                    tipo='pedido',
                    titulo='Pedido Enviado',
                    mensaje=f'Tu pedido ({pedido.codigo}) ha sido enviado por {pedido.proveedor.nombre_ubicacion or "el proveedor"}.',
                    url=url_ver
                )
        elif pedido.estado == 'recibido':
            # Notificar al proveedor
            for user in obtener_usuarios(pedido.proveedor):
                crear_notificacion(
                    usuario=user,
                    tipo='pedido',
                    titulo='Pedido Recibido',
                    mensaje=f'El pedido ({pedido.codigo}) enviado a {pedido.solicitante.nombre_ubicacion or "el cliente"} ha sido recibido.',
                    url=url_ver
                )
        elif pedido.estado == 'cancelado':
            destinatarios = obtener_usuarios(pedido.solicitante) | obtener_usuarios(pedido.proveedor)
            for user in destinatarios:
                crear_notificacion(
                    usuario=user,
                    tipo='pedido',
                    titulo='Pedido Cancelado',
                    mensaje=f'El pedido ({pedido.codigo}) ha sido cancelado.',
                    url=url_ver
                )
        return True
    except Exception as e:
        print(f"Error al notificar cambio de estado del pedido: {str(e)}")
        return False


