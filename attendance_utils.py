from geopy.distance import geodesic
import csv
import os

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculates the distance between two geographical points in meters.
    Uses geopy for accurate distance calculations.
    """
    coords1 = (lat1, lon1)
    coords2 = (lat2, lon2)
    return geodesic(coords1, coords2).meters


def save_attendance_local(record_data, folder_path='data', filename='attendance_records.csv'):
    """
    Saves attendance record to a local CSV file.
    This is for local backup; cloud hosting like Render or Heroku may not persist the file.
    """
    # Ensure data folder exists
    os.makedirs(folder_path, exist_ok=True)
    csv_file_path = os.path.join(folder_path, filename)
    file_exists = os.path.isfile(csv_file_path)

    # Define headers based on the keys in record_data, ensuring order.
    # All fields that will be written to the CSV MUST be in this list.
    fieldnames = [
        'action',          # e.g., 'submitAttendance'
        'Timestamp',
        'Student_ID',
        'Student_Name',
        'Student_Index',
        'Latitude',
        'Longitude',
        'Status',
        'Distance',
        'Session_ID',
        'Class_Lat',
        'Class_Lon',
        'Radius_Meters',
        'IP_Address',
        'User_Agent',
        'Device_Key'
    ]

    # Ensure all fieldnames exist in record_data, add 'N/A' if missing
    for field in fieldnames:
        if field not in record_data:
            record_data[field] = 'N/A'

    with open(csv_file_path, 'a', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        if not file_exists:
            writer.writeheader()  # Write header only if file is new

        writer.writerow(record_data)
        print(f"[LOCAL BACKUP] {record_data.get('Student_ID', 'N/A')} - {record_data.get('Status', 'N/A')}")
