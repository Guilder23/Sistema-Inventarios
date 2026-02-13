from django.urls import path
from . import views

urlpatterns = [
    # Traspasos
    path('', views.listar_traspasos, name='listar_traspasos'),
    path('crear/', views.crear_traspaso, name='crear_traspaso'),
    path('<int:id>/ver/', views.ver_traspaso, name='ver_traspaso'),
    path('<int:id>/aceptar/', views.aceptar_traspaso, name='aceptar_traspaso'),
    path('<int:id>/rechazar/', views.rechazar_traspaso, name='rechazar_traspaso'),
    path('<int:id>/pdf/', views.generar_pdf_traspaso, name='generar_pdf_traspaso'),
    
    # Devoluciones
    path('devoluciones/', views.listar_devoluciones, name='listar_devoluciones'),
    path('devoluciones/crear/', views.crear_devolucion, name='crear_devolucion'),
]
