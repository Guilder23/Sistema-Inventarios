from django.urls import path
from . import views

app_name = 'tiendas'

urlpatterns = [
    path('', views.listar_tiendas, name='listar'),
    path('crear/', views.crear_tienda, name='crear'),
    path('editar/<int:pk>/', views.editar_tienda, name='editar'),
    path('cambiar-estado/<int:pk>/', views.cambiar_estado_tienda, name='cambiar_estado'),
    path('obtener/<int:pk>/', views.obtener_tienda, name='obtener'),
]
