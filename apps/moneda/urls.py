from django.urls import path
from . import views

# app_name = 'moneda' 

urlpatterns = [
    path('', views.listar_monedas, name='listar_monedas'),
    # ESTA ES LA LÍNEA QUE FALTA:
    path('crear/', views.crear_moneda, name='crear_moneda'), 
    
    path('eliminar/<int:pk>/', views.eliminar_moneda, name='eliminar_moneda'),
    path('editar/<int:pk>/', views.editar_moneda, name='editar_moneda'),
]