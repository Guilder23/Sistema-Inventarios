from django.urls import path
from . import views

app_name = 'devoluciones'

urlpatterns = [
    path('', views.listar_devoluciones, name='listar'),
    path('registrar/', views.registrar_devolucion, name='registrar'),
    path('<int:id>/obtener/', views.obtener_devolucion, name='obtener'),
    path('<int:id>/agregar-devolucion/', views.agregar_mas_devolucion, name='agregar_devolucion'),
    path('<int:id>/agregar-recuperado/', views.agregar_stock_recuperado, name='agregar_recuperado'),
    path('<int:id>/agregar-repuesto/', views.agregar_stock_repuesto, name='agregar_repuesto'),
]
