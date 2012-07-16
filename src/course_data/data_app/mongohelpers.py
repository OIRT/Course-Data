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

def documents_to_json(docs, brackets=True, **kwargs):
    """ Takes a mongoengine document or QuerySet/list of documents, returns json.
    Use brackets=False to leave out the outer "[ ]", useful for appending different lists
    Extra arguments are passed on to json.dumps()
    
    """
    if isinstance(docs, QuerySet) or isinstance(docs, list):
        jsonlist = []
        for d in docs:
            jsonlist.append(documents_to_json(d, **kwargs))
        if brackets:
            jsonstr = "[ %s ]" % ",".join(jsonlist)
        else:
            jsonstr = ",".join(jsonlist)
    else:
        jsonstr = json.dumps(docs.to_mongo(), default=json_util.default, **kwargs)
    return jsonstr

def json_to_document(klass, jstr):
    """Take json and use it to update or create a document
        Returns the created document
    """
    d = json.loads(jstr,object_hook=json_util.object_hook)
    if "id" in d:
        created = 0
        doc = get_document_or_404(klass, id=d['id'])
    else:
        created = 1;
        doc = klass()
    for k,v in d.iteritems():
        if k != "_id" and k != "id":
            doc[k] = v
    doc.save()
    return (doc, created)
            