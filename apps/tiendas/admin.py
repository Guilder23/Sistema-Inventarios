from django.contrib import admin
from .models import Tienda

@admin.register(Tienda)
class TiendaAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre', 'tipo', 'almacen', 'ciudad', 'estado', 'fecha_creacion')
    list_filter = ('estado', 'tipo', 'almacen', 'ciudad', 'fecha_creacion')
    search_fields = ('nombre', 'codigo', 'ciudad', 'direccion', 'almacen__nombre')
    readonly_fields = ('creado_por', 'fecha_creacion', 'fecha_actualizacion')
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'codigo', 'descripcion', 'tipo', 'almacen', 'estado')
        }),
        ('Ubicación', {
            'fields': ('direccion', 'ciudad', 'departamento', 'pais', 'codigo_postal', 'coordenadas')
        }),
        ('Contacto', {
            'fields': ('telefono', 'email')
        }),
        ('Detalles Operativos', {
            'fields': ('area_m2', 'horario_apertura', 'horario_cierre', 'fecha_apertura')
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
