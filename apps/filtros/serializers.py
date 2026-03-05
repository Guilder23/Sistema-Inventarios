from rest_framework import serializers

from apps.almacenes.models import Almacen
from apps.tiendas.models import Tienda
from apps.depositos.models import Deposito


class AlmacenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Almacen
        fields = ['nombre']


class TiendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tienda
        fields = ['nombre']


class DepositoSerializer(serializers.ModelSerializer):
    tienda_nombre = serializers.CharField(source='tienda.nombre', read_only=True)
    etiqueta = serializers.SerializerMethodField()

    class Meta:
        model = Deposito
        fields = ['nombre', 'tienda_nombre', 'etiqueta']

    def get_etiqueta(self, obj):
        return f"{obj.nombre} - {obj.tienda.nombre}" if obj.tienda else obj.nombre


class AllRolesSerializer(serializers.Serializer):
    almacenes = AlmacenSerializer(many=True)
    tiendas = TiendaSerializer(many=True)
    depositos = DepositoSerializer(many=True)
