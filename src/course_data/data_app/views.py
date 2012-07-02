from django.shortcuts import render_to_response
from django.template.context import RequestContext
from models import *


def index(request):
    return render_to_response('data_app/index.html', {}, context_instance=RequestContext(request))


def users(request):
    list = []
    members = User()._data.keys()
    site = Gradebook.objects().filter(gradebook="0b95884f-14f2-48db-b5bb-d9ac784acbd2").first()

    for user in User.objects(__raw__={"courses.id": {"$in": site.sections}}):
        list.append(user._data.values())

    return render_to_response('data_app/users.html', {'vars': members, 'valsList': list})


def userLookup(request):
    return render_to_response('data_app/userLookup.html', {}, context_instance=RequestContext(request))
