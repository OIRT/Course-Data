from django.conf.urls.defaults import patterns, url

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

urlpatterns = patterns('data_app.views',
    url(r'^$', 'index'),
    url(r'^users$', 'users'),
    url(r'^userLookup$', 'userLookup')

    # Examples:
    # url(r'^$', 'course_data.views.home', name='home'),
    # url(r'^course_data/', include('course_data.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    # url(r'^admin/', include(admin.site.urls)),
)
