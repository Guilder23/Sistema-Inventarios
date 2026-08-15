from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.usuarios.models import PerfilUsuario
from apps.ventas.models import SesionCaja, Venta, AmortizacionCredito, MovimientoCaja


class ArqueoCajaTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='cajero', password='secret123')
        self.perfil = PerfilUsuario.objects.create(
            usuario=self.user,
            rol='tienda',
            nombre_ubicacion='Tienda Test',
        )

    def test_calculo_cierre_efectivo(self):
        sesion = SesionCaja.objects.create(
            cajero=self.user,
            ubicacion=self.perfil,
            monto_inicial=Decimal('100.00'),
        )

        venta = Venta.objects.create(
            codigo='V-001',
            ubicacion=self.perfil,
            cliente='Cliente 1',
            tipo_pago='contado',
            subtotal=Decimal('50.00'),
            total=Decimal('50.00'),
            sesion_caja=sesion,
            vendedor=self.user,
        )
        venta.tipo_pago = 'contado'
        venta.save(update_fields=['tipo_pago'])

        amortizacion = AmortizacionCredito.objects.create(
            venta=venta,
            monto=Decimal('20.00'),
            comprobante='fake-path.jpg',
            registrado_por=self.user,
            sesion_caja=sesion,
            tipo_pago='EFECTIVO',
        )

        MovimientoCaja.objects.create(
            sesion_caja=sesion,
            tipo='INGRESO',
            monto=Decimal('15.00'),
            concepto='Ingreso manual',
            registrado_por=self.user,
        )
        MovimientoCaja.objects.create(
            sesion_caja=sesion,
            tipo='EGRESO',
            monto=Decimal('5.00'),
            concepto='Egreso manual',
            registrado_por=self.user,
        )

        resumen = sesion.calcular_resumen()

        self.assertEqual(resumen['ventas_efectivo'], Decimal('50.00'))
        self.assertEqual(resumen['cobros_efectivo'], Decimal('20.00'))
        self.assertEqual(resumen['ingresos_manuales'], Decimal('15.00'))
        self.assertEqual(resumen['egresos_manuales'], Decimal('5.00'))
        self.assertEqual(resumen['monto_esperado_efectivo'], Decimal('180.00'))

    def test_generar_pdf_arqueo(self):
        """Solicita la vista que genera el PDF de arqueo y verifica la respuesta."""
        sesion = SesionCaja.objects.create(
            cajero=self.user,
            ubicacion=self.perfil,
            monto_inicial=Decimal('50.00'),
        )

        # Cerrar la sesión para tener datos completos
        sesion.cerrar(Decimal('60.00'), observaciones='Prueba PDF')

        # Autenticar cliente de pruebas
        logged = self.client.login(username='cajero', password='secret123')
        self.assertTrue(logged)

        from django.urls import reverse

        url = reverse('ventas_api:generar_pdf_arqueo', args=[sesion.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue(len(response.content) > 100)
