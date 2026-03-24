from django import template

register = template.Library()

@register.filter(name='split')
def split(value, arg):
    return value.split(arg)

@register.filter(name='is_video')
def is_video(value):
    """Returns True if the file has a video extension."""
    if not value:
        return False
    video_extensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv']
    return any(str(value).lower().endswith(ext) for ext in video_extensions)
