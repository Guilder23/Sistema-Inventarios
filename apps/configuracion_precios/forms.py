from django import forms

from .models import ConfiguracionPrecios


class ConfiguracionPreciosForm(forms.ModelForm):
    class Meta:
        model = ConfiguracionPrecios
        fields = ['aumento_mayor', 'aumento_unidad']
        labels = {
            'aumento_mayor': 'Aumento al por mayor',
            'aumento_unidad': 'Aumento por unidad',
        }
        widgets = {
            'aumento_mayor': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': '0.01',
                'min': '0',
                'placeholder': '0.00',
            }),
            'aumento_unidad': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': '0.01',
                'min': '0',
                'placeholder': '0.00',
            }),
        }
