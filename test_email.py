import os, smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

smtp_user = os.getenv("SMTP_USER")
smtp_pass = os.getenv("SMTP_PASSWORD")

msg = MIMEText("Hello, this is a test email from Locify App.")
msg['Subject'] = "Test Email"
msg['From'] = smtp_user
msg['To'] = smtp_user

# ✅ USE SSL port 465 instead of TLS
with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
    server.login(smtp_user, smtp_pass)
    server.send_message(msg)

print("✅ Test email sent!")
