from django.contrib import admin
from .models import Deposito

@admin.register(Deposito)
class DepositoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tipo', 'tienda', 'ciudad', 'estado', 'fecha_creacion')
    list_filter = ('estado', 'tipo', 'tienda', 'ciudad', 'fecha_creacion')
    search_fields = ('nombre', 'ciudad', 'direccion', 'tienda__nombre')
    readonly_fields = ('creado_por', 'fecha_creacion', 'fecha_actualizacion')
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'descripcion', 'tipo', 'tienda', 'estado')
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
