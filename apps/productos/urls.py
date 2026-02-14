from django.urls import path
from . import views

urlpatterns = [
    # Listado y gestión de productos
    path('', views.listar_productos, name='listar_productos'),
    path('crear/', views.crear_producto, name='crear_producto'),
    path('<int:id>/obtener/', views.obtener_producto, name='obtener_producto'),
    path('<int:id>/editar/', views.editar_producto, name='editar_producto'),
    path('<int:id>/editar-precio/', views.editar_precio_producto, name='editar_precio_producto'),
    path('<int:id>/eliminar/', views.eliminar_producto, name='eliminar_producto'),
    path('<int:id>/historial/', views.historial_producto, name='historial_producto'),
    
    # Productos dañados
    path('danados/', views.listar_danados, name='listar_danados'),
    path('danados/registrar/', views.registrar_danado, name='registrar_danado'),
]
