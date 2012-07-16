from django.http import HttpResponse, Http404
from django.shortcuts import render_to_response, render
from django.template.context import RequestContext
from mongohelpers import get_document_or_404, documents_to_json, json_to_document
from data_app.models import Users, Workspace
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

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
    context = {}
    ws = get_document_or_404(Workspace, id=wid)
    students = Users.objects(courses__id__in=ws.rosters)
    extras = ws.extras
    if len(extras):
        jsonstr = "[ %s, %s ]" % (documents_to_json(students,brackets=False),
                                documents_to_json(extras, brackets=False))
    else:
        jsonstr = documents_to_json(students)
    context['json'] = jsonstr
    return render(request, 'data_app/json_template', context)

def workspace(request, wid):
    context = {}
    if request.method == "GET":
        ws = get_document_or_404(Workspace,id=wid)
        context['json'] = documents_to_json(ws)
        return render(request, 'data_app/json_template', context)
    elif request.method == "POST":
        ws, created = json_to_document(Workspace, request.raw_post_data)
        if created:
            return HttpResponse(status=201)
        else:
            return HttpResponse(status=200)

@require_POST            
def create_workspace(request):
    ws, created = json_to_document(Workspace, request.raw_post_data)
    if created:
        return HttpResponse(status=201)
    else:
        return HttpResponse(status=200)
