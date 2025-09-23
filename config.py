import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'mysecretkey')  # change in production
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'postgresql://postgres:admin1234@localhost/attendance_app'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
