"""Utilidades para gestión de tipos de cambio y conversión de monedas"""

from decimal import Decimal
from .models import TipoCambio


def obtener_tipo_cambio_activo():
    """
    Obtiene el tipo de cambio activo más reciente del sistema.
    
    Returns:
        TipoCambio: El tipo de cambio activo
        None: Si no hay tipo de cambio activo
    """
    tipo_cambio = TipoCambio.objects.filter(activo=True).order_by('-fecha', '-id').first()
    if not tipo_cambio:
        # Si no hay activo, obtener el más reciente
        tipo_cambio = TipoCambio.objects.order_by('-fecha', '-id').first()
    return tipo_cambio


def obtener_tasa_cambio_actual():
    """
    Obtiene la tasa de cambio actual (USD -> BOB).
    
    Returns:
        Decimal: La tasa de cambio (ej: 9.98 significa 1 USD = 9.98 BOB)
        None: Si no hay tipo de cambio configurado
    """
    tipo_cambio = obtener_tipo_cambio_activo()
    if tipo_cambio and tipo_cambio.moneda == 'USD':
        return Decimal(str(tipo_cambio.valor))
    return None


def convertir_moneda(monto, moneda_origen, moneda_destino):
    """
    Convierte un monto de una moneda a otra usando el tipo de cambio del sistema.
    
    Args:
        monto (Decimal o float): El monto a convertir
        moneda_origen (str): Código de moneda origen ('USD' o 'BOB')
        moneda_destino (str): Código de moneda destino ('USD' o 'BOB')
    
    Returns:
        Decimal: El monto convertido
        
    Raises:
        ValueError: Si las monedas no son válidas o si no hay tipo de cambio configurado
    """
    # Validar monedas
    monedas_validas = ('USD', 'BOB')
    if moneda_origen not in monedas_validas or moneda_destino not in monedas_validas:
        raise ValueError(f'Monedas válidas: {monedas_validas}')
    
    # Si son iguales, no hay conversión
    if moneda_origen == moneda_destino:
        return Decimal(str(monto))
    
    monto = Decimal(str(monto))
    tasa = obtener_tasa_cambio_actual()
    
    if not tasa:
        raise ValueError('No hay tipo de cambio configurado en el sistema')
    
    # Convertir USD -> BOB: multiplicar por tasa
    # Convertir BOB -> USD: dividir por tasa
    if moneda_origen == 'USD' and moneda_destino == 'BOB':
        return (monto * tasa).quantize(Decimal('0.01'))
    elif moneda_origen == 'BOB' and moneda_destino == 'USD':
        return (monto / tasa).quantize(Decimal('0.01'))
    
    return monto


def obtener_etiqueta_moneda(codigo_moneda):
    """
    Obtiene la etiqueta de moneda para mostrar en la interfaz.
    
    Args:
        codigo_moneda (str): 'USD' o 'BOB'
    
    Returns:
        str: Símbolo o etiqueta de la moneda
    """
    monedas = {
        'USD': '$',
        'BOB': 'Bs.',
    }
    return monedas.get(codigo_moneda, codigo_moneda)
