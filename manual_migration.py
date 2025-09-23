from app import app, db
from sqlalchemy import text

with app.app_context():
    # Raw SQL to add the 'name' column
    try:
        db.session.execute(text("ALTER TABLE \"user\" ADD COLUMN name VARCHAR(100);"))
        db.session.commit()
        print("✅ 'name' column added to User table successfully.")
    except Exception as e:
        print("❌ Error adding column:", e)
