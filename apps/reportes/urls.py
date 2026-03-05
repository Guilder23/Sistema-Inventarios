from django.urls import path
from . import views

app_name = 'reportes'

urlpatterns = [
    path('historial/', views.historial, name='historial'),
    path('historial/api/ventas/', views.api_ventas, name='api_ventas'),
    path('historial/api/traspasos/', views.api_traspasos, name='api_traspasos'),
    path('historial/api/movimientos/', views.api_movimientos, name='api_movimientos'),
]