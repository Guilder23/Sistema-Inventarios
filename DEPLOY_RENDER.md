# 🚀 Guía de Deploy en Render

## Preparación Completada ✅

Tu proyecto ya está preparado para el deploy en Render con los siguientes archivos:
- ✅ `requirements.txt` - Dependencias actualizadas (gunicorn, whitenoise, dj-database-url)
- ✅ `build.sh` - Script de construcción para Render
- ✅ `runtime.txt` - Versión de Python especificada
- ✅ `settings.py` - Configurado para producción
- ✅ `.env.example` - Plantilla de variables de entorno

---

## 📋 PASO A PASO PARA DEPLOYAR EN RENDER

### PARTE 1: CREAR LA BASE DE DATOS PostgreSQL

1. **Ir a Render Dashboard**
   - Ve a https://dashboard.render.com/
   - Inicia sesión con tu cuenta (GitHub, GitLab o email)

2. **Crear nueva Base de Datos**
   - Haz clic en el botón **"New +"** (arriba a la derecha)
   - Selecciona **"PostgreSQL"**

3. **Configurar la Base de Datos**
   - **Name**: `sistema-inventario-db` (o el nombre que prefieras)
   - **Database**: `sistema_inventario` (se crea automáticamente)
   - **User**: (se genera automáticamente)
   - **Region**: Selecciona la región más cercana (ej: Oregon - USA)
   - **PostgreSQL Version**: Deja la versión más reciente
   - **Plan**: Selecciona **"Free"** para empezar
   
4. **Crear la Base de Datos**
   - Haz clic en **"Create Database"**
   - ⏳ Espera 2-3 minutos mientras se crea
   - ✅ Cuando esté listo, verás el estado "Available"

5. **IMPORTANTE: Copiar la URL de Conexión**
   - En la página de tu base de datos, verás **"Connections"**
   - Busca **"Internal Database URL"** (no la External)
   - Copia esta URL completa (comienza con `postgresql://...`)
   - **GUÁRDALA** - la necesitarás en el siguiente paso

---

### PARTE 2: CREAR EL WEB SERVICE

1. **Subir tu código a GitHub** (si aún no lo has hecho)
   ```bash
   git init
   git add .
   git commit -m "Preparado para deploy en Render"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/tu-repositorio.git
   git push -u origin main
   ```

2. **Crear nuevo Web Service en Render**
   - En Render Dashboard, haz clic en **"New +"**
   - Selecciona **"Web Service"**

3. **Conectar Repositorio**
   - Conecta tu cuenta de GitHub si es la primera vez
   - Busca y selecciona tu repositorio `Sistema-Inventario`
   - Haz clic en **"Connect"**

4. **Configurar el Web Service**
   
   **General:**
   - **Name**: `sistema-inventario` (o tu nombre preferido)
   - **Region**: Misma región que la base de datos
   - **Branch**: `main`
   - **Root Directory**: Dejar vacío
   
   **Build & Deploy:**
   - **Runtime**: `Python 3`
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn sistemaInventario.wsgi:application`
   
   **Plan:**
   - Selecciona **"Free"** para empezar

5. **Configurar Variables de Entorno**
   
   Haz scroll hasta **"Environment Variables"** y agrega las siguientes:
   
   ```
   SECRET_KEY = tu-clave-secreta-super-segura-genera-una-nueva
   DEBUG = False
   ALLOWED_HOSTS = tu-app.onrender.com
   DATABASE_URL = [PEGA AQUÍ LA URL QUE COPIASTE EN PARTE 1, PASO 5]
   PYTHON_VERSION = 3.11.7
   ```
   
   **IMPORTANTE sobre SECRET_KEY:**
   - Genera una nueva clave secreta segura
   - Puedes usar este comando en tu terminal local:
     ```bash
     python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
     ```
   
   **IMPORTANTE sobre ALLOWED_HOSTS:**
   - Reemplaza `tu-app` con el nombre que elegiste en el paso 4
   - Por ejemplo: `sistema-inventario.onrender.com`

6. **Crear el Web Service**
   - Revisa que todo esté correcto
   - Haz clic en **"Create Web Service"**
   - ⏳ Render comenzará a construir y deployar tu app (5-10 minutos)

7. **Monitorear el Deploy**
   - En la página de tu servicio, verás los **"Logs"** en tiempo real
   - Busca mensajes como:
     - ✅ "Build succeeded"
     - ✅ "Installing dependencies"
     - ✅ "Collecting static files"
     - ✅ "Running migrations"
     - ✅ "Your service is live"

---

### PARTE 3: VERIFICACIÓN Y CONFIGURACIÓN INICIAL

1. **Acceder a tu Aplicación**
   - Render te dará una URL como: `https://sistema-inventario.onrender.com`
   - Haz clic en la URL para abrir tu aplicación

2. **Crear Superusuario** (Admin)
   - En Render Dashboard, ve a tu Web Service
   - En la pestaña **"Shell"**, abre una consola
   - Ejecuta el siguiente comando:
     ```bash
     python manage.py createsuperuser
     ```
   - Sigue las instrucciones para crear tu usuario administrador

3. **Acceder al Admin**
   - Ve a: `https://tu-app.onrender.com/admin/`
   - Inicia sesión con las credenciales que creaste

---

## 🔧 SOLUCIÓN DE PROBLEMAS COMUNES

### Error: "DisallowedHost"
- Verifica que `ALLOWED_HOSTS` incluya tu dominio de Render
- Formato: `tu-app.onrender.com` (sin https://)

### Error de Base de Datos
- Verifica que la `DATABASE_URL` esté correctamente copiada
- Usa la **Internal Database URL**, no la External
- La URL debe comenzar con `postgresql://`

### Error: "No such file or directory: build.sh"
- En Render, ve a Settings → Build Command
- Cambia a: `bash build.sh` (agregando "bash" al inicio)

### Archivos Estáticos no se ven
- Verifica que `whitenoise` esté instalado
- En Settings → Environment Variables, agrega:
  ```
  DISABLE_COLLECTSTATIC = 0
  ```

### La app se duerme (plan Free)
- El plan Free de Render duerme la app después de 15 min sin actividad
- Primera carga después de inactividad puede tomar 30-60 segundos

---

## 📝 NOTAS IMPORTANTES

1. **Plan Free de Render:**
   - 750 horas gratis al mes
   - La app se duerme después de 15 min sin uso
   - Base de datos: 90 días de retención, luego expira

2. **Actualizar tu Aplicación:**
   - Solo haz `git push` a tu repositorio
   - Render detecta cambios y redeploya automáticamente

3. **Ver Logs:**
   - En Render Dashboard → Tu Service → Logs
   - Útil para diagnosticar problemas

4. **Variables de Entorno:**
   - NUNCA subas `.env` a GitHub
   - Todas las variables deben estar en Render Settings

5. **Dominio Personalizado:**
   - En Settings → Custom Domains
   - Puedes agregar tu propio dominio

---

## 🎉 ¡DEPLOY COMPLETADO!

Tu Sistema de Inventario ahora está en producción y accesible desde internet.

**Próximos Pasos Recomendados:**
- [ ] Configurar email para notificaciones
- [ ] Crear usuarios y configurar permisos
- [ ] Cargar datos iniciales (productos, almacenes, etc.)
- [ ] Configurar backups de la base de datos
- [ ] Considerar upgrade a plan de pago si es necesario

**URLs Importantes:**
- Dashboard de Render: https://dashboard.render.com/
- Tu App: https://[tu-app].onrender.com
- Admin Django: https://[tu-app].onrender.com/admin/

---

**¿Necesitas ayuda?**
- Documentación de Render: https://render.com/docs
- Consúltame si tienes problemas durante el proceso
