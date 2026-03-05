"""
URL configuration for sistemaInventario project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Redirección de raíz a página de inicio
    path('', RedirectView.as_view(url='/inicio/', permanent=False)),
    
    # URLs de las apps
    path('', include('apps.usuarios.urls')),
    path('productos/', include('apps.productos.urls')),
    path('inventario/', include('apps.inventario.urls')),
    path('traspasos/', include('apps.traspasos.urls')),
    path('ventas/', include('apps.ventas.urls')),
    path('pedidos/', include('apps.pedidos.urls')),
    path('notificaciones/', include('apps.notificaciones.urls')),
    path('reportes/', include('apps.reportes.urls')),
    path('almacenes/', include('apps.almacenes.urls')),
    path('tiendas/', include('apps.tiendas.urls')),
    path('depositos/', include('apps.depositos.urls')),
    path('tiendas-virtuales/', include('apps.tiendas_virtuales.urls')),
    path('vendedores/', include('apps.vendedores.urls')),
]

# Servir archivos media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

