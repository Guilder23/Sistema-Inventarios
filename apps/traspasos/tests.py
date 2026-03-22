from django.test import TestCase

from .models import Traspaso


class TraspasoCodigoTests(TestCase):
	def test_generar_codigo_es_corto_y_con_formato_esperado(self):
		codigo = Traspaso.generar_codigo()

		self.assertRegex(codigo, r"^TRP-\d{6}-[A-F0-9]{6}$")
		self.assertEqual(len(codigo), 17)
