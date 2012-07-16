from django.http import HttpResponse, Http404
from django.shortcuts import render_to_response, render
from django.template.context import RequestContext
from mongohelpers import get_document_or_404, documents_to_json
from data_app.models import *


def index(request):
    return render_to_response('data_app/index.html', {}, context_instance=RequestContext(request))


def users(request):
    members = User()._data.keys()

    site = Gradebook.objects().filter(gradebook="0002ed6f-7823-4075-b239-867292eda762").first()

    gradeData = {}

    items = site.items
    siteItemsLength = len(items)

    for i, item in enumerate(items):
        members.append(item.name)

        for grade in item.grades:
            if grade.rcpid in gradeData:
                gr = gradeData[grade.rcpid]

                gr[i] = grade.getGrade()
            else:
                gradeData[grade.rcpid] = [None] * siteItemsLength
                gradeData[grade.rcpid][i] = grade.getGrade()

    users = User.objects(__raw__={"courses.id": {"$in": site.sections}})

    list = []
    for user in users:
        data = user._data.values() + gradeData[user.rcpid]
        list.append(data)

    return render_to_response('data_app/users.html', {'vars': members, 'valsList': list})


def userLookup(request):
    return render_to_response('data_app/userLookup.html', {}, context_instance=RequestContext(request))


def data_index(request):
    return render(request, 'data_app/index.html')


def fetch_many_users(request, retformat=""):
    context = {}
    # For now just return 100 users, eventually this will be based on submitted parameters
    users = Users.objects.limit(100)
    if retformat == 'json':
        context['json'] = documents_to_json(users)
        return render(request, 'data_app/json_template', context)
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
        return render(request, 'data_app/json_template', context)
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
        jsonstr = "[ %s, %s ]" % (documents_to_json(students, brackets=False),
                                documents_to_json(extras, brackets=False))
    else:
        jsonstr = documents_to_json(students)
    context['json'] = jsonstr
    return render(request, 'data_app/json_template', context)


def workspace(request, wid):
    context = {}
    if request.method == "GET":
        ws = get_document_or_404(Workspace, id=wid)
        context['json'] = documents_to_json(ws)
        return render(request, 'data_app/json_template', context)
    elif request.method == "POST":
        pass  # TODO: update the workspace


def create_workspace(request):
    pass

