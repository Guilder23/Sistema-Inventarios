from django.db import models
from django.contrib.auth.models import User

class Notificacion(models.Model):
    """Notificaciones del sistema"""
    TIPOS = (
        ('pedido', 'Pedido Recibido'),
        ('traspaso', 'Estado de Traspaso'),
        ('stock_critico', 'Stock Crítico'),
        ('stock_bajo', 'Stock Bajo'),
        ('venta', 'Venta Recibida'),
        ('producto_creado', 'Producto Creado'),
        ('producto_editado', 'Producto Editado'),
        ('producto_eliminado', 'Producto Eliminado'),
        ('precio_modificado', 'Precio Modificado'),
        ('general', 'General'),
    )
    
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notificaciones')
    tipo = models.CharField(max_length=20, choices=TIPOS)
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    leida = models.BooleanField(default=False)
    url = models.CharField(max_length=500, blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_lectura = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"{self.titulo} - {self.usuario.username}"
    
    def marcar_como_leida(self):
        """Marca la notificación como leída"""
        if not self.leida:
            from django.utils import timezone
            self.leida = True
            self.fecha_lectura = timezone.now()
            self.save()
