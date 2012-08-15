import os
import sys
import site

os.environ['DJANGO_SETTINGS_MODULE'] = 'course_data.settings_production'

import django.core.handlers.wsgi
application = django.core.handlers.wsgi.WSGIHandler()