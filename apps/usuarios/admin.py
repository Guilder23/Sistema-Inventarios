from django.contrib import admin
from .models import PerfilUsuario

@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin):
    list_display = ['nombre_ubicacion', 'rol', 'encargado', 'activo', 'fecha_creacion']
    list_filter = ['rol', 'activo']
    search_fields = ['nombre_ubicacion', 'encargado', 'usuario__username']
    list_per_page = 20
