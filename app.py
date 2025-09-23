import os
import secrets
import smtplib
import pandas as pd
import time
from datetime import datetime
from functools import wraps
from email.mime.text import MIMEText

from flask import (
    Flask, render_template, request, redirect, url_for,
    flash, session, g
)
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_moment import Moment
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import pytz
from flask import request, redirect, url_for, flash
from flask_login import login_required, LoginManager, current_user, login_user
from flask_login import login_user
from flask_wtf import CSRFProtect
from flask_login import UserMixin
from flask_wtf import FlaskForm
from wtforms import StringField, EmailField
from wtforms.validators import InputRequired, Email
from flask_wtf.csrf import generate_csrf
from flask import request, jsonify
from dotenv import load_dotenv
load_dotenv()

smtp_user = os.getenv("SMTP_USER")
smtp_pass = os.getenv("SMTP_PASSWORD")

# -------------------------
# Flask Setup
# -------------------------
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", secrets.token_hex(16))

# DB Setup
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL', 'postgresql://postgres:admin1234@localhost/attendance_app'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

login_manager = LoginManager()
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))  
login_manager.login_view = 'login'  # Redirects to login page if not logged in

db = SQLAlchemy(app)
migrate = Migrate(app, db)
moment = Moment(app)

csrf = CSRFProtect()
csrf.init_app(app)

# -------------------------
# Config
# -------------------------
UPLOAD_FOLDER = 'static/uploads/logos'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_LOGO_EXTENSIONS = {'png', 'jpg', 'jpeg'}
GHANA_TIMEZONE = pytz.timezone('Africa/Accra')


# -------------------------
# Models
# -------------------------
class Organisation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    logo_filename = db.Column(db.String(255))
    secret_code = db.Column(db.String(10), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    users = db.relationship('User', backref='organisation', lazy=True)
    departments = db.relationship('Department', backref='organisation', lazy=True)


class Department(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    organisation_id = db.Column(db.Integer, db.ForeignKey('organisation.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default='solo_lecturer')  # org_admin, school_lecturer, solo_lecturer
    logo_filename = db.Column(db.String(255))
    organisation_id = db.Column(db.Integer, db.ForeignKey('organisation.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    name = db.Column(db.String(100))  # <- Add this line if not present
    
class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(50), unique=True, nullable=False)
    index_number = db.Column(db.String(50), unique=True, nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    phone = db.Column(db.String(20))  # ✅ New phone field
    profile_pic = db.Column(db.String(255))  # ✅ Path or filename for profile picture
    level = db.Column(db.String(20))  # ✅ New level field
    
    college = db.Column(db.String(100))
    faculty = db.Column(db.String(100))
    department = db.Column(db.String(100))

    organisation_id = db.Column(db.Integer, db.ForeignKey('organisation.id'), nullable=False)
    organisation = db.relationship('Organisation', backref=db.backref('students', lazy=True))




class SessionModel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(100), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    radius = db.Column(db.Integer)
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(100), nullable=False)
    student_id = db.Column(db.String(100), nullable=False)
    student_name = db.Column(db.String(255))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50))
    device_key = db.Column(db.String(255))
    

class Lecturer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    college = db.Column(db.String(100))
    faculty = db.Column(db.String(100))
    department = db.Column(db.String(100))
    
class LecturerForm(FlaskForm):
    full_name = StringField('Full Name', validators=[InputRequired()])
    email = EmailField('Email', validators=[InputRequired(), Email()])
    phone = StringField('Phone')
    college = StringField('College', validators=[InputRequired()])
    faculty = StringField('Faculty', validators=[InputRequired()])
    department = StringField('Department', validators=[InputRequired()])
    
class Course(db.Model):
    __tablename__ = 'courses'  # match the table you created in SQL
    __table_args__ = {'extend_existing': True}  # prevent redefinition error

    id = db.Column(db.Integer, primary_key=True)
    org_id = db.Column(db.Integer, db.ForeignKey('organisation.id', ondelete="CASCADE"), nullable=False)
    course_name = db.Column(db.String(255), nullable=False)
    course_code = db.Column(db.String(50), nullable=False)
    level = db.Column(db.String(50), nullable=False)
    department = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())





# -------------------------
# Helpers
# -------------------------
def get_ghana_time():
    return datetime.now(GHANA_TIMEZONE)

@app.context_processor
def inject_globals():
    return dict(get_ghana_time=get_ghana_time)



def allowed_logo(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_LOGO_EXTENSIONS


def send_secret_code(email, org_name, secret_code):
    """Send secret code to the organisation email with a nice HTML template."""
    try:
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        smtp_user = os.getenv("SMTP_USER", "your_email@gmail.com")
        smtp_password = os.getenv("SMTP_PASSWORD", "your_password")

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px;">
            <div style="max-width: 500px; margin:auto; background: white; border-radius: 10px; padding: 30px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <img src="https://i.postimg.cc/SsdcCdbG/Locify-email.png" alt="Locify Logo" width="80" style="margin-bottom: 20px;">
                <h2 style="color:#007bff;">Welcome to Locify - Presence Made Simple. </h2>
                <p>Hello <strong>{org_name}</strong>,</p>
                <p>Thank you for registering your organisation with our Attendance System.</p>
                <p style="font-size: 18px; margin-top:20px;">Here is your <strong>Unique Organisation Code</strong>:</p>
                <div style="font-size: 24px; font-weight: bold; color: #28a745; margin:20px 0;">{secret_code}</div>
                <p>Share this code with your lecturers to let them register under your organisation.</p>
                <hr style="margin: 30px 0;">
                <p style="font-size: 12px; color: #888;">&copy; 2025 Locify | All Rights Reserved</p>
            </div>
        </body>
        </html>
        """

        msg = MIMEText(html_content, "html")
        msg['Subject'] = "Your Organisation Secret Code"
        msg['From'] = smtp_user
        msg['To'] = email

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            time.sleep(2)
            server.send_message(msg)

        print(f"✅ Secret code email sent to {email}")

    except Exception as e:
        print(f"❌ Error sending email: {e}")


def role_required(*roles):
    """Decorator to restrict access to certain roles"""
    def wrapper(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not session.get('logged_in') or session.get('role') not in roles:
                flash("Access denied for your role.", "danger")
                return redirect(url_for('index'))
            return f(*args, **kwargs)
        return decorated
    return wrapper


@app.before_request
def before_request():
    g.current_time = get_ghana_time()


# -------------------------
# Routes
# -------------------------
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/delete_lecturer/<int:lecturer_id>', methods=['POST'])
def delete_lecturer(lecturer_id):
    # delete lecturer logic
    try:
        lecturer = Lecturer.query.get(lecturer_id)
        if not lecturer:
            return jsonify({"success": False, "message": "Lecturer not found"}), 404

        db.session.delete(lecturer)
        db.session.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    

#---------------------Routes for Departments-----------------
@app.route("/dept/dashboard")
@login_required
def dept_dashboard():
    return render_template("dept_dashboard.html")

#---------------------Routes for Attendance-----------------
@app.route("/attendance")
def attendance_dashboard():
    return render_template("attendance_dashboard.html")



# ---------- Route for course dashboard ----------
@app.route('/org/courses')
@login_required
def org_courses():
    courses = Course.query.all()
    return render_template('org_courses.html', courses=courses)


#------Students-----------------
@app.route('/org_students')
def org_students():
    # Load whatever data you want for students page
    students = Student.query.all()
    return render_template('org_students.html', students=students)

# -------Add Students in org---------
@app.route('/org/add_student', methods=['POST'])
@login_required
def add_student():
    full_name = request.form.get('full_name')
    email = request.form.get('email')
    phone = request.form.get('phone')
    department = request.form.get('department')
    faculty = request.form.get('faculty')
    college = request.form.get('college')
    student_id = request.form.get('student_id')   # New
    index_number = request.form.get('index_number')  # New
    level = request.form.get('level')  # New

    profile_pic = request.files.get('profile_pic')
    profile_pic_filename = None

    if profile_pic:
        filename = secure_filename(profile_pic.filename)
        profile_pic.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        profile_pic_filename = filename

    student = Student(
        full_name=full_name,
        email=email,
        phone=phone,
        department=department,
        faculty=faculty,
        college=college,
        student_id=student_id,          # New
        index_number=index_number,      # New
        level=level,      # New
        profile_pic=profile_pic_filename
    )
    db.session.add(student)
    db.session.commit()

    return jsonify({
        'success': True,
        'student': {
            'id': student.id,
            'student_id': student.student_id,           # New
            'index_number': student.index_number,       # New
            'level': student.level,       # New
            'full_name': student.full_name,
            'email': student.email,
            'phone': student.phone,
            'department': student.department,
            'faculty': student.faculty,
            'college': student.college,
            'profile_pic': url_for('static', filename=f'uploads/{student.profile_pic}') if student.profile_pic else None
        }
    })


# ---------- Add Course ----------
@app.route('/org/add_course', methods=['POST'])
@login_required
def add_course():
    course_name = request.form.get('course_name')
    course_code = request.form.get('course_code')
    level = request.form.get('level')
    department = request.form.get('department')

    # Get the logged-in organisation ID
    org_id = current_user.id  

    course = Course(
        org_id=org_id,
        course_name=course_name,
        course_code=course_code,
        level=level,
        department=department
    )
    db.session.add(course)
    db.session.commit()

    return jsonify({
        'success': True,
        'course': {
            'id': course.id,
            'course_name': course.course_name,
            'course_code': course.course_code,
            'level': course.level,
            'department': course.department
        }
    })


# ---------- Edit Course ----------
@app.route('/org/edit_course/<int:course_id>', methods=['POST'])
@login_required
def edit_course(course_id):
    course = Course.query.get_or_404(course_id)

    # Ensure the course belongs to the current organisation
    if course.org_id != current_user.id:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    course.course_name = request.form.get('course_name')
    course.course_code = request.form.get('course_code')
    course.level = request.form.get('level')
    course.department = request.form.get('department')

    db.session.commit()

    return jsonify({
        'success': True,
        'course': {
            'id': course.id,
            'course_name': course.course_name,
            'course_code': course.course_code,
            'level': course.level,
            'department': course.department
        }
    })


# ---------- Delete Course ----------
@app.route('/org/delete_course/<int:course_id>', methods=['POST'])
@login_required
def delete_course(course_id):
    course = Course.query.get_or_404(course_id)

    # Ensure the course belongs to the current organisation
    if course.org_id != current_user.id:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    db.session.delete(course)
    db.session.commit()

    return jsonify({'success': True, 'id': course_id})



#---------------------------------
#Org_Lecturer registration
#--------------------------------
@app.route('/org_lecturers')
@login_required
def org_lecturers():
    lecturers = Lecturer.query.all()
    return render_template(
        'org_lecturers.html',
        lecturers=lecturers,
        csrf_token=generate_csrf()
    )

@app.route('/register_lecturer_inline', methods=['POST'])
@login_required
def register_lecturer_inline():
    try:
        full_name = request.form.get('full_name')
        email = request.form.get('email')
        phone = request.form.get('phone')
        college = request.form.get('college')
        faculty = request.form.get('faculty')
        department = request.form.get('department')

        if not full_name or not email:
            return jsonify({"success": False, "message": "Full name and email are required"}), 400

        new_lecturer = Lecturer(
            full_name=full_name,
            email=email,
            phone=phone,
            college=college,
            faculty=faculty,
            department=department
        )

        db.session.add(new_lecturer)
        db.session.commit()

        # Return JSON so JS can append row without reload
        return jsonify({
            "success": True,
            "lecturer": {
                "id": new_lecturer.id,
                "full_name": new_lecturer.full_name,
                "email": new_lecturer.email,
                "college": new_lecturer.college,
                "faculty": new_lecturer.faculty,
                "department": new_lecturer.department
            }
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500




@app.route('/save_name', methods=['POST'])
@login_required
def save_name():
    name = request.form.get('name')
    if name:
        current_user.name = name
        db.session.commit()
        flash('Name updated.', 'success')

    # Redirect based on role
    if current_user.role == 'org_admin':
        return redirect(url_for('org_dashboard'))
    elif current_user.role == 'school_lecturer':
        return redirect(url_for('school_lecturer_dashboard'))
    elif current_user.role == 'solo_lecturer':
        return redirect(url_for('solo_lecturer_dashboard'))
    else:
        return redirect(url_for('login'))


# -------- Organisation Registration --------
@app.route('/register_org', methods=['GET', 'POST'])
def register_org():
    """Register a new organisation admin and generate secret code."""
    if request.method == 'POST':
        org_name = request.form['org_name'].strip()
        org_email = request.form['org_email'].strip()
        password = request.form['password']

        # Check for existing org or user
        if Organisation.query.filter_by(name=org_name).first():
            flash("Organisation already exists.", "danger")
            return redirect(url_for('register_org'))

        if Organisation.query.filter_by(email=org_email).first():
            flash("Organisation email already exists.", "danger")
            return redirect(url_for('register_org'))

        if User.query.filter_by(email=org_email).first():
            flash("This email is already used for another account. Please log in instead.", "danger")
            return redirect(url_for('login', role='org_admin'))

        # Generate secret code
        secret_code = secrets.token_hex(4).upper()

        # Handle logo upload
        file = request.files.get('logo')
        filename = None
        if file and allowed_logo(file.filename):
            filename = secrets.token_hex(8) + "_" + secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

        # Create organisation
        org = Organisation(
            name=org_name,
            email=org_email,
            logo_filename=filename,
            secret_code=secret_code
        )
        db.session.add(org)
        db.session.commit()

        # Create admin user
        admin_user = User(
            email=org_email,
            password_hash=generate_password_hash(password),
            role='org_admin',
            logo_filename=filename,
            organisation_id=org.id
        )
        db.session.add(admin_user)
        db.session.commit()

        # Send secret code email
        send_secret_code(org_email, org_name, secret_code)

        flash(f"Organisation registered successfully! Your secret code is {secret_code}. Check your email.", "success")
        return redirect(url_for('login', role='org_admin'))

    return render_template('register_org.html')


@app.route('/upload_students', methods=['POST'])
@role_required('org_admin')
def upload_students():
    file = request.files.get('file')
    if not file:
        flash("No file uploaded", "danger")
        return redirect(url_for('org_dashboard'))

    filename = file.filename.lower()

    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file)
        else:
            flash("Unsupported file format. Please upload CSV or Excel.", "danger")
            return redirect(url_for('org_dashboard'))

        # Save students to DB
        for _, row in df.iterrows():
            student = Student(
                index_number=str(row['index_number']),
                name=row['name'],
                department_id=row.get('department_id'),
                organisation_id=session.get('organisation_id')  # store org_id in session on login
            )
            db.session.add(student)
        db.session.commit()

        flash("Students uploaded successfully!", "success")
    except Exception as e:
        db.session.rollback()
        flash(f"Error uploading students: {e}", "danger")

    return redirect(url_for('org_dashboard'))



# -------- School Lecturer Registration --------
@app.route('/register_lecturer', methods=['GET', 'POST'])
def register_lecturer():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        secret_code = request.form['secret_code'].strip()

        org = Organisation.query.filter_by(secret_code=secret_code).first()
        if not org:
            flash("Invalid secret code. Contact your organisation admin.", "danger")
            return redirect(url_for('register_lecturer'))

        if User.query.filter_by(email=email).first():
            flash("Email already exists.", "danger")
            return redirect(url_for('register_lecturer'))

        user = User(
            email=email,
            password_hash=generate_password_hash(password),
            role='school_lecturer',
            organisation_id=org.id
        )
        db.session.add(user)
        db.session.commit()

        flash("Registration successful! Please log in.", "success")
        return redirect(url_for('login'))

    return render_template('register_lecturer.html')


# -------- Solo Lecturer Registration --------
@app.route('/register_solo', methods=['GET', 'POST'])
def register_solo():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        if User.query.filter_by(email=email).first():
            flash("Email already exists.", "danger")
            return redirect(url_for('register_solo'))

        user = User(
            email=email,
            password_hash=generate_password_hash(password),
            role='solo_lecturer'
        )
        db.session.add(user)
        db.session.commit()

        flash("Registration successful! Please log in.", "success")
        return redirect(url_for('login'))

    return render_template('register_solo.html')


# -------- Login --------
@app.route('/login', methods=['GET', 'POST'])
@csrf.exempt  # ✅ This disables CSRF only for login
def login():
    role = request.args.get('role', '')  # optional: ?role=org_admin
    if request.method == 'POST':
        email = request.form['email'].strip()
        password = request.form['password'].strip()

        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password_hash, password):
            flash("Invalid email or password.", "danger")
            return redirect(url_for('login', role=role))

        # Save session
        session['logged_in'] = True
        session['user_id'] = user.id
        session['email'] = user.email
        session['role'] = user.role
        session['lecturer_logo'] = user.logo_filename

        login_user(user)  # ✅ Required for Flask-Login

        # ✅ Redirect based on role
        dashboard_routes = {
            'org_admin': 'org_dashboard',
            'school_lecturer': 'school_lecturer_dashboard',
            'solo_lecturer': 'solo_lecturer_dashboard'
        }
        return redirect(url_for(dashboard_routes.get(user.role, 'index')))

    # Only show the "register" link for the clicked role
    register_links = {
        'org_admin': url_for('register_org'),
        'school_lecturer': url_for('register_lecturer'),
        'solo_lecturer': url_for('register_solo')
    }
    register_url = register_links.get(role, '')

    return render_template('login.html', role=role, register_url=register_url)




# -------- Logout --------
@app.route('/logout')
def logout():
    session.clear()
    flash("Logged out successfully.", "info")
    return redirect(url_for('index'))


# -------- Dashboards --------
@csrf.exempt
@app.route('/org/dashboard')
@role_required('org_admin')
def org_dashboard():
    org = db.session.get(User, session['user_id']).organisation
    lecturers = User.query.filter_by(organisation_id=org.id, role='school_lecturer').all()
    departments = Department.query.filter_by(organisation_id=org.id).all()
    students = Student.query.filter_by(organisation_id=org.id).count()
    return render_template(
        'org_dashboard.html',
        org=org,
        lecturers=lecturers,
        departments=departments,
        student_count=students
    )
    
@app.route('/register_course', methods=['POST'])
@role_required('org_admin')
@login_required
def register_course():
    course_name = request.form.get('course_name')
    course_code = request.form.get('course_code')

    if not course_name or not course_code:
        flash("Course name and code are required.", "danger")
        return redirect(url_for('org_dashboard'))

    existing = Course.query.filter_by(course_code=course_code, organisation_id=session['organisation_id']).first()
    if existing:
        flash("Course code already exists.", "warning")
        return redirect(url_for('org_dashboard'))

    new_course = Course(
        name=course_name,
        course_code=course_code,
        organisation_id=session['organisation_id']
    )
    db.session.add(new_course)
    db.session.commit()

    flash("✅ Course registered successfully.", "success")
    return redirect(url_for('org_dashboard'))



@csrf.exempt
@app.route('/lecturer/dashboard')
@role_required('school_lecturer')
def school_lecturer_dashboard():
    user = db.session.get(User, session['user_id'])
    sessions = SessionModel.query.filter_by(user_id=user.id).all()
    return render_template('school_lecturer_dashboard.html', sessions=sessions)


@csrf.exempt
@app.route('/solo/dashboard')
@role_required('solo_lecturer')
def solo_lecturer_dashboard():
    user = db.session.get(User, session['user_id'])
    sessions = SessionModel.query.filter_by(user_id=user.id).all()
    return render_template('solo_lecturer_dashboard.html', sessions=sessions)


# -------------------------
# Run
# -------------------------
if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)
