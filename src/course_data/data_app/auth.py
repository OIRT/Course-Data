from django.http import HttpResponse
from data_app.models import User
from django.conf import settings


def get_current_user(request):
    if "REMOTE_USER" in request.META:
        netid = request.META["REMOTE_USER"]
    elif hasattr(settings, "DEFAULT_USER"):
        netid = settings.DEFAULT_USER
    else:
        return None

    return User.objects(netid=netid).first()


def ensure_authorized(orig_func):
    def auth_func(request, *args, **kwargs):
        user = get_current_user(request)

        if user is not None:
            if "staff" in user.roles or "faculty" in user.roles:
                return orig_func(request, *args, **kwargs)
            else:
                return HttpResponse("You are not authorized to use this application.", status=401)
        else:
            return HttpResponse("You are not authorized to use this application.", status=401)

    return auth_func
