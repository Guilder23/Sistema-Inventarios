# Instrucciones de Puesta en Marcha

## 📋 Pasos para Iniciar el Proyecto

### 1. Verificar Instalación de PostgreSQL

Asegúrate de tener PostgreSQL instalado y en ejecución.

```bash
# Verificar instalación
psql --version
```

### 2. Crear Base de Datos

Conecta a PostgreSQL y crea la base de datos:

```sql
-- En el prompt de PostgreSQL
CREATE DATABASE sistema_inventario;
```

O desde la línea de comandos:

```bash
createdb sistema_inventario
```

### 3. Configurar Variables de Entorno

Edita el archivo `.env` con tus credenciales de PostgreSQL:

```env
DB_NAME=sistema_inventario
DB_USER=postgres
DB_PASSWORD=tu_password_aqui
DB_HOST=localhost
DB_PORT=5432
```

### 4. Instalar Dependencias

Instala todas las dependencias del proyecto:

```bash
pip install -r requirements.txt
```

**Nota:** Si tienes problemas con `psycopg2-binary`, puedes intentar:
```bash
pip install psycopg2-binary --no-binary psycopg2-binary
```

### 5. Ejecutar Migraciones

Crea las tablas en la base de datos:

```bash
python manage.py makemigrations
python manage.py migrate
```

### 6. Crear Usuario Administrador

Ejecuta el comando personalizado para crear el administrador:

```bash
python manage.py crear_administrador
```

Esto creará un usuario con las siguientes credenciales:
- **Usuario:** admin
- **Contraseña:** admin123

⚠️ **IMPORTANTE:** Cambia la contraseña después del primer inicio de sesión.

### 7. Recolectar Archivos Estáticos (Opcional en desarrollo)

```bash
python manage.py collectstatic --noinput
```

### 8. Iniciar el Servidor de Desarrollo

```bash
python manage.py runserver
```

El sistema estará disponible en: http://localhost:8000

### 9. Acceder al Sistema

1. Abre tu navegador en http://localhost:8000
2. Serás redirigido automáticamente al login
3. Ingresa con las credenciales del administrador
4. Cambia la contraseña en tu primer inicio de sesión

## 🔧 Comandos Útiles de Django

### Crear Superusuario Manual (alternativo)

```bash
python manage.py createsuperuser
```

### Ver Todas las Migraciones

```bash
python manage.py showmigrations
```

### Crear Nuevas Migraciones

```bash
python manage.py makemigrations nombre_app
```

### Shell de Django

```bash
python manage.py shell
```

### Ejecutar Tests

```bash
python manage.py test
```

## 🗃️ Comandos de PostgreSQL Útiles

### Conectar a la Base de Datos

```bash
psql -U postgres -d sistema_inventario
```

### Ver Tablas

```sql
\dt
```

### Ver Estructura de una Tabla

```sql
\d nombre_tabla
```

### Borrar y Recrear Base de Datos (CUIDADO)

```sql
DROP DATABASE sistema_inventario;
CREATE DATABASE sistema_inventario;
```

## 📝 Notas Importantes

### Problemas Comunes

**1. Error de conexión a PostgreSQL:**
- Verifica que PostgreSQL esté en ejecución
- Verifica las credenciales en `.env`
- Verifica que el usuario tenga permisos

**2. Error con migraciones:**
```bash
# Eliminar migraciones y reiniciar
# CUIDADO: Esto borrará los datos
python manage.py migrate --fake nombre_app zero
python manage.py makemigrations nombre_app
python manage.py migrate nombre_app
```

**3. Error con archivos estáticos:**
- Verifica que la carpeta `static` exista
- Ejecuta `collectstatic` de nuevo

## 🚀 Próximos Pasos

Una vez que el sistema esté en marcha:

1. **Crear Usuarios:** Accede a "Gestionar Usuarios" y crea usuarios para cada ubicación
2. **Registrar Productos:** Accede a "Productos" y comienza a registrar tu catálogo
3. **Configurar Inventarios:** Asigna stock inicial a cada ubicación
4. **Configurar Precios:** Como administrador, asigna precios a los productos
5. **Personalizar:** Modifica templates y estilos según tus necesidades

## 🎨 Personalización

### Cambiar Colores del Sistema

Edita `static/css/estilos.css` y modifica las variables CSS:

```css
:root {
    --color-primario: #2c3e50;
    --color-secundario: #3498db;
    /* ... más colores */
}
```

### Cambiar Logo

1. Coloca tu logo en `static/img/logo.png`
2. Edita `templates/base/base.html` línea del navbar

### Agregar Iconos Personalizados

Coloca tus iconos en `static/iconos/` y referéncialos en HTML/CSS

## 📚 Recursos Adicionales

- [Documentación de Django 5.1](https://docs.djangoproject.com/en/5.1/)
- [Documentación de PostgreSQL](https://www.postgresql.org/docs/)
- [Font Awesome Icons](https://fontawesome.com/icons)

## 🆘 Soporte

Si encuentras problemas, revisa:
1. Los logs del servidor de desarrollo
2. Los mensajes de error en la consola
3. El archivo `ESTRUCTURA.md` para entender la arquitectura
4. El archivo `README.md` para información general

---

**¡Éxito con tu Sistema de Inventario!** 🎉
