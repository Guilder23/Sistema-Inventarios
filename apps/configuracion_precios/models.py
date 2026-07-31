from django.db import models 

class ConfiguracionPrecios(models.Model):
    aumento_mayor=models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    aumento_unidad=models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    # la clase meta proporciona información adicional sobre el modelo, como el nombre en singular y plural que se mostrará en la interfaz de administración de Django.
    class Meta:
        verbose_name = "configuracion_precios"
        verbose_name_plural = "configuracion_precios"

    def __str__(self):
        # Devuelve una representación en cadena del objeto
        return f"Aumento Mayor: +${self.aumento_mayor} | Unidad: +${self.aumento_unidad}"