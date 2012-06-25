import os

from fabric.api import *
from fabric.contrib.project import rsync_project
from fabric.contrib import files, console
from fabric import utils
from fabric.decorators import hosts


# Mostly found on: http://bit.ly/9XlkKZ


RSYNC_EXCLUDE = (
    '.DS_Store',
    '.git',
    '.gitignore',
    '*.pyc',
    '*.example',
    '*.sample',
    'fabfile.py',
    'bootstrap.py',
    '*.css',
    '*.sassc',
)
env.home = '/usr/cddeploy/'
env.project = 'course-data'


def _setup_path():
    env.root = os.path.join(env.home, 'www', env.environment)
    env.code_root = os.path.join(env.root, env.project)
    env.virtualenv_root = os.path.join(env.root, 'env')
    env.settings = '%(project)s.settings_%(environment)s' % env


def staging():
    """ use staging environment on remote host"""
    utils.abort('Staging host not yet configured.')


def production():
    """ use production environment on remote host"""
    env.user = 'cddeploy'
    env.environment = 'production'
    env.hosts = ['analytics.oirt.rutgers.edu']
    _setup_path()


def bootstrap():
    """ initialize remote host environment (virtualenv, deploy, update) """
    require('root', provided_by=('staging', 'production'))
    run('mkdir -p %(root)s' % env)
    run('mkdir -p %s' % os.path.join(env.home, 'www', 'log'))
    create_virtualenv()
    copy_code()
    update_requirements()
    deploy()
    update_apache_config()


def create_virtualenv():
    """ setup virtualenv on remote host """
    require('virtualenv_root', provided_by=('staging', 'production'))
    args = '--clear --distribute'
    run('virtualenv %s %s' % (args, env.virtualenv_root))
    run('source %s' % os.path.join(env.root, 'env', 'bin', 'activate'))

def _run_in_virtualenv(command):
    require('root', provided_by=('staging', 'production'))
    cmd = 'source ' + env.root + '/env/bin/activate'
    cmd += ' && ' + command
    run(cmd)

def deploy():
    """ deploys code to the server and prepares it to execute """
    copy_code()
    collectstatic()
    compile_sass()
    touch()

def copy_code():
    """ rsync code to remote host """
    require('root', provided_by=('staging', 'production'))
#    if env.environment == 'production':
#        if not console.confirm('Are you sure you want to deploy production?',
#                               default=False):
#            utils.abort('Production deployment aborted.')
    # defaults rsync options:
    # -pthrvz
    # -p preserve permissions
    # -t preserve times
    # -h output numbers in a human-readable format
    # -r recurse into directories
    # -v increase verbosity
    # -z compress file data during the transfer
    extra_opts = '--omit-dir-times'
    rsync_project(
        env.root,
        exclude=RSYNC_EXCLUDE,
        delete=True,
        extra_opts=extra_opts,
    )


def update_requirements():
    """ update external dependencies on remote host """
    require('code_root', provided_by=('staging', 'production'))
    requirements = os.path.join(env.code_root, 'requirements')
    with cd(requirements):
        cmd = ['source %s' % os.path.join(env.root, 'env', 'bin', 'activate')]
        cmd += [' && pip install']
#        cmd += ['-E %(virtualenv_root)s' % env]
        cmd += ['--requirement %s' % os.path.join(requirements, 'apps.txt')]
        run(' '.join(cmd))


def touch():
    """ touch wsgi file to trigger reload """
    require('code_root', provided_by=('staging', 'production'))
    apache_dir = os.path.join(env.code_root, 'apache')
    with cd(apache_dir):
        run('touch %s.wsgi' % env.environment)


def update_apache_config():
    """ upload apache configuration to remote host """
    require('root', provided_by=('staging', 'production'))
    source = os.path.join('apache', '%(environment)s.conf' % env)
    dest = os.path.join(env.home, 'apache.conf.d')
    put(source, dest, mode=0755)
    apache_reload()


def configtest():    
    """ test Apache configuration """
    require('root', provided_by=('staging', 'production'))
    run('apachectl configtest')


def apache_reload():    
    """ reload Apache on remote host """
    require('root', provided_by=('staging', 'production'))
    run('sudo /etc/init.d/httpd reload')


def apache_restart():    
    """ restart Apache on remote host """
    require('root', provided_by=('staging', 'production'))
    run('sudo /etc/init.d/httpd restart')

def collectstatic():
    """ collect all static files into a single directory """
    require('root', provided_by=('staging', 'production'))
    with cd(env.code_root):
        run("rm -rf src/static/")
        _run_in_virtualenv("python src/course_data/manage.py collectstatic --noinput -v0 --settings=settings_" + env.environment)

def compile_sass():
    """ compile all of the SASS files on the server """
    require('root', provided_by=('staging', 'production'))
    with cd(env.code_root):
        run("sass --update src/static/data_app/sass/:src/static/data_app/css/")


