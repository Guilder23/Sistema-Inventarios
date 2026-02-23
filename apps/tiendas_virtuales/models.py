from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class TiendaVirtual(models.Model):
    """Modelo para gestión de tiendas virtuales/online"""
    
    ESTADO_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('mantenimiento', 'En Mantenimiento'),
        ('desarrollo', 'En Desarrollo'),
    ]
    
    PLATAFORMA_CHOICES = [
        ('propia', 'Plataforma Propia'),
        ('shopify', 'Shopify'),
        ('woocommerce', 'WooCommerce'),
        ('magento', 'Magento'),
        ('prestashop', 'PrestaShop'),
        ('otra', 'Otra'),
    ]
    
    nombre = models.CharField(max_length=200, unique=True, verbose_name='Nombre de la Tienda Virtual')
    codigo = models.CharField(max_length=50, unique=True, verbose_name='Código')
    descripcion = models.TextField(blank=True, null=True, verbose_name='Descripción')
    
    # Información web
    url = models.URLField(max_length=300, unique=True, verbose_name='URL de la Tienda')
    dominio = models.CharField(max_length=200, verbose_name='Dominio')
    plataforma = models.CharField(max_length=20, choices=PLATAFORMA_CHOICES, default='propia',
                                 verbose_name='Plataforma')
    
    # Configuración técnica
    version_plataforma = models.CharField(max_length=50, blank=True, null=True, 
                                         verbose_name='Versión de Plataforma')
    servidor_hosting = models.CharField(max_length=200, blank=True, null=True, 
                                       verbose_name='Servidor de Hosting')
    certificado_ssl = models.BooleanField(default=True, verbose_name='Certificado SSL')
    
    # Contacto
    email_soporte = models.EmailField(verbose_name='Email de Soporte')
    email_ventas = models.EmailField(blank=True, null=True, verbose_name='Email de Ventas')
    telefono = models.CharField(max_length=20, blank=True, null=True, verbose_name='Teléfono')
    
    # Redes sociales
    facebook_url = models.URLField(max_length=300, blank=True, null=True, verbose_name='Facebook')
    instagram_url = models.URLField(max_length=300, blank=True, null=True, verbose_name='Instagram')
    twitter_url = models.URLField(max_length=300, blank=True, null=True, verbose_name='Twitter')
    
    # Configuración de negocio
    moneda = models.CharField(max_length=10, default='COP', verbose_name='Moneda')
    idioma = models.CharField(max_length=10, default='es', verbose_name='Idioma')
    zona_horaria = models.CharField(max_length=50, default='America/Bogota', 
                                   verbose_name='Zona Horaria')
    
    # Estado y seguimiento
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='desarrollo', 
                             verbose_name='Estado')
    fecha_lanzamiento = models.DateField(blank=True, null=True, verbose_name='Fecha de Lanzamiento')
    
    # Auditoría
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, 
                                   related_name='tiendas_virtuales_creadas', 
                                   verbose_name='Creado por')
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')
    fecha_actualizacion = models.DateTimeField(auto_now=True, verbose_name='Última Actualización')
    
    class Meta:
        verbose_name = 'Tienda Virtual'
        verbose_name_plural = 'Tiendas Virtuales'
        ordering = ['-fecha_creacion']
        db_table = 'tiendas_virtuales'
    
    def __str__(self):
        return f"{self.codigo} - {self.nombre}"
    
    @property
    def esta_activo(self):
        """Verifica si la tienda virtual está activa"""
        return self.estado == 'activo'
    
    @property
    def url_completa(self):
        """Retorna la URL completa con protocolo"""
        if self.url.startswith('http'):
            return self.url
        return f"https://{self.url}"
