from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from apps.usuarios.models import PerfilUsuario
from apps.ventas.models import SesionCaja, Venta, AmortizacionCredito


class ReporteAuditoriaCajasTests(TestCase):
	def setUp(self):
		User = get_user_model()

		self.admin = User.objects.create_user(username='admin_test', password='secret123')
		self.operador = User.objects.create_user(username='operador_test', password='secret123')

		self.perfil_admin = PerfilUsuario.objects.create(
			usuario=self.admin,
			rol='administrador',
			nombre_ubicacion='Central',
		)
		self.perfil_tienda = PerfilUsuario.objects.create(
			usuario=self.operador,
			rol='tienda',
			nombre_ubicacion='Tienda Uno',
		)

		self.sesion_cerrada = SesionCaja.objects.create(
			cajero=self.operador,
			ubicacion=self.perfil_tienda,
			monto_inicial=Decimal('100.00'),
			monto_esperado_efectivo=Decimal('180.00'),
			monto_real_efectivo=Decimal('178.00'),
			diferencia_efectivo=Decimal('-2.00'),
			estado='CERRADA',
			fecha_cierre=timezone.now(),
		)

		self.venta = Venta.objects.create(
			codigo='V-AUD-001',
			ubicacion=self.perfil_tienda,
			sesion_caja=self.sesion_cerrada,
			cliente='Cliente Auditoria',
			tipo_pago='contado',
			estado='completada',
			subtotal=Decimal('50.00'),
			total=Decimal('50.00'),
			monto_efectivo=Decimal('50.00'),
			vendedor=self.operador,
		)

		AmortizacionCredito.objects.create(
			venta=self.venta,
			sesion_caja=self.sesion_cerrada,
			monto=Decimal('25.00'),
			moneda='BOB',
			tipo_pago='contado',
			comprobante='test-comprobante.jpg',
			registrado_por=self.operador,
		)

	def test_admin_puede_ver_reporte_auditoria(self):
		self.client.login(username='admin_test', password='secret123')
		response = self.client.get(reverse('reporte_auditoria_cajas'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'Auditoría de Cajas')

	def test_no_admin_no_puede_ver_reporte_auditoria(self):
		self.client.login(username='operador_test', password='secret123')
		response = self.client.get(reverse('reporte_auditoria_cajas'))

		self.assertEqual(response.status_code, 403)

	def test_detalle_muestra_ventas_y_amortizaciones(self):
		self.client.login(username='admin_test', password='secret123')
		response = self.client.get(reverse('reporte_auditoria_cajas'), {
			'detalle_sesion': self.sesion_cerrada.id,
		})

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'V-AUD-001')
		self.assertContains(response, 'Amortizaciones registradas')
