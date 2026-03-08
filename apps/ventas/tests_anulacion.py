"""
TEST DE ANULACIÓN DE VENTAS CON MODALES PERSONALIZADOS
Pruebas para verificar los flujos de anulación almacén/tienda
"""

from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from decimal import Decimal
from apps.ventas.models import Venta, SolicitudAnulacionVenta, DetalleVenta
from apps.productos.models import Producto
from apps.tiendas.models import Tienda
from apps.usuarios.models import PerfilUsuario
from django.utils import timezone


class AnulacionAlmacenTest(TestCase):
    """Tests para anulación directa en almacén"""

    def setUp(self):
        """Configurar usuario almacén y venta"""
        self.client = Client()
        
        # Crear usuario almacén
        self.usuario_almacen = User.objects.create_user(
            username='almacen1',
            email='almacen@test.com',
            password='test123'
        )
        self.perfil_almacen = PerfilUsuario.objects.create(
            usuario=self.usuario_almacen,
            rol='almacen'
        )
        
        # Crear tienda (ubicación)
        self.tienda = Tienda.objects.create(
            nombre='Tienda Test',
            tipo='principal'
        )
        
        # Crear producto con stock
        self.producto = Producto.objects.create(
            nombre='Producto Test',
            precio=100.00,
            stock=50,
            unidades_por_caja=12
        )
        
        # Crear venta contado
        self.venta_contado = Venta.objects.create(
            codigo='V-001',
            cliente='Cliente Test',
            tipo_pago='contado',
            estado='completada',
            total=200.00,
            subtotal=200.00,
            vendedor=self.usuario_almacen,
            ubicacion=self.tienda
        )
        
        # Crear detalle venta
        DetalleVenta.objects.create(
            venta=self.venta_contado,
            producto=self.producto,
            cantidad=2,
            precio_unitario=100.00
        )

    def test_anular_venta_almacen_sin_comentario(self):
        """Validar que anularVenta requiere comentario"""
        self.client.login(username='almacen1', password='test123')
        
        response = self.client.post(
            reverse('ventas:anular_venta', args=[self.venta_contado.id]),
            data={},
            content_type='application/json'
        )
        
        # Debe requerir comentario
        self.assertEqual(response.status_code, 400)

    def test_anular_venta_almacen_con_comentario(self):
        """Almacén puede anularDirectamente con comentario"""
        self.client.login(username='almacen1', password='test123')
        
        # Guardar stock previo
        self.producto.refresh_from_db()
        stock_anterior = self.producto.stock
        
        response = self.client.post(
            reverse('ventas:anular_venta', args=[self.venta_contado.id]),
            data={'comentario': 'Error en cantidad'},
            content_type='application/json'
        )
        
        # Verificar respuesta
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        
        # Verificar venta anulada
        self.venta_contado.refresh_from_db()
        self.assertEqual(self.venta_contado.estado, 'anulada')
        
        # Verificar stock devuelto
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock, stock_anterior + 2)


class AnulacionTiendaTest(TestCase):
    """Tests para solicitud de anulación en tienda"""

    def setUp(self):
        """Configurar usuario tienda y venta"""
        self.client = Client()
        
        # Crear usuario tienda
        self.usuario_tienda = User.objects.create_user(
            username='tienda1',
            email='tienda@test.com',
            password='test123'
        )
        self.tienda = Tienda.objects.create(
            nombre='Tienda Test',
            tipo='principal'
        )
        self.perfil_tienda = PerfilUsuario.objects.create(
            usuario=self.usuario_tienda,
            rol='tienda',
            tienda=self.tienda
        )
        
        # Crear producto
        self.producto = Producto.objects.create(
            nombre='Producto Test',
            precio=100.00,
            stock=100,
            unidades_por_caja=12
        )
        
        # Crear venta tienda
        self.venta_tienda = Venta.objects.create(
            codigo='V-002',
            cliente='Cliente Test 2',
            tipo_pago='contado',
            estado='completada',
            total=300.00,
            subtotal=300.00,
            vendedor=self.usuario_tienda,
            ubicacion=self.tienda
        )
        
        # Crear detalle venta
        DetalleVenta.objects.create(
            venta=self.venta_tienda,
            producto=self.producto,
            cantidad=3,
            precio_unitario=100.00
        )

    def test_tienda_solicita_anulacion(self):
        """Tienda no anula directamente, crea solicitud"""
        self.client.login(username='tienda1', password='test123')
        
        response = self.client.post(
            reverse('ventas:anular_venta', args=[self.venta_tienda.id]),
            data={'comentario': 'Cliente no está satisfecho'},
            content_type='application/json'
        )
        
        # Verificar respuesta
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        
        # Verificar que venta sigue igual (NO anulada)
        self.venta_tienda.refresh_from_db()
        self.assertNotEqual(self.venta_tienda.estado, 'anulada')
        
        # Verificar que se creó solicitud
        solicitud = SolicitudAnulacionVenta.objects.filter(
            venta=self.venta_tienda
        ).first()
        self.assertIsNotNone(solicitud)
        self.assertEqual(solicitud.estado, 'pendiente')
        self.assertEqual(solicitud.comentario, 'Cliente no está satisfecho')


class SolicitudesAnulacionTest(TestCase):
    """Tests para panel de solicitudes anulación"""

    def setUp(self):
        """Configurar usuarios y solicitudes"""
        self.client = Client()
        
        # Usuarios
        self.usuario_almacen = User.objects.create_user(
            username='almacen2',
            password='test123'
        )
        PerfilUsuario.objects.create(
            usuario=self.usuario_almacen,
            rol='almacen'
        )
        
        self.usuario_tienda = User.objects.create_user(
            username='tienda2',
            password='test123'
        )
        self.tienda = Tienda.objects.create(nombre='Tienda', tipo='principal')
        PerfilUsuario.objects.create(
            usuario=self.usuario_tienda,
            rol='tienda',
            tienda=self.tienda
        )
        
        # Producto
        self.producto = Producto.objects.create(
            nombre='Producto',
            precio=50.00,
            stock=50,
            unidades_por_caja=10
        )
        
        # Venta
        self.venta = Venta.objects.create(
            codigo='V-003',
            cliente='Test',
            tipo_pago='contado',
            estado='completada',
            total=100.00,
            subtotal=100.00,
            vendedor=self.usuario_tienda,
            ubicacion=self.tienda
        )
        
        # Solicitud
        self.solicitud = SolicitudAnulacionVenta.objects.create(
            venta=self.venta,
            solicitado_por=self.usuario_tienda,
            comentario='Quiero anular',
            estado='pendiente'
        )

    def test_solo_almacen_ve_solicitudes(self):
        """Solo almacén puede acceder al panel"""
        # Sin login
        response = self.client.get(reverse('ventas:solicitudes_anulacion'))
        self.assertEqual(response.status_code, 302)  # Redirect login
        
        # Login tienda
        self.client.login(username='tienda2', password='test123')
        response = self.client.get(reverse('ventas:solicitudes_anulacion'))
        self.assertEqual(response.status_code, 403)  # Forbidden
        
        # Login almacén
        self.client.logout()
        self.client.login(username='almacen2', password='test123')
        response = self.client.get(reverse('ventas:solicitudes_anulacion'))
        self.assertEqual(response.status_code, 200)

    def test_aceptar_solicitud_anulacion(self):
        """Almacén puede aceptar solicitud"""
        self.client.login(username='almacen2', password='test123')
        
        response = self.client.post(
            reverse('ventas:responder_solicitud_anulacion', 
                   args=[self.solicitud.id]),
            data={
                'accion': 'aceptar',
                'comentario_respuesta': 'Aceptado'
            },
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        
        # Verificar solicitud actualizada
        self.solicitud.refresh_from_db()
        self.assertEqual(self.solicitud.estado, 'aceptada')
        self.assertEqual(self.solicitud.respondido_por, self.usuario_almacen)
        
        # Verificar venta anulada
        self.venta.refresh_from_db()
        self.assertEqual(self.venta.estado, 'anulada')

    def test_rechazar_solicitud_anulacion(self):
        """Almacén puede rechazar solicitud"""
        self.client.login(username='almacen2', password='test123')
        
        response = self.client.post(
            reverse('ventas:responder_solicitud_anulacion', 
                   args=[self.solicitud.id]),
            data={
                'accion': 'rechazar',
                'comentario_respuesta': 'No se puede anular'
            },
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verificar solicitud actualizada pero venta NO anulada
        self.solicitud.refresh_from_db()
        self.assertEqual(self.solicitud.estado, 'rechazada')
        
        self.venta.refresh_from_db()
        self.assertNotEqual(self.venta.estado, 'anulada')

    def test_race_condition_doble_respuesta(self):
        """Prevenir 2 respuestas a la misma solicitud"""
        self.client.login(username='almacen2', password='test123')
        
        # Primera respuesta: éxito
        response1 = self.client.post(
            reverse('ventas:responder_solicitud_anulacion', 
                   args=[self.solicitud.id]),
            data={'accion': 'aceptar', 'comentario_respuesta': 'Ok'},
            content_type='application/json'
        )
        self.assertEqual(response1.status_code, 200)
        
        # Segunda respuesta: debe fallar (estado ya no es pendiente)
        response2 = self.client.post(
            reverse('ventas:responder_solicitud_anulacion', 
                   args=[self.solicitud.id]),
            data={'accion': 'rechazar', 'comentario_respuesta': 'Demasiado tarde'},
            content_type='application/json'
        )
        
        # Debe fallar con error
        self.assertNotEqual(response2.status_code, 200)


class ModalPersonalizadoTest(TestCase):
    """Tests para verificar respuestas JSON para modales"""

    def setUp(self):
        self.client = Client()
        self.usuario_almacen = User.objects.create_user(
            username='almacen3',
            password='test123'
        )
        PerfilUsuario.objects.create(
            usuario=self.usuario_almacen,
            rol='almacen'
        )
        self.tienda = Tienda.objects.create(nombre='T', tipo='principal')
        self.venta = Venta.objects.create(
            codigo='V-004',
            cliente='C',
            tipo_pago='contado',
            estado='completada',
            total=100.00,
            subtotal=100.00,
            vendedor=self.usuario_almacen,
            ubicacion=self.tienda
        )

    def test_anulacion_responde_json(self):
        """Verificar respuesta JSON para modal"""
        self.client.login(username='almacen3', password='test123')
        
        response = self.client.post(
            reverse('ventas:anular_venta', args=[self.venta.id]),
            data={'comentario': 'Test'},
            content_type='application/json'
        )
        
        # Debe ser JSON
        data = response.json()
        self.assertIn('success', data)
        self.assertIn('message', data)


if __name__ == '__main__':
    import django
    django.setup()
