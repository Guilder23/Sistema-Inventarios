# Estructura del Proyecto - Sistema de Inventario

## Árbol de Directorios

```
Sistema-Inventario/
│
├── apps/                           # Aplicaciones del sistema
│   ├── __init__.py
│   │
│   ├── core/                       # Funcionalidades centrales
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── management/
│   │   │   ├── __init__.py
│   │   │   └── commands/
│   │   │       ├── __init__.py
│   │   │       └── crear_administrador.py    # Comando para crear admin
│   │   └── tests.py
│   │
│   ├── usuarios/                   # Gestión de usuarios
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py              # PerfilUsuario
│   │   ├── views.py               # Login, CRUD usuarios
│   │   ├── urls.py
│   │   └── tests.py
│   │
│   ├── productos/                  # Gestión de productos
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py              # Producto, HistorialProducto, ProductoDanado
│   │   ├── views.py               # CRUD productos
│   │   ├── urls.py
│   │   └── tests.py
│   │
│   ├── inventario/                 # Control de inventario
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py              # Inventario, MovimientoInventario
│   │   ├── views.py               # Ver inventario, asignar precios
│   │   ├── urls.py
│   │   └── tests.py
│   │
│   ├── traspasos/                  # Traspasos entre ubicaciones
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py              # Traspaso, DetalleTraspaso
│   │   ├── views.py               # CRUD traspasos, devoluciones
│   │   ├── urls.py
│   │   └── tests.py
│   │
│   ├── ventas/                     # Gestión de ventas
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py              # Venta, DetalleVenta, AmortizacionCredito
│   │   ├── views.py               # CRUD ventas, amortizaciones
│   │   ├── urls.py
│   │   └── tests.py
│   │
│   ├── pedidos/                    # Gestión de pedidos
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py              # Pedido, DetallePedido
│   │   ├── views.py               # CRUD pedidos
│   │   ├── urls.py
│   │   └── tests.py
│   │
│   ├── notificaciones/             # Sistema de notificaciones
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py              # Notificacion
│   │   ├── views.py               # Ver notificaciones, marcar leídas
│   │   ├── urls.py
│   │   └── tests.py
│   │
│   └── reportes/                   # Generación de reportes
│       ├── __init__.py
│       ├── admin.py
│       ├── apps.py
│       ├── models.py
│       ├── views.py               # Generación de PDFs
│       ├── urls.py
│       └── tests.py
│
├── templates/                      # Plantillas HTML
│   ├── base/
│   │   ├── base.html              # Plantilla base principal
│   │   └── dashboard.html         # Dashboard principal
│   ├── usuarios/
│   │   ├── login.html             # Página de login
│   │   ├── listar.html
│   │   ├── crear.html
│   │   └── editar.html
│   ├── productos/
│   │   ├── listar.html
│   │   ├── crear.html
│   │   ├── editar.html
│   │   ├── historial.html
│   │   ├── danados.html
│   │   └── registrar_danado.html
│   ├── inventario/
│   │   ├── ver.html
│   │   ├── asignar_precio.html
│   │   └── movimientos.html
│   ├── traspasos/
│   │   ├── listar.html
│   │   ├── crear.html
│   │   ├── ver.html
│   │   ├── devoluciones.html
│   │   └── crear_devolucion.html
│   ├── ventas/
│   │   ├── listar.html
│   │   ├── crear.html
│   │   ├── ver.html
│   │   └── amortizacion.html
│   ├── pedidos/
│   │   ├── listar.html
│   │   ├── crear.html
│   │   └── ver.html
│   ├── notificaciones/
│   │   └── listar.html
│   └── reportes/
│       └── index.html
│
├── static/                         # Archivos estáticos
│   ├── css/
│   │   ├── estilos.css            # Estilos generales
│   │   ├── navegacion.css         # Estilos de navegación
│   │   ├── usuarios/
│   │   │   └── login.css
│   │   ├── productos/
│   │   ├── inventario/
│   │   ├── traspasos/
│   │   ├── ventas/
│   │   └── pedidos/
│   ├── js/
│   │   ├── principal.js           # JavaScript principal
│   │   ├── usuarios/
│   │   ├── productos/
│   │   ├── inventario/
│   │   ├── traspasos/
│   │   ├── ventas/
│   │   └── pedidos/
│   ├── iconos/                    # Iconos del sistema
│   └── img/                       # Imágenes
│
├── media/                          # Archivos subidos por usuarios
│   ├── productos/                 # Fotos de productos
│   ├── danados/                   # Fotos de productos dañados
│   ├── traspasos/                 # Fotos de traspasos
│   └── comprobantes/              # Comprobantes de pago
│
├── sistemaInventario/              # Configuración del proyecto
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings.py                # Configuración principal
│   ├── urls.py                    # URLs principal
│   └── wsgi.py
│
├── .env                            # Variables de entorno (NO en git)
├── .env.example                    # Ejemplo de variables de entorno
├── .gitignore                      # Archivos ignorados por git
├── manage.py                       # Script de gestión de Django
├── requirements.txt                # Dependencias del proyecto
├── README.md                       # Documentación principal
└── ESTRUCTURA.md                   # Este archivo
```

## Descripción de Apps

### core
- **Propósito:** Funcionalidades compartidas y comandos de gestión
- **Comandos:** `crear_administrador` - Crea usuario admin por defecto

### usuarios
- **Propósito:** Autenticación y gestión de usuarios
- **Modelos:** PerfilUsuario (extiende User de Django)
- **Funcionalidades:** Login, CRUD usuarios, asignación de roles

### productos
- **Propósito:** Gestión del catálogo de productos
- **Modelos:** Producto, HistorialProducto, ProductoDanado
- **Funcionalidades:** CRUD productos, historial de cambios, registro de dañados

### inventario
- **Propósito:** Control de stock por ubicación
- **Modelos:** Inventario, MovimientoInventario
- **Funcionalidades:** Ver inventario, asignar precios, alertas de stock

### traspasos
- **Propósito:** Movimiento de productos entre ubicaciones
- **Modelos:** Traspaso, DetalleTraspaso
- **Funcionalidades:** CRUD traspasos, devoluciones, generación de PDFs

### ventas
- **Propósito:** Gestión de ventas
- **Modelos:** Venta, DetalleVenta, AmortizacionCredito
- **Funcionalidades:** CRUD ventas, ventas a crédito, amortizaciones

### pedidos
- **Propósito:** Gestión de pedidos entre ubicaciones
- **Modelos:** Pedido, DetallePedido
- **Funcionalidades:** CRUD pedidos, aceptar/rechazar

### notificaciones
- **Propósito:** Sistema de notificaciones en tiempo real
- **Modelos:** Notificacion
- **Funcionalidades:** Notificaciones de stock, pedidos, traspasos

### reportes
- **Propósito:** Generación de reportes e informes
- **Funcionalidades:** PDFs de inventario, ventas, traspasos

## Tecnologías Utilizadas

- **Backend:** Django 5.1.1, Python 3.11.9
- **Base de datos:** PostgreSQL
- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript
- **PDFs:** ReportLab, WeasyPrint
- **Iconos:** Font Awesome

## Notas de Desarrollo

- No se usa Bootstrap, solo CSS puro
- No se usan formularios de Django (ModelForms), todo con HTML/JS
- Nombres de archivos y carpetas en español
- Sistema multi-rol (Administrador, Almacén, Tienda, Depósito, Tienda Online)
