import os
import sys
import site

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__)) + "/../src/course_data/"
print PROJECT_ROOT
site_packages = os.path.join(PROJECT_ROOT, 'env/lib/python2.6/site-packages')
site.addsitedir(os.path.abspath(site_packages))

sys.path.insert(0, PROJECT_ROOT)
os.environ['DJANGO_SETTINGS_MODULE'] = 'course_data.settings_production'

import django.core.handlers.wsgi
application = django.core.handlers.wsgi.WSGIHandler()