from django.db import models

class TipoCambio(models.Model):

    MONEDAS = (
        ('USD', 'Dólar'),
        ('BOB', 'Boliviano'),
    )

    moneda = models.CharField(
        max_length=10,
        choices=MONEDAS
    )

    valor = models.DecimalField(
        max_digits=10,
        decimal_places=4
    )

    fecha = models.DateField(auto_now_add=True)

    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Tipo de Cambio"
        verbose_name_plural = "Tipos de Cambio"
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.moneda} - {self.valor}"