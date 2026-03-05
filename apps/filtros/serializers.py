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

    class Meta:

        model = Deposito

        fields = ['nombre']





class AllRolesSerializer(serializers.Serializer):

    almacenes = AlmacenSerializer(many=True)

    tiendas = TiendaSerializer(many=True)

    depositos = DepositoSerializer(many=True)