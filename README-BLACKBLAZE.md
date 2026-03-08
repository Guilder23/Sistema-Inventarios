PASOS PARA IMPLEMENTAR BLACKBLAZE

Instalar django storage para blackblaze: pip install django-storages boto3

imagen = models.ImageField(upload_to='productos/')  # Se guarda en Backblaze
    ficha_tecnica = models.FileField(upload_to='pdfs/', blank=True, null=True)  # PDF