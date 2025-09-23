from sqlalchemy import create_engine, text

# Update this with your real DB URI
engine = create_engine(
    "postgresql+psycopg2://postgres:admin1234@localhost/attendance_app"
)
with engine.connect() as conn:
    conn.execute(text("""
        ALTER TABLE student
        ADD COLUMN student_id VARCHAR(50);
    """))
    conn.commit()

print("Column student_id added successfully.")
