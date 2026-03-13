from django.contrib import admin
from .models import Devolucion


@admin.register(Devolucion)
class DevolucionAdmin(admin.ModelAdmin):
    list_display = ('id', 'producto', 'ubicacion', 'cantidad', 'cantidad_recuperada', 'cantidad_repuesta', 'estado', 'fecha_registro')
    list_filter = ('estado', 'fecha_registro', 'ubicacion')
    search_fields = ('producto__nombre', 'producto__codigo', 'comentario')
    readonly_fields = ('fecha_registro', 'registrado_por')
    
    fieldsets = (
        ('Información General', {
            'fields': ('producto', 'ubicacion', 'cantidad', 'estado')
        }),
        ('Recuperación', {
            'fields': ('cantidad_recuperada', 'cantidad_repuesta')
        }),
        ('Detalles', {
            'fields': ('comentario', 'foto', 'registrado_por', 'fecha_registro')
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.registrado_por = request.user
        super().save_model(request, obj, form, change)
