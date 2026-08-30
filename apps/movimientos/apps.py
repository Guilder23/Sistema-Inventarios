from django.apps import AppConfig


class MovimientosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.movimientos'
    verbose_name = 'Movimientos de Stock'

    def ready(self):
        import apps.movimientos.signals  # noqa: F401
