# The above classes define models for managing sales transactions, including details of sales, credit
# amortizations, and sale cancellation requests.
from django.db import models
from django.contrib.auth.models import User
from apps.productos.models import Producto
from apps.usuarios.models import PerfilUsuario

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
    )
    
    codigo = models.CharField(max_length=50, unique=True)
    ubicacion = models.ForeignKey(PerfilUsuario, on_delete=models.CASCADE)
    cliente = models.CharField(max_length=200)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    razon_social = models.CharField(max_length=200, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    
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
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    class Meta:
        verbose_name = 'Venta'
        verbose_name_plural = 'Ventas'
        ordering = ['-fecha_elaboracion']
    
    def __str__(self):
        return f"{self.codigo} - {self.cliente}"


class DetalleVenta(models.Model):
    """Detalle de productos en la venta"""
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.IntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        verbose_name = 'Detalle de Venta'
        verbose_name_plural = 'Detalles de Ventas'
    
    def __str__(self):
        return f"{self.producto.nombre} - {self.cantidad}"


class AmortizacionCredito(models.Model):
    """Amortizaciones para ventas a crédito"""
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='amortizaciones')
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    moneda = models.CharField(max_length=10, choices=[('BOB', 'Bolivianos'), ('USD', 'Dólares')], default='BOB', help_text='Moneda en la que se realiza la amortización')
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
