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
    
    vendedor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='ventas')
    fecha_elaboracion = models.DateTimeField(auto_now_add=True)
    fecha_entrega_prevista = models.DateTimeField(blank=True, null=True)
    fecha_entrega_real = models.DateTimeField(blank=True, null=True)
    
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
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
    fecha = models.DateTimeField(auto_now_add=True)
    comprobante = models.ImageField(upload_to='comprobantes/', blank=True, null=True)
    observaciones = models.TextField(blank=True, null=True)
    registrado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = 'Amortización de Crédito'
        verbose_name_plural = 'Amortizaciones de Créditos'
        ordering = ['-fecha']
    
    def __str__(self):
        return f"{self.venta.codigo} - S/ {self.monto}"
