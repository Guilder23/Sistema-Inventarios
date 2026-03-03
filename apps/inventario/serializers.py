from rest_framework import serializers
from apps.inventario.models import Inventario


class InventarioAPISerializer(serializers.ModelSerializer):

    unidad_operativa = serializers.SerializerMethodField()
    nombre = serializers.CharField(source='producto.nombre')
    codigo = serializers.CharField(source='producto.codigo')
    fotos = serializers.ImageField(source='producto.foto', read_only=True)
    stock = serializers.IntegerField(source='cantidad')
    descripcion = serializers.CharField(source='producto.descripcion')
    stock_critico = serializers.IntegerField(source='producto.stock_critico')
    stock_bajo = serializers.IntegerField(source='producto.stock_bajo')
    precio_unitario = serializers.DecimalField(source='producto.precio_unidad', max_digits=10, decimal_places=2)
    precio_por_caja=serializers.DecimalField(source='producto.precio_caja', max_digits=10, decimal_places=2)
    precio_por_mayor=serializers.DecimalField(source='producto.precio_mayor', max_digits=10, decimal_places=2)
    poliza = serializers.CharField(source='producto.poliza')
    gastos = serializers.DecimalField(source='producto.gastos', max_digits=10, decimal_places=2)
    creado_por = serializers.CharField(source='producto.creado_por.first_name', read_only=True, allow_null=True)
    fecha_creacion = serializers.DateTimeField(source='producto.fecha_creacion', read_only=True)
    ultima_actualizacion = serializers.DateTimeField(source='producto.ultima_actualizacion', read_only=True, allow_null=True)
    cajas = serializers.SerializerMethodField()
    unidades_por_caja = serializers.IntegerField(source='producto.unidades_por_caja', read_only=True)

    class Meta:
        model = Inventario
        fields = [
            'fotos',
            'codigo',
            'nombre',
            'stock',
            'cajas',
            'unidad_operativa',
            'descripcion',
            'stock_critico',
            'stock_bajo',
            'precio_unitario',
            'precio_por_caja',
            'precio_por_mayor',
            'poliza',
            'gastos',
            'creado_por',
            'fecha_creacion',
            'ultima_actualizacion',
            'unidades_por_caja',

        ]

    def get_almacen(self, obj):
        if obj.ubicacion and obj.ubicacion.almacen:
            return obj.ubicacion.almacen.nombre
        return None
    
    def get_tienda(self, obj):
        if obj.ubicacion and obj.ubicacion.tienda:
            return obj.ubicacion.tienda.nombre
        return None
    
    def get_unidad_operativa(self, obj):
        # Si tiene tienda, mostrar tienda
        if obj.ubicacion and obj.ubicacion.tienda:
            return obj.ubicacion.tienda.nombre
        
        # Si no tiene tienda pero sí almacén
        if obj.ubicacion and obj.ubicacion.almacen:
            return obj.ubicacion.almacen.nombre
        
        return None
    
    def get_cajas(self, obj):
        if not obj.producto or not obj.cantidad:
            return "0c/0u"

        unidades_por_caja = obj.producto.unidades_por_caja or 0

        if unidades_por_caja > 0:
            cajas = obj.cantidad // unidades_por_caja
            sobrantes = obj.cantidad % unidades_por_caja
        return f"{cajas}c/{sobrantes}u"
    
        return "0c/0u"