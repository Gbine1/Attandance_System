from app import app, db
from sqlalchemy import text

with app.app_context():
    try:
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS course (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                course_code VARCHAR(50) NOT NULL,
                organisation_id INTEGER NOT NULL REFERENCES organisation(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        db.session.commit()
        print("✅ 'Course' table created successfully.")
    except Exception as e:
        print("❌ Error creating 'Course' table:", e)
