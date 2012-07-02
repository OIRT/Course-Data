from django.http import HttpResponse, Http404
from django.shortcuts import render_to_response, render
from django.template.context import RequestContext
from mongohelpers import get_document_or_404
from data_app.models import Users

def index(request):
    return render_to_response('data_app/index.html', {}, context_instance=RequestContext(request))

def data_index(request):
	return render(request, 'data_app/index.html')

def fetch_many_users(request, retformat=""):
	context = {}
	context["retformat"] = retformat
	count = Users.objects.count()
	context["count"] = count
	return render(request, 'data_app/many_users.html', context)
	
def fetch_one_user(request, attr, id, retformat=""):
	context = {}
	filter = { attr : id }	
	user = get_document_or_404(Users, **filter)
	context["retformat"] = retformat
	context["attribute"] = attr
	context["id"] = id
	context["user"] = user
	return render(request, 'data_app/one_user.html', context)
