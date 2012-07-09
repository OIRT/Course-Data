from django.http import HttpResponse, Http404
from django.shortcuts import render_to_response, render
from django.template.context import RequestContext
from mongohelpers import get_document_or_404, documents_to_json
from data_app.models import Users

def index(request):
    return render_to_response('data_app/index.html', {}, context_instance=RequestContext(request))

def data_index(request):
    return render(request, 'data_app/index.html')


def fetch_many_users(request, retformat=""):
    context = {}
    # For now just return 100 users, eventually this will be based on submitted parameters
    users = Users.objects.limit(100)
    if retformat == 'json':
        context['json'] = documents_to_json(users)
        return render(request, 'data_app/json_template',context)
    context["retformat"] = retformat
    count = Users.objects.count()
    context["count"] = count
    return render(request, 'data_app/many_users.html', context)
    
def fetch_one_user(request, attr, id, retformat=""):
    context = {}
    filter = { attr : id }	
    user = get_document_or_404(Users, **filter)
    if retformat == 'json':
        context['json'] = documents_to_json(user)
        return render(request,'data_app/json_template', context)
    context["retformat"] = retformat
    context["attribute"] = attr
    context["id"] = id
    context["user"] = user
    return render(request, 'data_app/one_user.html', context)

def fetch_workspace_users(request, wid):
    pass
    
def workspace(request, wid):
    pass
    
def create_workspace(request):
    pass
