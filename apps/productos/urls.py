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
    
    # Productos en Contenedores
    path('<int:producto_id>/contenedores/', views.listar_contenedores_producto, name='listar_contenedores_producto'),
    path('<int:producto_id>/contenedores/agregar/', views.agregar_producto_contenedor, name='agregar_producto_contenedor'),
    path('producto-contenedor/<int:producto_contenedor_id>/editar/', views.editar_producto_contenedor, name='editar_producto_contenedor'),
    path('producto-contenedor/<int:producto_contenedor_id>/eliminar/', views.eliminar_producto_contenedor, name='eliminar_producto_contenedor'),
    path('<int:producto_id>/contenedores/json/', views.json_contenedores_producto, name='json_contenedores_producto'),
    path('categorias/json/', views.json_categorias, name='json_categorias'),
    path('contenedores/<int:contenedor_id>/productos-disponibles/json/', views.json_productos_disponibles, name='json_productos_disponibles'),
    
    # Productos dañados
    path('devoluciones/', views.listar_danados, name='listar_danados'),
    path('devoluciones/registrar/', views.registrar_danado, name='registrar_danado'),
    path('devoluciones/<int:id>/agregar-danado/', views.agregar_mas_danado, name='agregar_mas_danado'),
    path('devoluciones/<int:id>/agregar-stock/', views.agregar_stock_danado, name='agregar_stock_danado'),
    path('devoluciones/<int:id>/reponer-stock/', views.reponer_stock_danado, name='reponer_stock_danado'),

    # Gestion de categorias
    path('categorias/', views.listar_categorias, name='listar_categorias'),
    path('categorias/crear/', views.crear_categoria, name='crear_categoria'),
    path('categorias/<int:id>/obtener/', views.obtener_categoria, name='obtener_categoria'),
    path('categorias/<int:id>/editar/', views.editar_categoria, name='editar_categoria'),
    path('categorias/<int:id>/eliminar/', views.eliminar_categoria, name='eliminar_categoria'),
    # Gestion de contenedores
    path('contenedores/', views.listar_contenedores, name='listar_contenedores'),
    path('contenedores/crear/', views.crear_contenedor, name='crear_contenedor'),
    path('contenedores/<int:id>/obtener/', views.obtener_contenedor, name='obtener_contenedor'),
    path('contenedores/<int:id>/editar/', views.editar_contenedor, name='editar_contenedor'),
    path('contenedores/<int:id>/eliminar/', views.eliminar_contenedor, name='eliminar_contenedor'),
    
    path('contenedores/<int:contenedor_id>/productos/', views.productos_en_contenedor, name='productos_en_contenedor'),
    path('contenedores/<int:contenedor_id>/agregar-producto/', views.agregar_producto_a_contenedor, name='agregar_producto_a_contenedor'),

    # Compatibilidad rutas previas
    path('danados/', views.listar_danados),
    path('danados/registrar/', views.registrar_danado),
]
