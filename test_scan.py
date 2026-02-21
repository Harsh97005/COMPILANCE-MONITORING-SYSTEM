import requests
import time

URL = "http://localhost:8000/api/v1"

print("1. Uploading Policy...")
with open("test_policy.pdf", "w") as f: f.write("dummy")
with open("test_policy.pdf", "rb") as f:
    res = requests.post(f"{URL}/policies", files={"file": ("test_policy.pdf", f, "application/pdf")})
    policy_id = res.json()["policy_id"]
    print("Policy ID:", policy_id)

print("2. Extracting Rules...")
res = requests.post(f"{URL}/policies/{policy_id}/extract")
print("Extracted Rules count:", res.json().get("rules_count"))

print("3. Uploading CSV mock data...")
csv_content = "id,employee,amount,category,status,vendor_id\n1,Alice,150.00,personal,approved,V1\n2,Bob,50.00,office,approved,V2\n3,Eve,1500.00,travel,pending,V3\n"
with open("test_data.csv", "w") as f: f.write(csv_content)
with open("test_data.csv", "rb") as f:
    res = requests.post(f"{URL}/databases/upload_csv", data={"name": "Test CSV"}, files={"file": ("test_data.csv", f, "text/csv")})
    db_id = res.json()["id"]
    print("DB ID:", db_id)

print("4. Activating connection...")
res = requests.patch(f"{URL}/databases/{db_id}/activate")
print("Activated:", res.json())

print("5. Triggering Scan...")
res = requests.post(f"{URL}/scans")
print("Scan Response:", res.json())

print("6. Waiting for async processing...")
time.sleep(5)

print("7. Fetching Dashboard Stats to Verify Violations...")
res = requests.get(f"{URL}/stats")
stats = res.json()
print("Final Stats:", stats)
if stats["violations"] > 0:
    print("SUCCESS: Violations detected!")
else:
    print("FAILED: No violations detected.")
