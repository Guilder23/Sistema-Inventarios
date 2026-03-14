from decimal import Decimal
from apps.moneda.models import TipoCambio


def obtener_tipo_cambio_usd():
    try:
        tc = TipoCambio.objects.filter(moneda='USD', activo=True).order_by('-fecha').first()

        if tc:
            return tc.valor

        tc = TipoCambio.objects.filter(moneda='USD').order_by('-fecha').first()
        return tc.valor if tc else Decimal('6.96')

    except Exception:
        return Decimal('6.96')


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


def stock_en_cajas(producto):

    producto.stock_cajas = (
        producto.stock / producto.unidades_por_caja
        if producto.unidades_por_caja else Decimal('0')
    )

    return producto