## Required Software
- Python 2.6 (or 2.7)
- Django
- [SASS](http://sass-lang.com/)
- [MongoDB](http://www.mongodb.org/downloads)
- [Mongoengine](http://mongoengine.org/)
- [Fabric](http://fabfile.org/) (to automatically deploy to a remote server)
- If running Python 2.6:
    - [OrderedDict](http://pypi.python.org/pypi/ordereddict/)

## Handling settings.py

We've included a `settings_base.py` file to get you started on getting the settings straightened out for your computer.  You can create a new `settings.py` file that inherits from this one and only overrides the necessary settings.

### Some to consider:

#### Database Settings
	from mongoengine import connect
	connect('coursedata')

#### Debug
	DEBUG = True
	
#### SECRET_KEY
	SECRET_KEY = "Make this secret."
	
#### STATIC_ROOT
	STATIC_ROOT = "/src/static"

#### EMAIL_BACKEND
	# To write to a file
	EMAIL_BACKEND = 'django.core.mail.backends.filebased.EmailBackend'
	EMAIL_FILE_PATH = '/usr/cddeploy/emails'
	

## Rendering Views

The templates for data_app are found in the `templates` directory under `data_app`.  This keeps us from having to specify different template directories in `settings.py` for each machine.

## Static Files

Static Files are stored in a `static` directory under `data_app`.  SASS files are stored in the `sass` directory under `static` and are compiled into the `css` directory using the following command while in the `static` directory:

    sass --watch sass:css

Or, from the main project directory:

	sass --watch src/course_data/data_app/static/data_app/sass:src/course_data/data_app/static/data_app/css

SASS files are automatically compiled to CSS files on the server side when using the automatic deployment routine.