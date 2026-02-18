from django.urls import path

from contacts import views

urlpatterns = [
    path("contact-form/", views.ContactFormView.as_view(), name="contact-form"),
    path("newsletter/", views.NewsletterView.as_view(), name="newsletter"),
]
