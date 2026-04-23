from decimal import Decimal
from apps.moneda.models import TipoCambio


def obtener_tipo_cambio_usd(contexto='general'):
    try:
        tc = TipoCambio.objects.filter(
            moneda='USD',
            contexto=contexto,
            activo=True,
        ).order_by('-fecha', '-id').first()

        if tc:
            return tc.valor

        tc = TipoCambio.objects.filter(
            moneda='USD',
            contexto=contexto,
        ).order_by('-fecha', '-id').first()
        return tc.valor if tc else Decimal('6.96')

    except Exception:
        return Decimal('6.96')


def obtener_contexto_tipo_cambio_perfil(perfil):
    if (
        perfil
        and getattr(perfil, 'rol', '') == 'tienda'
        and getattr(getattr(perfil, 'tienda', None), 'tipo', '') == 'principal'
    ):
        return 'tienda_principal'
    return 'general'


def obtener_tipo_cambio_usd_por_perfil(perfil):
    return obtener_tipo_cambio_usd(obtener_contexto_tipo_cambio_perfil(perfil))


def calcular_precios_usd(producto, valor_dolar):

    producto.precio_caja_usd = (
        producto.precio_caja / valor_dolar
        if producto.precio_caja else Decimal('0')
    )

    producto.precio_unidad_usd = (
        producto.precio_unidad / valor_dolar
        if producto.precio_unidad else Decimal('0')
    )

    producto.precio_mayor_usd = (
        producto.precio_mayor / valor_dolar
        if producto.precio_mayor else Decimal('0')
    )

    return producto


def stock_en_cajas(producto, cantidad=None, target=None):
    """
    Calcula stock en cajas.
    - Si `cantidad` es None, usa producto.stock (global).
    - Si `cantidad` tiene valor, se usa como stock por ubicaciÃ³n (tienda/depÃ³sito).
    - Si `target` se provee, asigna `stock_cajas` en ese objeto; si no, en producto.
    """
    base = producto.stock if cantidad is None else cantidad
    stock_cajas = (
        base / producto.unidades_por_caja
        if producto.unidades_por_caja else Decimal('0')
    )

    destino = target if target is not None else producto
    destino.stock_cajas = stock_cajas
    return destino

def stock_cajas_contenedor(pc):
    """
    Calcula cuántas cajas hay en el contenedor para un producto.
    pc = instancia de ProductoContenedor
    """
    unidades_por_caja = pc.producto.unidades_por_caja

    pc.stock_cajas_contenedor = (
        pc.cantidad_recibida / unidades_por_caja
        if unidades_por_caja else 0
    )

    return pc
