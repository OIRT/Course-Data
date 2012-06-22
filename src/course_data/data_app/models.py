from django.db import models

class CourseEntry(models.Model):
    courseNumber = models.IntegerField()
    studentName = models.TextField()