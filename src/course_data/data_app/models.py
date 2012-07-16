from mongoengine import *


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
    enteredgrade = StringField()
    points = FloatField()

    def getGrade(self):
        if self.enteredgrade is None:
            return self.points
        else:
            return self.enteredgrade

    meta = {'allow_inheritance': False}


class GradebookItem(EmbeddedDocument):
    name = StringField()
    grades = ListField(EmbeddedDocumentField(Grade))
    pointspossible = FloatField()

    meta = {'allow_inheritance': False}


class Gradebook(Document):
    gradebook = StringField()
    sections = ListField(StringField())
    items = ListField(EmbeddedDocumentField(GradebookItem))

    meta = {'allow_inheritance': False}


class Workspace(Document):
    id = ObjectIdField()
    name = StringField(required=True)
    owners = ListField(ReferenceField(User), required=True)
    rosters = ListField(StringField())
    extras = ListField(ReferenceField(User))
    display = DictField()

    meta = {'allow_inheritance': False}

    def __unicode__(self):
        return "<%s>" % self.name
