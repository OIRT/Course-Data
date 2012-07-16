## Required Software
- Python 2.6 (or 2.7)
- [SASS](http://sass-lang.com/)
- [MongoDB](http://www.mongodb.org/downloads)
- [Mongoengine](http://mongoengine.org/)
- [Fabric](http://fabfile.org/) (to automatically deploy to a remote server)

## Handling settings.py

We've included a sample `settings.py` file (named `settings.sample`) to get you started on getting the settings straightened out for your computer.

Be sure to insert a randomly generated key under `SECRET_KEY`in your `settings.py`!

You'll also want to make sure that your database settings are accurate and that `STATIC_ROOT` points to where you want your static files collected.  Static files are automatically collected to this location on the server when using the automatic deployment routine provided.

## Rendering Views

The templates for data_app are found in the `templates` directory under `data_app`.  This keeps us from having to specify different template directories in `settings.py` for each machine.

## Static Files

Static Files are stored in a `static` directory under `data_app`.  SASS files are stored in the `sass` directory under `static` and are compiled into the `css` directory using the following command while in the `static` directory:

    sass --watch sass:css

SASS files are automatically compiled to CSS files on the server side when using the automatic deployment routine.