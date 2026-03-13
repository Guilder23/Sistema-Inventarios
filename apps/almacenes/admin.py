from django.contrib import admin
from .models import Almacen

@admin.register(Almacen)
class AlmacenAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'ciudad', 'departamento', 'estado', 'total_tiendas', 'fecha_creacion')  # Quitado 'codigo' - No se usa por ahora
    list_filter = ('estado', 'ciudad', 'departamento', 'fecha_creacion')
    search_fields = ('nombre', 'ciudad', 'direccion')  # Quitado 'codigo' de busca - No se usa por ahora
    readonly_fields = ('creado_por', 'fecha_creacion', 'fecha_actualizacion')
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'descripcion', 'estado')  # Quitado 'codigo' - No se usa por ahora
        }),
        ('Ubicación', {
            'fields': ('direccion', 'ciudad', 'departamento')  # Quitado 'pais', 'codigo_postal' - No se usa por ahora
        }),
        ('Contacto', {
            'fields': ('telefono', 'email')
        }),
        # ('Capacidad', {  # Comentado - No se usa por ahora
        #     'fields': ('capacidad_m2', 'capacidad_productos')
        # }),
        ('Auditoría', {
            'fields': ('creado_por', 'fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.creado_por = request.user
        super().save_model(request, obj, form, change)
