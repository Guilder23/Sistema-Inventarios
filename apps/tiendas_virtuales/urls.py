from django.urls import path
from . import views

app_name = 'tiendas_virtuales'

urlpatterns = [
    path('', views.listar_tiendas_virtuales, name='listar'),
    path('crear/', views.crear_tienda_virtual, name='crear'),
    path('editar/<int:pk>/', views.editar_tienda_virtual, name='editar'),
    path('cambiar-estado/<int:pk>/', views.cambiar_estado_tienda_virtual, name='cambiar_estado'),
    path('obtener/<int:pk>/', views.obtener_tienda_virtual, name='obtener'),
]
