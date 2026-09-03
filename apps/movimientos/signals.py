"""
Signals para registrar automáticamente movimientos de stock en MovimientoStock.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.movimientos.models import MovimientoStock


# ──────────────────────────────────────────────────────────────────────────────
# Utilidades
# ──────────────────────────────────────────────────────────────────────────────

def _get_stock_ubicacion(producto, perfil):
    """
    Retorna el stock actual del producto en la ubicación dada.
    - Almacén: stock global (sum de ProductoContenedor)
    - Tienda/Depósito: stock local (Inventario)
    """
    from apps.inventario.models import Inventario

    if perfil.rol == 'almacen':
        return producto.stock
    inv = Inventario.objects.filter(producto=producto, ubicacion=perfil).first()
    return inv.cantidad if inv else 0


def registrar_movimiento(
    *,
    producto,
    ubicacion,
    tipo,
    cantidad,
    stock_anterior,
    stock_actual,
    usuario=None,
    referencia=None,
    notas=None,
):
    """
    Función de utilidad para crear un registro MovimientoStock.
    """
    MovimientoStock.objects.create(
        producto=producto,
        ubicacion=ubicacion,
        tipo=tipo,
        cantidad=cantidad,
        stock_anterior=stock_anterior,
        stock_actual=stock_actual,
        usuario=usuario,
        referencia=referencia,
        notas=notas,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Signal: Ventas — registra cuando se completa o anula una venta
# ──────────────────────────────────────────────────────────────────────────────

@receiver(post_save, sender='ventas.Venta')
def signal_venta(sender, instance, created, **kwargs):
    """
    Registra movimientos de stock cuando una venta se completa o se anula.
    Al momento de guardar la venta, el stock ya fue descontado/ajustado en la BD.
    """
    estado = instance.estado
    if estado not in ('completada', 'anulada'):
        return

    # Si acaba de crearse pero no tiene detalles aún, los detalles se registrarán tras su creación
    if instance.detalles.count() == 0:
        return

    # Evitar registrar movimientos duplicados para la misma venta y estado
    tipo_mov = 'venta' if estado == 'completada' else 'anulacion_venta'
    if MovimientoStock.objects.filter(referencia=instance.codigo, tipo=tipo_mov).exists():
        return

    try:
        perfil = instance.ubicacion
    except Exception:
        return

    signo = -1 if estado == 'completada' else +1

    for detalle in instance.detalles.select_related('producto').all():
        producto = detalle.producto
        stock_despues = _get_stock_ubicacion(producto, perfil)
        cantidad_mov = signo * detalle.cantidad
        # Como el stock ya fue aplicado en la BD, calculamos el stock anterior
        stock_antes = stock_despues - cantidad_mov

        registrar_movimiento(
            producto=producto,
            ubicacion=perfil,
            tipo=tipo_mov,
            cantidad=cantidad_mov,
            stock_anterior=stock_antes,
            stock_actual=stock_despues,
            usuario=instance.vendedor,
            referencia=instance.codigo,
            notas=f'Venta {instance.codigo} — {estado}',
        )


# ──────────────────────────────────────────────────────────────────────────────
# Signal: Traspasos — registra salida en origen y entrada en destino
# ──────────────────────────────────────────────────────────────────────────────

@receiver(post_save, sender='traspasos.Traspaso')
def signal_traspaso(sender, instance, created, **kwargs):
    """
    Registra movimientos cuando un traspaso cambia a estado 'recibido'.
    """
    if instance.estado != 'recibido':
        return

    # Evitar registrar dos veces
    if MovimientoStock.objects.filter(referencia=instance.codigo, tipo='traspaso_salida').exists():
        return

    origen  = instance.origen
    destino = instance.destino
    usuario = instance.aceptado_por or instance.creado_por

    for detalle in instance.detalles.select_related('producto').all():
        producto = detalle.producto

        # Salida del origen (stock ya descontado)
        stock_despues_origen = _get_stock_ubicacion(producto, origen)
        stock_antes_origen = stock_despues_origen + detalle.cantidad
        registrar_movimiento(
            producto=producto,
            ubicacion=origen,
            tipo='traspaso_salida',
            cantidad=-detalle.cantidad,
            stock_anterior=stock_antes_origen,
            stock_actual=stock_despues_origen,
            usuario=usuario,
            referencia=instance.codigo,
            notas=f'Traspaso {instance.codigo} → {destino.nombre_ubicacion or destino}',
        )

        # Entrada al destino (stock ya ingresado)
        stock_despues_destino = _get_stock_ubicacion(producto, destino)
        stock_antes_destino = stock_despues_destino - detalle.cantidad
        registrar_movimiento(
            producto=producto,
            ubicacion=destino,
            tipo='traspaso_entrada',
            cantidad=+detalle.cantidad,
            stock_anterior=stock_antes_destino,
            stock_actual=stock_despues_destino,
            usuario=usuario,
            referencia=instance.codigo,
            notas=f'Traspaso {instance.codigo} ← {origen.nombre_ubicacion or origen}',
        )


# ──────────────────────────────────────────────────────────────────────────────
# Signal: Devoluciones
# ──────────────────────────────────────────────────────────────────────────────

@receiver(post_save, sender='devoluciones.Devolucion')
def signal_devolucion(sender, instance, created, **kwargs):
    if not created:
        return

    perfil   = instance.ubicacion
    producto = instance.producto
    stock_actual = _get_stock_ubicacion(producto, perfil)

    registrar_movimiento(
        producto=producto,
        ubicacion=perfil,
        tipo='devolucion',
        cantidad=+instance.cantidad,
        stock_anterior=stock_actual,
        stock_actual=stock_actual,
        usuario=instance.registrado_por,
        referencia=f'DEV-{instance.id}',
        notas=instance.comentario or 'Devolución registrada',
    )


# ──────────────────────────────────────────────────────────────────────────────
# Signal: Productos Dañados — registra salida de stock
# ──────────────────────────────────────────────────────────────────────────────

@receiver(post_save, sender='productos.ProductoDanado')
def signal_danado(sender, instance, created, **kwargs):
    """
    Registra la salida de stock cuando se registra un producto dañado.
    Dado que la vista ya descontó el stock antes de crear ProductoDanado,
    _get_stock_ubicacion() retorna el stock resultante (stock_actual).
    """
    if not created:
        return

    perfil   = instance.ubicacion
    producto = instance.producto
    
    # El stock actual en BD ya tiene la reducción aplicada
    stock_despues = _get_stock_ubicacion(producto, perfil)
    stock_antes = stock_despues + instance.cantidad

    registrar_movimiento(
        producto=producto,
        ubicacion=perfil,
        tipo='danado',
        cantidad=-instance.cantidad,
        stock_anterior=stock_antes,
        stock_actual=stock_despues,
        usuario=instance.registrado_por,
        referencia=f'DAN-{instance.id}',
        notas=instance.comentario or 'Producto dañado registrado',
    )
