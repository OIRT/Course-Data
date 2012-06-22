## Required Software
- Python 2.7
- Django
- [SASS](http://sass-lang.com/)

## Handling settings.py

We've included a sample `settings.py` file (named `settings.sample`) to get you started on getting the settings straightened out for your computer.

**Be sure to insert a randomly generated key under `SECRET_KEY`in your settings.py!**

## Rendering Views

The templates for data_app are found in the `templates` directory under `data_app`.  This keeps us from having to specify different template directories in `settings.py` for each machine.

## Static Files

Static Files are stored in a `static` directory under `data_app`.  SASS files are stored in the `sass` directory under `static` and are compiled into the `css` directory using the following command while in the `static` directory:

    sass --watch sass:css