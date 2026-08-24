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

    @property
    def url_valido(self):
        """Devuelve una URL corregida para evitar errores 404 o redirigir con búsqueda"""
        if not self.url or self.url == '#':
            return '#'
        
        import re
        
        # Caso 1: /productos/<id>/ que da 404
        match_prod_id = re.match(r'^/productos/(\d+)/$', self.url)
        if match_prod_id:
            from apps.productos.models import Producto
            try:
                producto = Producto.objects.get(id=int(match_prod_id.group(1)))
                return f'/productos/?buscar={producto.codigo}'
            except Exception:
                return '/productos/'
                
        # Caso 2: /productos/ simple, pero queremos buscar el producto específico si el mensaje tiene el código o el nombre
        if self.url == '/productos/':
            # Intentar extraer el código del mensaje: (código: F009)
            match_codigo = re.search(r'\(código:\s*([^)]+)\)', self.mensaje)
            if match_codigo:
                return f'/productos/?buscar={match_codigo.group(1).strip()}'
                
            # Intentar extraer el nombre del producto entre comillas dobles: producto "PORT"
            match_nombre = re.search(r'producto\s+"([^"]+)"', self.mensaje)
            if match_nombre:
                return f'/productos/?buscar={match_nombre.group(1).strip()}'
                
        return self.url
