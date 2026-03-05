from django.contrib import admin
from .models import Vendedor


@admin.register(Vendedor)
class VendedorAdmin(admin.ModelAdmin):
    list_display = ('nombre_completo', 'cedula', 'ubicacion', 'telefono', 'estado', 'fecha_creacion')
    list_filter = ('estado', 'almacen', 'tienda', 'fecha_creacion')
    search_fields = ('nombre', 'apellido', 'cedula', 'email', 'telefono')
    readonly_fields = ('fecha_creacion', 'fecha_actualizacion', 'creado_por')
    
    fieldsets = (
        ('Información Personal', {
            'fields': ('nombre', 'apellido', 'cedula', 'email', 'telefono', 'direccion')
        }),
        ('Asignación', {
            'fields': ('almacen', 'tienda', 'comision')
        }),
        ('Estado', {
            'fields': ('estado',)
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
