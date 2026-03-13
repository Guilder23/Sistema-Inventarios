from django.urls import path
from . import views

urlpatterns = [
    path('', views.listar_vendedores, name='listar_vendedores'),
    path('crear/', views.crear_vendedor, name='crear_vendedor'),
    path('obtener/<int:id>/', views.obtener_vendedor, name='obtener_vendedor'),
    path('editar/<int:id>/', views.editar_vendedor, name='editar_vendedor'),
    path('eliminar/<int:id>/', views.eliminar_vendedor, name='eliminar_vendedor'),
    path('tiendas-por-almacen/<int:almacen_id>/', views.obtener_tiendas_por_almacen, name='tiendas_por_almacen'),
]
