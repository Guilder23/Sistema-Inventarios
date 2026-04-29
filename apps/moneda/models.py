from django.db import models

class TipoCambio(models.Model):

    MONEDAS = (
        ('USD', 'Dólar'),
        ('BOB', 'Boliviano'),
    )

    CONTEXTOS = (
        ('general', 'Sistema General'),
        ('tienda_principal', 'Tienda Principal'),
    )

    moneda = models.CharField(
        max_length=10,
        choices=MONEDAS
    )

    contexto = models.CharField(
        max_length=30,
        choices=CONTEXTOS,
        default='general'
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
        return f"{self.get_contexto_display()} - {self.moneda} - {self.valor}"