from django.shortcuts import render_to_response
from django.template.context import RequestContext
from models import *
#import time


def index(request):
    return render_to_response('data_app/index.html', {}, context_instance=RequestContext(request))


def users(request):
#    f = open("/Users/eric/log", "w")
#    timev = time.time()

    members = User()._data.keys()

#    f.write("Found Members: " + str((time.time() - timev) * 1000) + "\n")
#    timev = time.time()

    site = Gradebook.objects().filter(gradebook="0002ed6f-7823-4075-b239-867292eda762").first()

#    f.write("Found Site: " + str((time.time() - timev) * 1000) + "ms\n")
#    timev = time.time()

    gradeData = {}

    items = site.items
    siteItemsLength = len(items)

#    timet = time.time()
#    timea = 0
#    timeu = 0
#    timen = 0
#    timel = 0

#    count = 0
    for i, item in enumerate(items):
        members.append(item.name)
#        timea += time.time() - timet
#        timet = time.time()
        for grade in item.grades:
#            count += 1
            if grade.rcpid in gradeData:
                gr = gradeData[grade.rcpid]

#                timel += time.time() - timet
#                timet = time.time()

                gr[i] = grade.getGrade()

#                timeu += time.time() - timet
#                timet = time.time()

            else:
                gradeData[grade.rcpid] = [None] * siteItemsLength
                gradeData[grade.rcpid][i] = grade.getGrade()

#                timen += time.time() - timet
#                timet = time.time()

#    f.write("timea: " + str(timea) + "s\n")
#    f.write("timel: " + str(timel) + "s\n")
#    f.write("timeu: " + str(timeu) + "s\n")
#    f.write("timen: " + str(timen) + "s\n")
#    f.write("count: " + str(count) + " grades\n")
#    f.write("Generated Gradedata: " + str((time.time() - timev) * 1000) + "ms\n")
#    timev = time.time()

    users = User.objects(__raw__={"courses.id": {"$in": site.sections}})
#    f.write("Found Users: " + str((time.time() - timev) * 1000) + "ms\n")
#    timev = time.time()

    list = []
    for user in users:
        data = user._data.values() + gradeData[user.rcpid]
        list.append(data)

#    f.write("Generated Final List: " + str((time.time() - timev) * 1000) + "ms\n")
#    f.close()

    return render_to_response('data_app/users.html', {'vars': members, 'valsList': list})


def userLookup(request):
    return render_to_response('data_app/userLookup.html', {}, context_instance=RequestContext(request))
