from django.contrib import admin
from .models import Almacen

@admin.register(Almacen)
class AlmacenAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre', 'ciudad', 'departamento', 'estado', 'total_tiendas', 'fecha_creacion')
    list_filter = ('estado', 'ciudad', 'departamento', 'fecha_creacion')
    search_fields = ('nombre', 'codigo', 'ciudad', 'direccion')
    readonly_fields = ('creado_por', 'fecha_creacion', 'fecha_actualizacion')
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'codigo', 'descripcion', 'estado')
        }),
        ('Ubicación', {
            'fields': ('direccion', 'ciudad', 'departamento', 'pais', 'codigo_postal')
        }),
        ('Contacto', {
            'fields': ('telefono', 'email')
        }),
        ('Capacidad', {
            'fields': ('capacidad_m2', 'capacidad_productos')
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
