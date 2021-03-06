from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response, render
from django.template.context import RequestContext
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.utils import simplejson
from django.template import Template, Context, TemplateSyntaxError
from mongohelpers import get_document_or_404, documents_to_json, json_to_document, getdynamic
from data_app.models import *
from mongoengine.queryset import Q
from itertools import chain
from operator import attrgetter
from auth import *
import cStringIO as StringIO
import json
import csv
import re

# OrderedDict is included in 2.7, 2.6 (on the server) and earlier require
# the addon module.  They work the same, though.
try:
    from collections import OrderedDict
except ImportError:
    from ordereddict import OrderedDict

#####
# Utility functions
#####

def included_user_fields():
    m = AppMetadata.objects(collection="users").first()
    if m:
        return m.fields
    else:
        return []

def all_workspace_students(workspace):
    return User.objects(Q(courses__id__in=workspace.rosters) |
                            Q(id__in=workspace.extras))


def all_workspaces_for_user(user):
    return Workspace.objects(owners=user)


def student_data_table(students):
    headers = included_user_fields()
    studentdata = dict((s.rcpid, []) for s in students)
    for s in students:
        row = []
        for h in headers:
            try:
                row.append(getdynamic(s,h))
            except KeyError:
                row.append("")
        studentdata[s.rcpid].extend(row)
    return studentdata


def student_id_type(id):
    '''Figure out student identifier type
        id could be:
            ruid (only digits)
            email (use django's validate_email)
            netid (doesn't start with a digit)
        Return: "ruid" | "netid" | "email"
    '''

    if re.match(r'^[\d]+$', id):
        return "ruid"
    else:
        try:
            validate_email(id)
            return "email"
        except:
            return "netid"


def id_to_rcpid(id,students):
    ''' Given an id of unspecified type and a queryset of students
        find the rcp of the student represented by id, if they're in the list
        Return: rcpid or None
    '''
    # This clone is because I was getting a strange error when using this in the upload
    # view "duplicate query conditions"
    students = students.clone()
    type = student_id_type(id)
    # Check if the student is in our list
    if type == "netid":
        student = students.filter(netid=id).first()
    elif type == "ruid":
        student = students.filter(ruid=id).first()
    else:
        student = students.filter(email=id).first()

    if student:
        if 'rcpid' in student:
            rcpid = student.rcpid
        else:
            # For guest users from sakai?
            rcpid = student.email
    else:
        rcpid = None
    return rcpid


def merge_uploads_for_students(students, uploads):
    data = {}   # Stuff to return
    headers = list(chain.from_iterable([u.full_headers() for u in uploads]))

    data['_headers'] = headers
    for student in students:
        if 'rcpid' in student:
            rcpid = student.rcpid
        else:
            rcpid = student.email
        data[rcpid] = []
        for upload in uploads:
            h = upload.headers
            filler = [''] * len(h)
            if str(rcpid) in upload.userdata.keys():
                data[rcpid].extend(upload.userdata[str(rcpid)])
            else:
                data[rcpid].extend(filler)

    return data


def merge_data_for_people(people, models):
    """
        Collect data for a certain set of people from a list of model objects.
        Merge results from models that have the same name.
    """
    
    # All headers from the models
    all_headers = list(chain.from_iterable([m.analytics_headers() for m in models]))

    # Initialize a dict containing all people each with all headers,
    # and default values of '' for each header
    data = OrderedDict()
    headers = []
    for h in all_headers:
        if h['title'] not in data.keys():
            data[h['title']] = ''
            headers.append(h)
    persondata = dict((p, data.copy()) for p in people)
    persondata['_headers'] = headers

    for m in models:
        mdata = m.analytics_data_by_person()
        for p in people:
            if p in mdata:
                persondata[p].update(mdata[p])
    return persondata

def collect_data_for_people(people, models):
    """
        Collect data for a certain set of people from a list of model objects
        Expand results for people who aren't included in the models' data
    """
    all_headers = list(chain.from_iterable([m.analytics_headers() for m in models]))
    
    data = {}
    data['_headers'] = all_headers

    for p in people:
        data[p] = []
        for m in models:
            headers = m.analytics_headers()
            mdata = m.analytics_data_by_person()
            if p in mdata.keys():
                for h in headers:
                    data[p].append(mdata[p][h['title']])
            else:
                data[p].extend(['']*len(headers))
    
    return data

def workspace_table_data(wid):
    """
        Collate and return a workspace's data as a list of rows.
        Each row starts with the person's id.
    """
    ws = get_document_or_404(Workspace, id=wid)
    students = all_workspace_students(ws)
    #gradebooks = Gradebook.objects(id__in=ws.gradebooks)
    gradebooks = Gradebook.objects(sections__in=ws.rosters)
    uploads = UserSubmittedData.objects(workspaces__contains=wid)
    courses = CourseData.objects(sections__in=ws.rosters)
    rcpids = [s.rcpid for s in students]
    
    studentdata = {}
    gradebookdata = {}
    uploaddata = {}
    coursedata = {}

    doGrades = (len(gradebooks) > 0)
    doUploads = (len(uploads) > 0)
    doCourses = (len(courses) > 0)

    userheaders = included_user_fields()
    studentdata = student_data_table(students)

    if doGrades:
        gradebookdata = merge_data_for_people(rcpids, gradebooks)
#        gradebookdata = merge_gradebooks_for_students(students, gradebooks)
    if doUploads:
        uploaddata = merge_uploads_for_students(students, uploads)
    if doCourses:
        coursedata = collect_data_for_people(rcpids, courses)

    # Combine all the data into a table format
    headers = [{"source": "User Data", "title": "rcpid"}]
    headers.extend({"source": "User Data", "title": header} for header in userheaders)
    if doGrades:
        headers.extend(gradebookdata['_headers'])
#        gradeheaders = gradebookdata.itervalues().next().keys()
#        filler = [''] * len(gradebookdata['_headers'])
#        headers.extend({"source": "Gradebook Data", "title": header} for header in gradeheaders)
    if doUploads:
        headers.extend({"source": "Uploaded Data", "title": header} for header in uploaddata['_headers'])
    if doCourses:
        headers.extend(coursedata['_headers'])


    tabledata = []
    for s in students:
        person = s.rcpid
        row = [person]
        row.extend(studentdata[person])
        if doGrades:
            if person in gradebookdata.iterkeys():
                row.extend(gradebookdata[person].values())
            else:
                row.extend(['']*len(gradebookdata['_headers']))
        if doUploads:
            if person in uploaddata.iterkeys():
                row.extend(uploaddata[person])
        if doCourses:
            if person in coursedata.iterkeys():
                row.extend(coursedata[person])
        tabledata.append(row)


    return (headers, tabledata)


#####
# Views
######

def index(request):
    return HttpResponseRedirect("/userLookup")


@ensure_authorized
@ensure_csrf_cookie
def userLookup(request):
    workspaces = all_workspaces_for_user(get_current_user(request).rcpid)
    workspaces = sorted(workspaces, key=attrgetter('name'))
    context = {"workspaces": workspaces}
    return render_to_response('data_app/userLookup.html', Context(context), context_instance=RequestContext(request))


@ensure_authorized
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


@ensure_authorized
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


@ensure_authorized
@require_POST
def add_workspace_user(request, wid):
    ws = Workspace.objects(id=wid).first()
    user = User.objects(netid=request.POST["netid"]).first()
    if user is not None and user.rcpid not in ws.owners:
        ws.owners.append(user.rcpid)
        ws.save()
        return HttpResponse(simplejson.dumps({"status": "success", "rcpid": user.rcpid}), mimetype="application/json")
    else:
        return HttpResponse(simplejson.dumps({"status": "failure"}), mimetype="application/json")


@ensure_authorized
def fetch_workspace_users(request, wid):
    ws = get_document_or_404(Workspace, id=wid)
    rcpids = ws.owners
    users = User.objects(rcpid__in=rcpids).exclude("courses")
    jsonstr = documents_to_json(users)
    return HttpResponse(jsonstr, mimetype="application/json")


@ensure_authorized
def fetch_workspaces_for_user(request, uid):
    workspaces = all_workspaces_for_user(uid)
    jsonstr = documents_to_json(workspaces)
    return HttpResponse(jsonstr, mimetype="application/json")


@ensure_authorized
def workspace(request, wid):
    if request.method == "GET":
        ws = get_document_or_404(Workspace,id=wid)
        jsonstr = documents_to_json(ws)
        return HttpResponse(jsonstr, mimetype="application/json")
    elif request.method == "POST":
        return create_workspace(request)


@ensure_authorized
@require_POST
def delete_workspace(request):
    workspaceId = request.POST["workspaceId"]
    workspace = Workspace.objects(id=workspaceId)
    if workspace is not None:
        workspace.delete()
        return HttpResponse(status=200)
    else:
        return HttpResponse(status=404)


@ensure_authorized
@require_POST
def fetch_gradebooks_for_sections(request):
    gradebooks = Gradebook.objects(sections__in=[request.POST['sections[]']])
    return HttpResponse(documents_to_json(gradebooks), mimetype="application/json")


@ensure_authorized
@require_POST
def create_workspace(request):
    ws, created = json_to_document(Workspace, request.raw_post_data, False)
    if created:
        ws.owners.append(get_current_user(request).rcpid)
        ws.save()
        return HttpResponse(simplejson.dumps({"workspaceId": str(ws.id)}), mimetype="application/json")
    else:
        ws.save()
        return HttpResponse(status=200)


@ensure_authorized
def send_emails(request, preview):
    try:
        template = Template(request.POST["body"])
        users = request.POST.getlist("users[]")
        headers, data = workspace_table_data(request.POST["wid"])
        dataHeaders = [header["title"] for header in headers]
        dataDict = dict((d[0], d) for d in data[0:])

        for user in users:
            contextDict = dict((re.sub("[^A-Za-z0-9_]", "", head), value) for (head, value) in zip(dataHeaders, dataDict[int(user)]))
            context = Context(contextDict)

            if contextDict["email"] is not None and contextDict["email"] is not '':
                if not preview:
                    send_mail(request.POST["subject"], template.render(context), get_current_user(request).email, [contextDict["email"]], fail_silently=False)
                else:
                    name = contextDict["firstname"] + " " + contextDict["lastname"]
                    return HttpResponse(simplejson.dumps({"result": "success", "name": name, "email": template.render(context)}), mimetype="application/json")

        result = "success"
        error = ""
    except TemplateSyntaxError as ex:
        result = "bad template"
        error = "<strong>No E-Mails Sent:</strong> The template below is invalid."
    except Exception as ex:
        result = "error"
        error = "Unknown Error: " + str(ex)

    return HttpResponse(simplejson.dumps({"result": result, "error": str(error)}), mimetype="application/json")


@ensure_authorized
def table(request, wid):
    headers, data = workspace_table_data(wid)
    jsonstr = json.dumps({"headers": headers, "data": data})
    return HttpResponse(jsonstr, mimetype="application/json")


@ensure_authorized
def fetch_upload_list(request, wid):
    uploads = UserSubmittedData.objects(workspaces=wid)
    return HttpResponse(documents_to_json(uploads), mimetype="application/json")


@ensure_authorized
@require_POST
def remove_upload(request):
    wid = request.POST["workspace"]
    uploadId = request.POST["upload"]

    upload = UserSubmittedData.objects(id=uploadId).first()
    upload.workspaces.remove(wid)
    upload.save()

    return HttpResponse(status=200)


@ensure_authorized
@require_POST
def upload(request, wid, display):
    if 'shortname' in request.POST and request.POST['shortname'] != '':
        doc = UserSubmittedData(shortname=request.POST['shortname'])
    else:
        return HttpResponse("Shortname is required.", status=400)
    if 'longname' in request.POST:
        doc.longname = request.POST['longname']

    file = request.FILES['fileUpload']
    data = [row for row in csv.reader(file.read().splitlines())]
    userdata = {}
    headers = data.pop(0)
    doc.headers = headers
    allusers = User.objects.all()
    for row in data:
        id = row[0]
        rcpid = id_to_rcpid(id,allusers)
        doc.userdata[str(rcpid)] = row

    doc.workspaces.append(wid)
    doc.save()
    return HttpResponseRedirect("/userLookup?wid=" + wid + "&display=" + display)


@ensure_authorized
def export(request, wid):
    headers, data = workspace_table_data(wid)
    buffer = StringIO.StringIO()

    for header in headers:
        buffer.write(str(header["title"]) + ",")
    buffer.write("\n")

    for row in data:
        for cell in row:
            buffer.write(str(cell) + ",")
        buffer.write("\n")

    ws = Workspace.objects(id=wid).first()
    filename = ws.name.replace(" ", "_") + ".csv"

    response = HttpResponse(buffer.getvalue(), content_type="text/csv")
    response["Content-Disposition"] = 'attachment;filename=' + filename
    response["Content-Length"] = buffer.tell()
    return response
