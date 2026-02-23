from django.contrib import admin
from .models import TiendaVirtual

@admin.register(TiendaVirtual)
class TiendaVirtualAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre', 'dominio', 'plataforma', 'estado', 'certificado_ssl', 'fecha_creacion')
    list_filter = ('estado', 'plataforma', 'certificado_ssl', 'moneda', 'fecha_creacion')
    search_fields = ('nombre', 'codigo', 'dominio', 'url')
    readonly_fields = ('creado_por', 'fecha_creacion', 'fecha_actualizacion')
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'codigo', 'descripcion', 'estado')
        }),
        ('Configuración Web', {
            'fields': ('url', 'dominio', 'plataforma', 'version_plataforma', 'servidor_hosting', 'certificado_ssl')
        }),
        ('Contacto', {
            'fields': ('email_soporte', 'email_ventas', 'telefono')
        }),
        ('Redes Sociales', {
            'fields': ('facebook_url', 'instagram_url', 'twitter_url')
        }),
        ('Configuración Regional', {
            'fields': ('moneda', 'idioma', 'zona_horaria')
        }),
        ('Fechas', {
            'fields': ('fecha_lanzamiento',)
        }),
        ('Auditoría', {
            'fields': ('creado_por', 'fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.creado_por = request.user
        super().save_model(request, obj, form, change)
