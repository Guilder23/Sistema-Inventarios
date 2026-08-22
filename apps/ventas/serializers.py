from decimal import Decimal

from apps.usuarios.models import PerfilUsuario
from .models import SesionCaja, MovimientoCaja


class BaseCajaSerializer:
    """Validador mínimo sin DRF para la lógica de caja."""

    def __init__(self, data=None, request=None):
        self.data = data or {}
        self.request = request
        self.validated_data = {}
        self.errors = {}

    def is_valid(self):
        self.errors = {}
        return not self.errors


class AperturaCajaSerializer(BaseCajaSerializer):
    """Valida la apertura de una sesión de caja."""

    def is_valid(self):
        user = getattr(self.request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            self.errors['non_field_errors'] = ['Debe iniciar sesión para abrir la caja.']
            return False

        if SesionCaja.objects.filter(cajero=user, estado='ABIERTA').exists():
            self.errors['non_field_errors'] = ['El cajero ya tiene una caja abierta.']
            return False

        monto = self.data.get('monto_inicial', Decimal('0.00'))
        monto_usd = self.data.get('monto_inicial_usd', Decimal('0.00'))
        try:
            monto = Decimal(str(monto))
            monto_usd = Decimal(str(monto_usd))
        except Exception:
            self.errors['monto_inicial'] = ['El monto inicial no es válido.']
            return False

        if monto < Decimal('0.00') or monto_usd < Decimal('0.00'):
            self.errors['monto_inicial'] = ['Los montos iniciales no pueden ser negativos.']
            return False

        self.validated_data = {
            'monto_inicial': monto,
            'monto_inicial_usd': monto_usd,
            # La caja pertenece siempre a la ubicacion del cajero autenticado.
            'ubicacion': getattr(user, 'perfil', None),
        }
        return True

    def save(self):
        user = self.request.user
        return SesionCaja.objects.create(
            cajero=user,
            ubicacion=self.validated_data.get('ubicacion'),
            monto_inicial=self.validated_data.get('monto_inicial', Decimal('0.00')),
            monto_inicial_usd=self.validated_data.get('monto_inicial_usd', Decimal('0.00')),
        )


class MovimientoCajaSerializer(BaseCajaSerializer):
    """Valida un ingreso o egreso manual de caja."""

    def is_valid(self):
        user = getattr(self.request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            self.errors['non_field_errors'] = ['Debe iniciar sesión para registrar el movimiento.']
            return False

        sesion = SesionCaja.objects.filter(cajero=user, estado='ABIERTA').first()
        if not sesion:
            self.errors['non_field_errors'] = ['No existe una caja abierta para este cajero.']
            return False

        monto = self.data.get('monto')
        try:
            monto = Decimal(str(monto))
        except Exception:
            self.errors['monto'] = ['El monto no es válido.']
            return False

        if monto <= Decimal('0.00'):
            self.errors['monto'] = ['El monto debe ser mayor que cero.']
            return False

        tipo = (self.data.get('tipo') or '').upper()
        if tipo not in {'INGRESO', 'EGRESO'}:
            self.errors['tipo'] = ['El tipo debe ser INGRESO o EGRESO.']
            return False
        moneda = (self.data.get('moneda') or 'BOB').upper()
        if moneda not in {'BOB', 'USD'}:
            self.errors['moneda'] = ['La moneda debe ser BOB o USD.']
            return False

        concepto = (self.data.get('concepto') or '').strip()
        if not concepto:
            self.errors['concepto'] = ['Debe indicar el concepto del movimiento.']
            return False

        self.validated_data = {
            'sesion_caja': sesion,
            'tipo': tipo,
            'monto': monto,
            'moneda': moneda,
            'concepto': concepto,
            'registrado_por': user,
        }
        return True

    def save(self):
        return MovimientoCaja.objects.create(**self.validated_data)


class CierreCajaSerializer(BaseCajaSerializer):
    """Valida el cierre de sesión con el monto real contado."""

    def is_valid(self):
        user = getattr(self.request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            self.errors['non_field_errors'] = ['Debe iniciar sesión para cerrar la caja.']
            return False

        sesion = SesionCaja.objects.filter(cajero=user, estado='ABIERTA').first()
        if not sesion:
            self.errors['non_field_errors'] = ['No existe una caja abierta para este cajero.']
            return False

        monto_real = self.data.get('monto_real_efectivo', '0.00')
        monto_real_usd = self.data.get('monto_real_efectivo_usd', '0.00')
        monto_real_qr = self.data.get('monto_real_qr', '0.00')
        try:
            monto_real = Decimal(str(monto_real))
            monto_real_usd = Decimal(str(monto_real_usd))
            monto_real_qr = Decimal(str(monto_real_qr))
        except Exception:
            self.errors['monto_real_efectivo'] = ['Los montos reales no son válidos.']
            return False

        if monto_real < Decimal('0.00') or monto_real_usd < Decimal('0.00') or monto_real_qr < Decimal('0.00'):
            self.errors['monto_real_efectivo'] = ['Los montos reales no pueden ser negativos.']
            return False

        self.validated_data = {
            'sesion_caja': sesion,
            'monto_real_efectivo': monto_real,
            'monto_real_efectivo_usd': monto_real_usd,
            'monto_real_qr': monto_real_qr,
            'observaciones': self.data.get('observaciones'),
        }
        return True

    def save(self):
        return self.validated_data['sesion_caja'].cerrar(
            self.validated_data['monto_real_efectivo'],
            monto_real_efectivo_usd=self.validated_data['monto_real_efectivo_usd'],
            observaciones=self.validated_data.get('observaciones'),
            monto_real_qr=self.validated_data['monto_real_qr'],
        )


class SesionCajaSerializer:
    """Representación simple de una sesión de caja para respuestas JSON."""

    @staticmethod
    def serialize(sesion):
        return {
            'id': sesion.id,
            'cajero': sesion.cajero_id,
            'ubicacion': sesion.ubicacion_id,
            'fecha_apertura': sesion.fecha_apertura.isoformat() if sesion.fecha_apertura else None,
            'fecha_cierre': sesion.fecha_cierre.isoformat() if sesion.fecha_cierre else None,
            'monto_inicial': str(sesion.monto_inicial),
            'monto_inicial_usd': str(sesion.monto_inicial_usd),
            'total_efectivo_sistema': str(sesion.total_efectivo_sistema),
            'monto_esperado_efectivo': str(sesion.monto_esperado_efectivo),
            'monto_real_efectivo': str(sesion.monto_real_efectivo),
            'diferencia_efectivo': str(sesion.diferencia_efectivo),
            'total_transferencia': str(sesion.total_transferencia),
            'total_qr': str(sesion.total_transferencia),
            'monto_real_qr': str(sesion.monto_real_qr),
            'diferencia_qr': str(sesion.diferencia_qr),
            'total_general_recaudado': str(sesion.total_general_recaudado),
            'total_efectivo_sistema_usd': str(sesion.total_efectivo_sistema_usd),
            'monto_esperado_efectivo_usd': str(sesion.monto_esperado_efectivo_usd),
            'monto_real_efectivo_usd': str(sesion.monto_real_efectivo_usd),
            'diferencia_efectivo_usd': str(sesion.diferencia_efectivo_usd),
            'estado': sesion.estado,
            'observaciones': sesion.observaciones,
        }
