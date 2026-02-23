from django.contrib import admin
from .models import Tienda

@admin.register(Tienda)
class TiendaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tipo', 'almacen', 'ciudad', 'estado', 'fecha_creacion')
    list_filter = ('estado', 'tipo', 'almacen', 'ciudad', 'fecha_creacion')
    search_fields = ('nombre', 'ciudad', 'direccion', 'almacen__nombre')
    readonly_fields = ('creado_por', 'fecha_creacion', 'fecha_actualizacion')
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'descripcion', 'tipo', 'almacen', 'estado')
        }),
        ('Ubicación', {
            'fields': ('direccion', 'ciudad', 'departamento', 'coordenadas')
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
