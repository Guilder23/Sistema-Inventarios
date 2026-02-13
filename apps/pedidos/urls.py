from django.urls import path
from . import views

urlpatterns = [
    # Pedidos
    path('', views.listar_pedidos, name='listar_pedidos'),
    path('crear/', views.crear_pedido, name='crear_pedido'),
    path('<int:id>/ver/', views.ver_pedido, name='ver_pedido'),
    path('<int:id>/aceptar/', views.aceptar_pedido, name='aceptar_pedido'),
    path('<int:id>/cancelar/', views.cancelar_pedido, name='cancelar_pedido'),
]
