# The above classes define models for managing sales transactions, including details of sales, credit
# amortizations, and sale cancellation requests.
from decimal import Decimal

from django.db import models
from django.contrib.auth.models import User
from django.db.models import Sum, Q
from django.utils import timezone

from apps.productos.models import Producto
from apps.usuarios.models import PerfilUsuario


class SesionCaja(models.Model):
    """Sesión de caja para un cajero y una ubicación dada."""
    ESTADOS = (
        ('ABIERTA', 'Abierta'),
        ('CERRADA', 'Cerrada'),
    )

    cajero = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sesiones_caja')
    ubicacion = models.ForeignKey(PerfilUsuario, on_delete=models.SET_NULL, null=True, blank=True, related_name='sesiones_caja')
    fecha_apertura = models.DateTimeField(auto_now_add=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    monto_inicial = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text='Fondo/cambio base con el que abre la caja')
    monto_inicial_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_efectivo_sistema = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    monto_esperado_efectivo = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    monto_real_efectivo = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    diferencia_efectivo = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_transferencia = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    monto_real_qr = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    diferencia_qr = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_general_recaudado = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_efectivo_sistema_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    monto_esperado_efectivo_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    monto_real_efectivo_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    diferencia_efectivo_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='ABIERTA')
    observaciones = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'ventas_sesioncaja'
        ordering = ['-fecha_apertura']
        verbose_name = 'Sesión de Caja'
        verbose_name_plural = 'Sesiones de Caja'

    def __str__(self):
        return f'Sesión de caja #{self.pk} - {self.cajero.username}'

    def _ventas_efectivo_qs(self, moneda='BOB'):
        return self.ventas.filter(
            Q(monto_efectivo__gt=0) | Q(tipo_pago='contado'),
            estado__in=['pendiente', 'completada'], moneda=moneda,
        )

    def _cobros_efectivo_qs(self, moneda='BOB'):
        return self.amortizaciones.filter(tipo_pago__in=['contado', 'EFECTIVO'], moneda=moneda)

    def _ventas_transferencia_qs(self, moneda='BOB'):
        return self.ventas.filter(monto_qr__gt=0, estado__in=['pendiente', 'completada'], moneda=moneda)

    def _cobros_transferencia_qs(self):
        return self.amortizaciones.none()

    def calcular_resumen(self):
        ventas_efectivo = self._ventas_efectivo_qs('BOB').aggregate(
            total=models.Sum(models.Case(
                models.When(monto_efectivo__gt=0, then='monto_efectivo'),
                models.When(tipo_pago='contado', then='total'),
                default=Decimal('0.00'),
                output_field=models.DecimalField(max_digits=12, decimal_places=2),
            ))
        )['total'] or Decimal('0.00')
        cobros_efectivo = self._cobros_efectivo_qs('BOB').aggregate(total=models.Sum('monto'))['total'] or Decimal('0.00')
        ingresos_manuales = self.movimientos.filter(tipo='INGRESO', moneda='BOB').aggregate(total=models.Sum('monto'))['total'] or Decimal('0.00')
        egresos_manuales = self.movimientos.filter(tipo='EGRESO', moneda='BOB').aggregate(total=models.Sum('monto'))['total'] or Decimal('0.00')
        ventas_efectivo_usd = self._ventas_efectivo_qs('USD').aggregate(
            total=models.Sum(models.Case(
                models.When(monto_efectivo__gt=0, then='monto_efectivo'),
                models.When(tipo_pago='contado', then='total'),
                default=Decimal('0.00'),
                output_field=models.DecimalField(max_digits=12, decimal_places=2),
            ))
        )['total'] or Decimal('0.00')
        cobros_efectivo_usd = self._cobros_efectivo_qs('USD').aggregate(total=models.Sum('monto'))['total'] or Decimal('0.00')
        ingresos_manuales_usd = self.movimientos.filter(tipo='INGRESO', moneda='USD').aggregate(total=models.Sum('monto'))['total'] or Decimal('0.00')
        egresos_manuales_usd = self.movimientos.filter(tipo='EGRESO', moneda='USD').aggregate(total=models.Sum('monto'))['total'] or Decimal('0.00')
        ventas_transferencia = self._ventas_transferencia_qs('BOB').aggregate(total=models.Sum('monto_qr'))['total'] or Decimal('0.00')
        cobros_transferencia = self._cobros_transferencia_qs().aggregate(total=models.Sum('monto'))['total'] or Decimal('0.00')

        monto_esperado = (
            Decimal(str(self.monto_inicial))
            + ventas_efectivo
            + cobros_efectivo
            + ingresos_manuales
            - egresos_manuales
        )
        monto_esperado_usd = Decimal(str(self.monto_inicial_usd)) + ventas_efectivo_usd + cobros_efectivo_usd + ingresos_manuales_usd - egresos_manuales_usd

        total_transferencia = ventas_transferencia + cobros_transferencia

        return {
            'ventas_efectivo': Decimal(str(ventas_efectivo)).quantize(Decimal('0.01')),
            'cobros_efectivo': Decimal(str(cobros_efectivo)).quantize(Decimal('0.01')),
            'ingresos_manuales': Decimal(str(ingresos_manuales)).quantize(Decimal('0.01')),
            'egresos_manuales': Decimal(str(egresos_manuales)).quantize(Decimal('0.01')),
            'monto_esperado_efectivo': Decimal(str(monto_esperado)).quantize(Decimal('0.01')),
            'total_transferencia': Decimal(str(total_transferencia)).quantize(Decimal('0.01')),
            'total_qr': Decimal(str(total_transferencia)).quantize(Decimal('0.01')),
            'ventas_efectivo_usd': Decimal(str(ventas_efectivo_usd)).quantize(Decimal('0.01')),
            'cobros_efectivo_usd': Decimal(str(cobros_efectivo_usd)).quantize(Decimal('0.01')),
            'ingresos_manuales_usd': Decimal(str(ingresos_manuales_usd)).quantize(Decimal('0.01')),
            'egresos_manuales_usd': Decimal(str(egresos_manuales_usd)).quantize(Decimal('0.01')),
            'monto_esperado_efectivo_usd': Decimal(str(monto_esperado_usd)).quantize(Decimal('0.01')),
        }

    def cerrar(self, monto_real_efectivo, monto_real_efectivo_usd=Decimal('0.00'), observaciones=None, monto_real_qr=Decimal('0.00')):
        resumen = self.calcular_resumen()
        self.total_efectivo_sistema = resumen['ventas_efectivo'] + resumen['cobros_efectivo']
        self.monto_esperado_efectivo = resumen['monto_esperado_efectivo']
        self.monto_real_efectivo = Decimal(str(monto_real_efectivo)).quantize(Decimal('0.01'))
        self.diferencia_efectivo = self.monto_real_efectivo - self.monto_esperado_efectivo
        self.total_transferencia = resumen['total_transferencia']
        self.monto_real_qr = Decimal(str(monto_real_qr)).quantize(Decimal('0.01'))
        self.diferencia_qr = self.monto_real_qr - self.total_transferencia
        self.total_general_recaudado = self.monto_real_efectivo + self.monto_real_qr
        self.total_efectivo_sistema_usd = resumen['ventas_efectivo_usd'] + resumen['cobros_efectivo_usd']
        self.monto_esperado_efectivo_usd = resumen['monto_esperado_efectivo_usd']
        self.monto_real_efectivo_usd = Decimal(str(monto_real_efectivo_usd)).quantize(Decimal('0.01'))
        self.diferencia_efectivo_usd = self.monto_real_efectivo_usd - self.monto_esperado_efectivo_usd
        self.estado = 'CERRADA'
        self.fecha_cierre = timezone.now()
        self.observaciones = observaciones or self.observaciones
        self.save(update_fields=[
            'total_efectivo_sistema',
            'monto_esperado_efectivo',
            'monto_real_efectivo',
            'diferencia_efectivo',
            'total_transferencia',
            'monto_real_qr',
            'diferencia_qr',
            'total_general_recaudado',
            'total_efectivo_sistema_usd', 'monto_esperado_efectivo_usd',
            'monto_real_efectivo_usd', 'diferencia_efectivo_usd',
            'estado',
            'fecha_cierre',
            'observaciones',
        ])
        return self


class MovimientoCaja(models.Model):
    """Ingreso o egreso discrecional de dinero de la caja."""
    TIPOS = (
        ('INGRESO', 'Ingreso de Dinero'),
        ('EGRESO', 'Salida/Gasto de Dinero'),
    )

    sesion_caja = models.ForeignKey(SesionCaja, on_delete=models.CASCADE, related_name='movimientos')
    tipo = models.CharField(max_length=20, choices=TIPOS)
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    moneda = models.CharField(max_length=3, choices=[('BOB', 'Bolivianos'), ('USD', 'Dólares')], default='BOB')
    concepto = models.CharField(max_length=255)
    fecha = models.DateTimeField(auto_now_add=True)
    registrado_por = models.ForeignKey(User, on_delete=models.CASCADE, related_name='movimientos_caja')

    class Meta:
        db_table = 'ventas_movimientocaja'
        ordering = ['-fecha']
        verbose_name = 'Movimiento de Caja'
        verbose_name_plural = 'Movimientos de Caja'

    def __str__(self):
        return f'{self.tipo} - {self.concepto}'


class Venta(models.Model):
    """Registro de ventas"""
    ESTADOS = (
        ('pendiente', 'Pendiente'),
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada'),
        ('anulada', 'Anulada'),
    )
    
    TIPOS_PAGO = (
        ('contado', 'Contado'),
        ('credito', 'Crédito'),
        ('Qr', 'Pago QR'),
        ('Mixto', 'Mixto'),
    )

    TIPOS_DESCUENTO = (
        ('ninguno', 'Sin descuento'),
        ('fijo', 'Monto fijo'),
        ('porcentaje', 'Porcentaje'),
    )
    
    codigo = models.CharField(max_length=50, unique=True)
    ubicacion = models.ForeignKey(PerfilUsuario, on_delete=models.CASCADE)
    sesion_caja = models.ForeignKey('SesionCaja', on_delete=models.SET_NULL, null=True, blank=True, related_name='ventas')
    cliente = models.CharField(max_length=200)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    razon_social = models.CharField(max_length=200, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    comentario = models.TextField(blank=True, null=True)
    
    tipo_pago = models.CharField(max_length=20, choices=TIPOS_PAGO, default='contado')
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    
    moneda = models.CharField(max_length=10, choices=[('BOB', 'Bolivianos'), ('USD', 'Dólares')], default='BOB', help_text='Moneda en la que se realizó la venta')
    tipo_cambio = models.DecimalField(max_digits=10, decimal_places=4, default=1.0, help_text='Tipo de cambio USD/BOB usado en la venta')
    
    vendedor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='ventas')
    fecha_elaboracion = models.DateTimeField(auto_now_add=True)
    fecha_entrega_prevista = models.DateTimeField(blank=True, null=True)
    fecha_entrega_real = models.DateTimeField(blank=True, null=True)
    
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    descuento = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='Descuento en valor monetario (solo para tiendas)')
    descuento_tipo = models.CharField(max_length=20, choices=TIPOS_DESCUENTO, default='ninguno')
    descuento_valor = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='Valor original del descuento ingresado por el usuario')
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    monto_efectivo = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    monto_qr = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    #total comision de transporte
    total_comision_transporte = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='Total de comisión de transporte (si aplica)')
    class Meta:
        verbose_name = 'Venta'
        verbose_name_plural = 'Ventas'
        ordering = ['-fecha_elaboracion']
    
    def __str__(self):
        return f"{self.codigo} - {self.cliente}"


class DetalleVenta(models.Model):
    """Detalle de productos en la venta"""
    TIPOS_VENDEDOR = (
        ('', 'Sin especificar'),
        ('almacen', 'Almacén'),
        ('tienda', 'Tienda'),
        ('deposito', 'Depósito'),
    )

    MODALIDADES = (
        ('unidad', 'Unidad'),
        ('caja', 'Caja'),
        ('mayor', 'Mayor'),
    )

    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.IntegerField()
    cantidad_cajas = models.IntegerField(default=0)
    tipo_vendedor = models.CharField(max_length=20, choices=TIPOS_VENDEDOR, default='', blank=True)
    modalidad = models.CharField(max_length=20, choices=MODALIDADES, default='unidad', blank=True)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    comision_transporte = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='Comisión de transporte (si aplica)')
    
    class Meta:
        verbose_name = 'Detalle de Venta'
        verbose_name_plural = 'Detalles de Ventas'
    
    def __str__(self):
        return f"{self.producto.nombre} - {self.cantidad}"


class AmortizacionCredito(models.Model):
    """Amortizaciones para ventas a crédito"""
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='amortizaciones')
    sesion_caja = models.ForeignKey('SesionCaja', on_delete=models.SET_NULL, null=True, blank=True, related_name='amortizaciones')
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    moneda = models.CharField(max_length=10, choices=[('BOB', 'Bolivianos'), ('USD', 'Dólares')], default='BOB', help_text='Moneda en la que se realiza la amortización')
    tipo_pago = models.CharField(max_length=20, choices=[('contado', 'Contado'), ('credito', 'Crédito')], default='contado')
    fecha = models.DateTimeField(auto_now_add=True)
    comprobante = models.ImageField(upload_to='comprobantes/', null=False, blank=False, help_text='Fotografía del comprobante de amortización (obligatoria)')
    observaciones = models.TextField(blank=True, null=True)
    registrado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = 'Amortización de Crédito'
        verbose_name_plural = 'Amortizaciones de Créditos'
        ordering = ['-fecha']
    
    def __str__(self):
        return f"{self.venta.codigo} - S/ {self.monto}"


class SolicitudAnulacionVenta(models.Model):
    """Solicitud de anulación de venta (enviada por tiendas a almacén)"""
    ESTADOS = (
        ('pendiente', 'Pendiente'),
        ('aceptada', 'Aceptada'),
        ('rechazada', 'Rechazada'),
    )
    
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='solicitudes_anulacion')
    solicitado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='solicitudes_anulacion_creadas')
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    comentario = models.TextField(help_text='Motivo de la solicitud de anulación')
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_respuesta = models.DateTimeField(blank=True, null=True)
    respondido_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='solicitudes_anulacion_respondidas')
    comentario_respuesta = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Solicitud de Anulación de Venta'
        verbose_name_plural = 'Solicitudes de Anulación de Ventas'
        ordering = ['-fecha_solicitud']
    
    def __str__(self):
        return f"Solicitud anulación {self.venta.codigo} - {self.get_estado_display()}"
