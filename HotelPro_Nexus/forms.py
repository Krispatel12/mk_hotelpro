from django import forms
from django.contrib.auth.forms import UserChangeForm, AuthenticationForm
from .models import CustomUser

class CustomUserCreationForm(forms.ModelForm):
    class Meta:
        model = CustomUser
        fields = ('email', 'username')

class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = CustomUser
        fields = ('username', 'email')

class OTPVerificationForm(forms.Form):
    otp = forms.CharField(max_length=6, min_length=6, widget=forms.TextInput(attrs={'placeholder': 'Enter 6-digit OTP'}))

class CustomLoginForm(AuthenticationForm):
    username = forms.EmailField(
        label="Email",
        widget=forms.EmailInput(attrs={'placeholder': 'name@hotel.com', 'class': 'form-control'})
    )

class ContactForm(forms.Form):
    name = forms.CharField(max_length=100, widget=forms.TextInput(attrs={
        'placeholder': 'Your Name',
        'class': 'w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-primary-500 transition-all outline-none'
    }))
    email = forms.EmailField(widget=forms.EmailInput(attrs={
        'placeholder': 'Your Email',
        'class': 'w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-primary-500 transition-all outline-none'
    }))
    subject = forms.CharField(max_length=200, widget=forms.TextInput(attrs={
        'placeholder': 'Subject',
        'class': 'w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-primary-500 transition-all outline-none'
    }))
    message = forms.CharField(widget=forms.Textarea(attrs={
        'placeholder': 'How can we help?',
        'rows': 4,
        'class': 'w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-primary-500 transition-all outline-none'
    }))
