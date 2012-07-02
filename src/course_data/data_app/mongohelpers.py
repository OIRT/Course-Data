from django.http import Http404


def get_document_or_404(klass, *args, **kwargs):
        try:
                return klass.objects.get(*args, **kwargs)
        except klass.DoesNotExist:
                raise Http404('Document does not exist.')

