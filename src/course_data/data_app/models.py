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

    meta = {'allow_inheritance': False}
