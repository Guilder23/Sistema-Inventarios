from django.urls import path
from . import views

urlpatterns = [
    path('', views.precios_list, name='precios_list'),
    path('<int:producto_id>/editar/', views.precio_editar, name='precio_editar'),
]
