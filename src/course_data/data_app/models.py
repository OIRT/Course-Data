from mongoengine import *
from collections import defaultdict, namedtuple


# Not implemented in the database yet.
class Student(EmbeddedDocument):
    student_num = IntField()
    graduation_year = IntField(4)
    recent_math_course = StringField()
    highest_math_course = StringField()
    iclicker_serial = IntField()


class Course(EmbeddedDocument):
    id = StringField()

    # Necessary so that MongoEngine doesn't require all sorts
    # of extra weird fields to be there.
    meta = {'allow_inheritance': False}


class User(Document):
    id = ObjectIdField()
    firstname = StringField()
    lastname = StringField()
    nickname = StringField()
    email = EmailField()
    roles = ListField(StringField())
    ruid = StringField()
    netid = StringField()
    rcpid = IntField()
    courses = ListField(EmbeddedDocumentField(Course))
    student_data = EmbeddedDocumentField(Student)

    meta = {'allow_inheritance': False, 'collection': 'users'}

    def __unicode__(self):
        return "<User: %s>" % self.netid


class Grade(EmbeddedDocument):
    rcpid = IntField()
    eid = StringField()
    entries = ListField(DynamicField())

    def getGrade(self):
        if self.enteredgrade is None:
            return self.points
        else:
            return self.enteredgrade

    meta = {'allow_inheritance': False}


class GradebookItem(EmbeddedDocument):
    name = StringField()
    pointspossible = FloatField()

    meta = {'allow_inheritance': False}

    def __unicode__(self):
        return self.name

class Gradebook(Document):
    gradebook = StringField()
    sections = ListField(StringField())
    items = ListField(EmbeddedDocumentField(GradebookItem))
    entries = ListField(EmbeddedDocumentField(Grade))

    meta = {'allow_inheritance': False, 'collection': 'gradebooks'}

    def __unicode__(self):
        return self.gradebook

    def rcpid_list(self):
        return [s.rcpid for s in self.entries]

    def scores_for_rcpid(self, rcpid):
        scores = [e.entries for e in self.entries if e['rcpid'] == rcpid]
        return scores[0] if scores else None

    def headers(self):
        return [i.name for i in self.items]

    def as_dict(self):
        d = {}
        items =  [ i.name for i in self.items ]
        students = self.rcpid_list()
        for s in students:
            d[s] = dict(map(None, items, self.scores_for_rcpid(s)))
        return d

class Workspace(Document):
    id = ObjectIdField()
    name = StringField(required=True)
    owners = ListField(IntField(), required=True)
    rosters = ListField(StringField())
    extras = ListField(StringField())
    displays = ListField(DictField())
    gradebooks = ListField(StringField())

    meta = {'allow_inheritance': False}

    def __unicode__(self):
        return "<%s>" % self.name

# We assume the first column in an uploaded spreadsheet is a student id
class UserSubmittedData(Document):
    id = ObjectIdField()
    shortname = StringField(required=True)
    longname = StringField()
    owners = ListField(StringField())
    workspaces = ListField(StringField())
    headers = ListField(StringField())
    userdata = MapField(ListField())

    meta = {'allow_inheritance': False}

    def __unicode__(self):
        return "<%s>" % self.shortname

    def full_headers(self):
        return [self.shortname+'.'+h for h in self.headers]
