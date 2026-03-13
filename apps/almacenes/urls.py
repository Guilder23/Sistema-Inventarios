from django.urls import path
from . import views

app_name = 'almacenes'

urlpatterns = [
    path('', views.listar_almacenes, name='listar'),
    path('crear/', views.crear_almacen, name='crear'),
    path('<int:pk>/obtener/', views.obtener_almacen, name='obtener'),
    path('<int:pk>/editar/', views.editar_almacen, name='editar'),
    path('<int:pk>/cambiar-estado/', views.cambiar_estado_almacen, name='cambiar_estado'),
]
