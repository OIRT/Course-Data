from mongoengine.queryset import QuerySet
from mongoengine import Document, ObjectIdField
from django.http import Http404
import json
from bson import json_util

def get_document_or_404(klass, *args, **kwargs):
        try:
                return klass.objects.get(*args, **kwargs)
        except klass.DoesNotExist:
                raise Http404('Document does not exist.')

def documents_to_json(docs, **kwargs):
    """ Takes a mongoengine document or QuerySet, returns json.
    
    Extra arguments are passed on to json.dumps()
    
    """
    if isinstance(docs, QuerySet):
        jsonlist = []
        for d in docs:
            jsonlist.append(documents_to_json(d, **kwargs))
        jsonstr = "[ %s ]" % ",".join(jsonlist)
    else:
        jsonstr = json.dumps(docs.to_mongo(), default=json_util.default, **kwargs)
    return jsonstr
    