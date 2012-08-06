from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response, render
from django.template.context import RequestContext
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.core.mail import send_mail
from django.utils import simplejson
from django.template import Template, Context, TemplateSyntaxError
from mongohelpers import get_document_or_404, documents_to_json, json_to_document
from data_app.models import *
from mongoengine.queryset import Q
from itertools import chain
import json
import csv


#####
# Utility functions
#####

TABLE_STUDENT_INCLUDE = ['firstname','lastname','nickname','email','netid']

def all_workspace_students(workspace):
    return User.objects(Q(courses__id__in=workspace.rosters) |
                            Q(id__in=workspace.extras))


def student_data_table(students):
    headers = TABLE_STUDENT_INCLUDE
    studentdata = dict((s.rcpid, []) for s in students)
    for s in students:
        row = []
        for h in headers:
            row.append(s[h])
        studentdata[s.rcpid].extend(row)
    return studentdata


def merge_gradebooks_for_students(students,gradebooks):
    # Unique list of all gradebook headers
    all_gradebook_items = list(chain.from_iterable([gb.items for gb in gradebooks]))
    gradebook_headers = set([i.name for i in all_gradebook_items])

    # Initialize a dict containing all students each with all gradebook headers,
    # and default values of '' for each assignment
    data = dict((h,'') for h in gradebook_headers)
    studentdata = dict((s.rcpid, data.copy()) for s in students)
    #assert False, [len(v.keys()) for k,v in studentdata.iteritems()]
    for gb in gradebooks:
        gbdict = gb.as_dict()
        for s in studentdata:
            if s in gbdict:
                studentdata[s].update(gbdict[s])
    return studentdata


#####
# Views
######


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


@ensure_csrf_cookie
def userLookup(request):
    return render_to_response('data_app/userLookup.html', {}, context_instance=RequestContext(request))


def data_index(request):
    return render(request, 'data_app/index.html')


def fetch_many_users(request, retformat=""):
    context = {}
    # For now just return 100 users, eventually this will be based on submitted parameters
    users = User.objects.limit(100)
    if retformat == 'json':
        context['json'] = documents_to_json(users)
        return render(request, 'data_app/json_template', context)
    context["retformat"] = retformat
    count = User.objects.count()
    context["count"] = count
    return render(request, 'data_app/many_users.html', context)


def fetch_one_user(request, attr, id, retformat=""):
    context = {}
    filter = { attr : id }
    user = get_document_or_404(User, **filter)
    if retformat == 'json':
        context['json'] = documents_to_json(user)
        return render(request, 'data_app/json_template', context)
    context["retformat"] = retformat
    context["attribute"] = attr
    context["id"] = id
    context["user"] = user
    return render(request, 'data_app/one_user.html', context)


def fetch_workspace_users(request, wid):
    ws = get_document_or_404(Workspace, id=wid)
    students = all_workspace_students(ws)
    jsonstr = documents_to_json(students)
    return HttpResponse(jsonstr, mimetype="application/json")


def workspace(request, wid):
    if request.method == "GET":
        ws = get_document_or_404(Workspace,id=wid)
        jsonstr = documents_to_json(ws)
        return HttpResponse(jsonstr, mimetype="application/json")
    elif request.method == "POST":
        return create_workspace(request)


@require_POST
def create_workspace(request):
    ws, created = json_to_document(Workspace, request.raw_post_data)
    if created:
        return HttpResponse(status=201)
    else:
        return HttpResponse(status=200)


def send_emails(request):
    try:
        template = Template(request.POST["body"])
        users = request.POST.getlist("users[]")
        data = workspace_table_data(request.POST["wid"])
        dataHeaders = data[0]
        dataDict = dict((d[0], d) for d in data[1:])

        for user in users:
            contextDict = dict((head.replace(" ", "_"), value) for (head, value) in zip(dataHeaders, dataDict[int(user)]))
            context = Context(contextDict)
            send_mail(request.POST["subject"], template.render(context), "someone@else.com", [contextDict["email"]], fail_silently=False)

        result = "success"
        error = ""
    except TemplateSyntaxError as ex:
        result = "bad template"
        error = "<strong>No E-Mails Sent:</strong> The template below is invalid."
    except Exception as ex:
        result = "error"
        error = ex

    return HttpResponse(simplejson.dumps({"result": result, "error": error}), mimetype="application/json")

def workspace_table_data(wid):
    """
        Collate and return a workspace's data as a list of rows.
        Each row starts with the person's id.
    """
    ws = get_document_or_404(Workspace, id=wid)
    students = all_workspace_students(ws)
    gradebooks = Gradebook.objects(id__in=ws.gradebooks)
    rcpids = []
    studentdata = {}
    gradebookdata = {}
    userheaders = TABLE_STUDENT_INCLUDE
    studentdata = student_data_table(students)
    gradebookdata = merge_gradebooks_for_students(students,gradebooks)

    # Combine all the data into a table format
    headers = ['rcpid']
    headers.extend(userheaders)
    gradeheaders = gradebookdata.itervalues().next().keys()
    filler = [''] * len(gradeheaders)
    headers.extend(gradeheaders)

    tabledata = []
    tabledata.append(headers)
#    for person,grades in gradebookdata.iteritems():
    for s in students:
        person = s.rcpid
        row = [person]
        row.extend(studentdata[person])
        if person in gradebookdata.iterkeys():
            row.extend(gradebookdata[person].values())
        else:
            row.extend(filler)
        tabledata.append(row)

    return tabledata

def table(request, wid):
    data = workspace_table_data(wid)
    jsonstr = json.dumps(data)
    return HttpResponse(jsonstr, mimetype="application/json")

@require_POST
def upload(request, wid):
    ws = get_document_or_404(Workspace, id=wid)
    if 'shortname' in request.POST and request.POST['shortname'] != '':
        doc = UserSubmittedData(shortname=request.POST['shortname'])
    else:
        return HttpResponse("Shortname is required.", status=400)
    if 'longname' in request.POST:
        doc.longname = request.POST['longname']

    file = request.FILES['file']
    data = [row for row in csv.reader(file)]
    doc.data = data
    doc.workspaces.append(wid)
    doc.save()
    return HttpResponseRedirect("/userLookup")
