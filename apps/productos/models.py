from django.db import models
from django.contrib.auth.models import User

class Producto(models.Model):
    """Modelo de Producto"""
    codigo = models.CharField(max_length=100, unique=True)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    foto = models.ImageField(upload_to='productos/', blank=True, null=True)
    unidades_por_caja = models.IntegerField(default=1)
    
    # Precios (administrador puede configurar todos)
    precio_compra = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    precio_caja = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    precio_mayor = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    precio_unidad = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    poliza = models.DecimalField(max_digits=10, decimal_places=2, default=0, blank=True, null=True)
    gastos = models.DecimalField(max_digits=10, decimal_places=2, default=0, blank=True, null=True)
    
    # Control de stock
    stock = models.IntegerField(default=0, help_text='Cantidad actual en stock')
    stock_critico = models.IntegerField(default=10)
    stock_bajo = models.IntegerField(default=30)
    
    # Auditoría
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='productos_creados')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['nombre']
    
    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class HistorialProducto(models.Model):
    """Historial de cambios en productos"""
    ACCIONES = (
        ('creacion', 'Creación'),
        ('edicion', 'Edición'),
        ('eliminacion', 'Eliminación'),
    )
    
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='historial')
    accion = models.CharField(max_length=20, choices=ACCIONES)
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    detalles = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Historial de Producto'
        verbose_name_plural = 'Historiales de Productos'
        ordering = ['-fecha']
    
    def __str__(self):
        return f"{self.producto.codigo} - {self.get_accion_display()} - {self.fecha}"


class ProductoDanado(models.Model):
    """Registro de productos dañados"""
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    ubicacion = models.ForeignKey('usuarios.PerfilUsuario', on_delete=models.CASCADE)
    cantidad = models.IntegerField()
    comentario = models.TextField()
    foto = models.ImageField(upload_to='danados/', blank=True, null=True)
    registrado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Producto Dañado'
        verbose_name_plural = 'Productos Dañados'
        ordering = ['-fecha_registro']
    
    def __str__(self):
        return f"{self.producto.nombre} - {self.cantidad} unidades"
