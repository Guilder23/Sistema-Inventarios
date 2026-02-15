from django.urls import path
from . import views

urlpatterns = [
    # Traspasos
    path('', views.listar_traspasos, name='listar_traspasos'),
    path('crear/', views.crear_traspaso, name='crear_traspaso'),
    path('<int:id>/ver/', views.ver_traspaso, name='ver_traspaso'),
    path('<int:id>/cambiar-estado/', views.cambiar_estado_traspaso, name='cambiar_estado_traspaso'),
    path('<int:id>/pdf/', views.generar_pdf_traspaso, name='generar_pdf_traspaso'),
    
    # API endpoints para AJAX
    path('api/productos/', views.obtener_productos_traspaso, name='obtener_productos_traspaso'),
    path('api/destinos/', views.obtener_destinos_traspaso, name='obtener_destinos_traspaso'),
]
