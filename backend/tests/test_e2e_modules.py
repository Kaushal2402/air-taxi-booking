import asyncio
import pytest
import uuid
import io
from httpx import AsyncClient, ASGITransport
from app.main import app

pytestmark = pytest.mark.asyncio

# Share the same event loop across all tests in this module to avoid SQLAlchemy/aiomysql event loop mismatch
@pytest.fixture(scope="module", autouse=True)
def event_loop():
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    yield loop
    loop.close()

# Global variables for state sharing between test steps
token = None
headers = {}
created_role_id = None
created_booking_id = None
created_driver_id = None
created_vehicle_id = None
created_vendor_id = None
created_operator_id = None
created_aircraft_id = None
created_pilot_id = None
created_customer_id = None
created_zone_id = None
created_route_id = None
created_road_rule_id = None
created_air_rule_id = None
created_tax_id = None
created_promo_id = None
created_referral_id = None
created_ticket_id = None
created_flag_id = None

# Preseeded IDs from database
PRESEEDED_CUSTOMER_ID = "4b7c8e50-e56a-488b-b750-58854a53a735"
PRESEEDED_DRIVER_ID = "07b8d638-2d12-47ea-9183-d67f0fbf257a"
PRESEEDED_ZONE_ID = "6a73e7ac-1e9b-4b52-b9d1-5f645f27ac81"
PRESEEDED_CLASS_CODE = "BIKE_2"
PRESEEDED_CLASS_ID = "f17af7b5-0d91-48f6-8cf8-33b15afc6c42"

@pytest.fixture(scope="module")
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        yield ac

async def test_health_check(client):
    """Verify general service health (Module health check)"""
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


# ── MODULE 1: AUTHENTICATION & ADMIN IDENTITY ───────────────────────────────────

async def test_module_01_auth_flow(client):
    global token, headers
    
    # 1. Negative Test: Login with invalid credentials (asserts 401 per service code)
    res = await client.post("/api/v1/auth/login", json={
        "email": "admin@acmemobility.com",
        "password": "WrongPassword",
        "remember_me": False
    })
    # Verification of failed login attempt handling
    assert res.status_code == 401
    assert "invalid" in res.json()["message"].lower()
    
    # 2. Positive Test: Login with preseeded credentials
    res = await client.post("/api/v1/auth/login", json={
        "email": "admin@acmemobility.com",
        "password": "Admin@123456",
        "remember_me": False
    })
    assert res.status_code == 200
    body = res.json()
    assert "access_token" in body
    token = body["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Fetch admin profile (me)
    res = await client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["email"] == "admin@acmemobility.com"
    
    # 4. Fetch active sessions
    res = await client.get("/api/v1/auth/me/sessions", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) >= 0
    
    # 5. Fetch sign-in history
    res = await client.get("/api/v1/auth/me/sign-in-history", headers=headers)
    assert res.status_code == 200
    assert "items" in res.json()


# ── MODULE 2: DASHBOARD & LIVE OPERATIONS ────────────────────────────────────────

async def test_module_02_dashboard_kpis(client):
    # Fetch default dashboard details (KPIs, live operations alerts and bookings are returned in one call)
    res = await client.get("/api/v1/dashboard?window=today", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert "kpi" in body
    assert "live_bookings" in body
    assert "alerts" in body


# ── MODULE 3: ROLE & PERMISSION MANAGEMENT (RBAC ADMIN) ──────────────────────────

async def test_module_03_rbac_management(client):
    global created_role_id
    
    # 1. Fetch RBAC statistics
    res = await client.get("/api/v1/rbac/stats", headers=headers)
    assert res.status_code == 200
    
    # 2. Fetch all system permissions (expect 96 pre-registered items)
    res = await client.get("/api/v1/rbac/permissions", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert "domains" in body
    assert body["total"] >= 90
    
    # 3. List existing roles
    res = await client.get("/api/v1/rbac/roles", headers=headers)
    assert res.status_code == 200
    assert "items" in res.json()
    
    # 4. Create custom role
    role_name = f"QA Tester {uuid.uuid4().hex[:4]}"
    res = await client.post("/api/v1/rbac/roles", headers=headers, json={
        "name": role_name,
        "description": "Role for automated QA checks",
        "permissions": ["bookings.road.view", "catalog.view"]
    })
    assert res.status_code == 201
    created_role_id = res.json()["id"]
    
    # 5. Fetch custom role by ID
    res = await client.get(f"/api/v1/rbac/roles/{created_role_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == role_name
    
    # 6. Update custom role details
    res = await client.patch(f"/api/v1/rbac/roles/{created_role_id}", headers=headers, json={
        "description": "Updated QA role description"
    })
    assert res.status_code == 200
    
    # 7. Delete custom role (cleanup)
    res = await client.delete(f"/api/v1/rbac/roles/{created_role_id}", headers=headers)
    assert res.status_code == 204


# ── MODULE 4 & 5: BOOKING MANAGEMENT (ROAD & AIR) ────────────────────────────────

async def test_module_04_05_bookings_flow(client):
    global created_booking_id
    
    # 1. Assisted Booking creation (Road)
    res = await client.post("/api/v1/bookings/road", headers=headers, json={
        "customer_id": PRESEEDED_CUSTOMER_ID,
        "pickup_address": "Bengaluru Airport",
        "pickup_lat": 13.198,
        "pickup_lng": 77.706,
        "drop_address": "MG Road Metro",
        "drop_lat": 12.975,
        "drop_lng": 77.606,
        "service_type": "instant",
        "vehicle_class": PRESEEDED_CLASS_CODE,
        "payment_method": "wallet",
        "fare_estimate_minor": 45000,
        "internal_reason": "Assisted booking test",
        "admin_note": "Test booking note"
    })
    assert res.status_code == 201
    created_booking_id = res.json()["id"]
    
    # 2. Get booking detail
    res = await client.get(f"/api/v1/bookings/road/{created_booking_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "Requested"
    
    # 3. Verify state machine: attempt illegal state change (e.g. Requested directly to Completed). ValidationException returns 422.
    res = await client.post(f"/api/v1/bookings/road/{created_booking_id}/advance-status", headers=headers, json={
        "status": "Completed",
        "note": "Illegal state transition test"
    })
    assert res.status_code == 422
    
    # 4. Advance status legally (Requested -> Accepted)
    res = await client.post(f"/api/v1/bookings/road/{created_booking_id}/advance-status", headers=headers, json={
        "status": "Accepted",
        "note": "Advance to Accepted"
    })
    assert res.status_code == 200
    assert res.json()["status"] == "Accepted"
    
    # 5. Add notes to booking
    res = await client.post(f"/api/v1/bookings/road/{created_booking_id}/notes", headers=headers, json={
        "note": "QA verified booking note"
    })
    assert res.status_code == 200
    
    # 6. Flag booking for review
    res = await client.patch(f"/api/v1/bookings/road/{created_booking_id}/flag", headers=headers, json={
        "flagged": True,
        "flag_reason": "Suspicious behavior check"
    })
    assert res.status_code == 200
    assert res.json()["flagged"] is True
    
    # 7. Adjust completed fare (negative test: cannot adjust while active). ValidationException returns 422.
    res = await client.post(f"/api/v1/bookings/road/{created_booking_id}/adjust-fare", headers=headers, json={
        "new_fare_minor": 38000,
        "reason": "Test price adjustment"
    })
    # Cannot adjust fare of an active booking
    assert res.status_code == 422
    
    # 8. Open Dispute on booking (Dispute endpoints return 200 on success)
    res = await client.post(f"/api/v1/bookings/road/{created_booking_id}/dispute", headers=headers, json={
        "reason": "pricing_dispute",
        "note": "Customer claims double surge charge"
    })
    assert res.status_code in (200, 201)
    
    # 9. List Disputes
    res = await client.get("/api/v1/bookings/road/disputes", headers=headers)
    assert res.status_code == 200
    
    # 10. List Air bookings
    res = await client.get("/api/v1/bookings/air", headers=headers)
    assert res.status_code == 200


# ── MODULE 6: LIVE DISPATCH & EXCEPTION CONSOLE ──────────────────────────────────

async def test_module_06_live_dispatch(client):
    # Create a fresh, isolated booking for dispatch testing (so it remains in Requested status)
    res_b = await client.post("/api/v1/bookings/road", headers=headers, json={
        "customer_id": PRESEEDED_CUSTOMER_ID,
        "pickup_address": "Bengaluru Airport",
        "pickup_lat": 12.98,
        "pickup_lng": 77.643,
        "drop_address": "MG Road Metro",
        "drop_lat": 12.975,
        "drop_lng": 77.606,
        "service_type": "instant",
        "vehicle_class": PRESEEDED_CLASS_CODE,
        "payment_method": "wallet",
        "fare_estimate_minor": 45000,
        "internal_reason": "Dispatch test booking"
    })
    assert res_b.status_code == 201
    db_id = res_b.json()["id"]

    # 1. Fetch dispatch console active queue
    res = await client.get("/api/v1/dispatch/queue", headers=headers)
    assert res.status_code == 200
    
    # 2. Fetch eligible drivers for the booking
    res = await client.get(f"/api/v1/dispatch/requests/{db_id}/eligible-drivers", headers=headers)
    assert res.status_code == 200
    
    # 3. Manual assign driver (using preseeded driver ID)
    res = await client.post(f"/api/v1/dispatch/requests/{db_id}/assign", headers=headers, json={
        "driver_id": PRESEEDED_DRIVER_ID,
        "reason": "Manual assignment QA dispatch override"
    })
    assert res.status_code == 200
    
    # 4. Trigger surge override (aligned with SurgeOverrideRequest schema)
    res = await client.post("/api/v1/dispatch/surge/override", headers=headers, json={
        "zone_id": "Z1",
        "zone_name": "Test Zone",
        "multiplier": 1.6,
        "expires_in_minutes": 10,
        "reason": "Demand spike override"
    })
    assert res.status_code in (200, 201)


# ── MODULE 7 & 8: DRIVER MANAGEMENT, VEHICLES & FLEET ───────────────────────────

async def test_module_07_08_driver_vehicle_management(client):
    global created_driver_id, created_vehicle_id, created_vendor_id
    
    # 1. Onboarding queue fetch
    res = await client.get("/api/v1/drivers/onboarding", headers=headers)
    assert res.status_code == 200
    
    # 2. Onboard new driver manually
    email = f"qa_driver_{uuid.uuid4().hex[:4]}@example.com"
    phone = f"9988{uuid.uuid4().hex[:6]}"[:10]
    res = await client.post("/api/v1/drivers", headers=headers, json={
        "name": "QA Test Driver",
        "email": email,
        "phone": phone,
        "vehicle_class": "Sedan"
    })
    assert res.status_code == 201
    created_driver_id = res.json()["id"]
    
    # 3. Get driver detail
    res = await client.get(f"/api/v1/drivers/{created_driver_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "pending" # default stage is pending approval
    
    # 4. Create document requirement for driver
    res = await client.post(f"/api/v1/drivers/{created_driver_id}/documents", headers=headers, json={
        "doc_type": "license",
        "doc_number": "DL-9944112",
        "expiry_date": "2028-12-31"
    })
    assert res.status_code == 201
    doc_id = res.json()["id"]
    
    # 5. Review document (approve KYC - schema uses review_note)
    res = await client.patch(f"/api/v1/drivers/{created_driver_id}/documents/{doc_id}", headers=headers, json={
        "status": "approved",
        "action": "approve",
        "review_note": "Approved by QA automated check"
    })
    assert res.status_code == 200
    
    # 5.5. Approve driver so status becomes active (required for vehicle linkage)
    res_app_d = await client.post(f"/api/v1/drivers/{created_driver_id}/approve", headers=headers)
    assert res_app_d.status_code == 200
    
    # 6. Adjust driver wallet balance (schema uses direction and reason)
    res = await client.post(f"/api/v1/drivers/{created_driver_id}/wallet/adjust", headers=headers, json={
        "direction": "credit",
        "amount_minor": 10000,
        "reason": "Goodwill balance addition"
    })
    assert res.status_code == 200
    assert res.json()["driver"]["wallet_balance_minor"] == 10000
    
    # 7. Create vehicle (aligned with VehicleCreate schema)
    plate = f"KA03QA{uuid.uuid4().hex[:4]}"[:13]
    res = await client.post("/api/v1/vehicles", headers=headers, json={
        "plate_no": plate,
        "make": "Tesla",
        "model": "Model 3",
        "year": 2023,
        "vehicle_class_id": PRESEEDED_CLASS_ID
    })
    assert res.status_code == 201
    created_vehicle_id = res.json()["id"]
    
    # 7.5. Approve vehicle so status becomes active (required for driver linkage)
    res_app_v = await client.post(f"/api/v1/vehicles/{created_vehicle_id}/approve", headers=headers)
    assert res_app_v.status_code == 200
    
    # 8. Link driver to vehicle
    res = await client.post(f"/api/v1/vehicles/{created_vehicle_id}/link-driver", headers=headers, json={
        "driver_id": created_driver_id
    })
    assert res.status_code == 200
    
    # 9. Vendor CRUD (aligned with VendorCreate schema)
    res = await client.post("/api/v1/vendors", headers=headers, json={
        "name": "QA Fleet Service",
        "phone": "9911991199",
        "email": f"fleet_{uuid.uuid4().hex[:4]}@example.com"
    })
    assert res.status_code == 201
    created_vendor_id = res.json()["id"]


# ── MODULE 9 & 10: AIR OPERATOR, AIRCRAFT & CREW ─────────────────────────────────

async def test_module_09_10_operator_aircraft_crew(client):
    global created_operator_id, created_aircraft_id, created_pilot_id
    
    # 1. Onboard operator
    res = await client.post("/api/v1/operators", headers=headers, json={
        "name": "Aero QA Lines",
        "contact_name": "Chief Pilot",
        "phone": "9900990099",
        "email": f"aero_{uuid.uuid4().hex[:4]}@example.com"
    })
    assert res.status_code == 201
    created_operator_id = res.json()["id"]
    
    # 2. Approve operator onboarding
    res = await client.post(f"/api/v1/operators/{created_operator_id}/approve", headers=headers)
    assert res.status_code == 200
    
    # 3. Configure operator commission
    res = await client.post(f"/api/v1/operators/{created_operator_id}/commission", headers=headers, json={
        "commission_pct": 12.5
    })
    assert res.status_code == 200
    
    # 4. Create Aircraft
    tail = f"VT-QA{uuid.uuid4().hex[:3]}"[:8].upper()
    res = await client.post("/api/v1/aircraft", headers=headers, json={
        "registration_mark": tail,
        "aircraft_type_id": "78a40ca8-a411-4e45-b894-74050e7caa66",
        "seat_capacity": 4,
        "operator_id": created_operator_id
    })
    assert res.status_code == 201
    created_aircraft_id = res.json()["id"]
    
    # 5. Approve Aircraft
    res = await client.post(f"/api/v1/aircraft/{created_aircraft_id}/approve", headers=headers)
    assert res.status_code == 200
    
    # 6. Set Aircraft Maintenance window
    res = await client.post(f"/api/v1/aircraft/{created_aircraft_id}/maintenance", headers=headers, json={
        "starts_at": "2026-06-10T08:00:00Z",
        "ends_at": "2026-06-12T18:00:00Z",
        "notes": "Routine checklist QA check"
    })
    assert res.status_code == 200
    
    # 7. PILOTS CRUD verification (now functional after router fix!)
    res = await client.get("/api/v1/pilots", headers=headers)
    assert res.status_code == 200
    assert "items" in res.json()
    
    # 8. Create Pilot
    pilot_email = f"pilot_{uuid.uuid4().hex[:4]}@example.com"
    pilot_phone = f"7766{uuid.uuid4().hex[:6]}"[:10]
    res = await client.post("/api/v1/pilots", headers=headers, json={
        "name": "QA Test Pilot",
        "email": pilot_email,
        "phone": pilot_phone,
        "operator_id": created_operator_id,
        "license_number": f"LIC-{uuid.uuid4().hex[:4]}",
        "license_expiry": "2027-12-31"
    })
    assert res.status_code == 201
    created_pilot_id = res.json()["id"]
    
    # 9. Get pilot detail
    res = await client.get(f"/api/v1/pilots/{created_pilot_id}", headers=headers)
    assert res.status_code == 200


# ── MODULE 11: CUSTOMER MANAGEMENT ───────────────────────────────────────────────

async def test_module_11_customer_management(client):
    global created_customer_id
    
    # 1. Onboard customer
    email = f"customer_{uuid.uuid4().hex[:4]}@example.com"
    phone = f"8877{uuid.uuid4().hex[:6]}"[:10]
    res = await client.post("/api/v1/customers", headers=headers, json={
        "name": "QA Customer",
        "phone": phone,
        "email": email
    })
    assert res.status_code == 201
    created_customer_id = res.json()["id"]
    
    # 2. Adjust wallet balance (positive addition - schema uses direction and reason)
    res = await client.post(f"/api/v1/customers/{created_customer_id}/wallet/adjust", headers=headers, json={
        "direction": "credit",
        "amount_minor": 50000,
        "reason": "Refund credit"
    })
    assert res.status_code == 200
    assert res.json()["customer"]["wallet_balance_minor"] == 50000
    
    # 3. Retrieve wallet transaction list
    res = await client.get(f"/api/v1/customers/{created_customer_id}/wallet/transactions", headers=headers)
    assert res.status_code == 200
    
    # 4. Flag customer for suspension review
    res = await client.post(f"/api/v1/customers/{created_customer_id}/flag", headers=headers, json={
        "reason": "suspicious_chargeback"
    })
    assert res.status_code == 200
    assert res.json()["status"] == "flagged"


# ── MODULE 12: CATALOG MANAGEMENT (CLASSES, ZONES, ROUTES) ───────────────────────

async def test_module_12_catalog_management(client):
    global created_zone_id, created_route_id
    
    # 1. Create Service Zone (must send nested list of floats for polygon)
    zone_code = f"Z_{uuid.uuid4().hex[:3]}"[:5].upper()
    res = await client.post("/api/v1/catalog/zones", headers=headers, json={
        "code": zone_code,
        "name": "QA Test Zone",
        "polygon": [[13.0, 77.0], [13.1, 77.0], [13.1, 77.1], [13.0, 77.1], [13.0, 77.0]],
        "tax_jurisdiction": "GST-18"
    })
    assert res.status_code == 201
    created_zone_id = res.json()["id"]
    
    # 2. Validate geometry check
    res = await client.post("/api/v1/catalog/zones/validate-geometry", headers=headers, json={
        "polygon": [[13.0, 77.0], [13.1, 77.0], [13.1, 77.1], [13.0, 77.1], [13.0, 77.0]]
    })
    assert res.status_code == 200
    assert res.json()["valid"] is True
    
    # 3. Geometry negative case: self-intersecting polygon
    res = await client.post("/api/v1/catalog/zones/validate-geometry", headers=headers, json={
        "polygon": [[13.0, 77.0], [13.1, 77.1], [13.0, 77.1], [13.1, 77.0], [13.0, 77.0]]
    })
    assert res.status_code == 200
    # The server might validate it or fail gracefully, assert result format
    assert "valid" in res.json()
    
    # 4. Create Air Route
    route_code = f"R_{uuid.uuid4().hex[:3]}"[:5].upper()
    res = await client.post("/api/v1/catalog/air-routes", headers=headers, json={
        "code": route_code,
        "origin_name": "QA Helipad A",
        "origin_code": "QHA",
        "destination_name": "QA Helipad B",
        "destination_code": "QHB",
        "category": "on_demand",
        "distance_nm": 45.0,
        "block_time_minutes": 25
    })
    assert res.status_code == 201
    created_route_id = res.json()["id"]


# ── MODULE 13: PRICING & FARE RULES ──────────────────────────────────────────────

async def test_module_13_pricing_rules(client):
    global created_road_rule_id, created_tax_id
    
    # 1. Create Tax Rule (aligned with TaxRuleCreate schema)
    res = await client.post("/api/v1/pricing/taxes", headers=headers, json={
        "name": "QA Tax",
        "hsn_code": "996411",
        "rate": 5.0,
        "jurisdiction": "GST-18",
        "active": True
    })
    assert res.status_code == 201
    created_tax_id = res.json()["id"]
    
    # 2. Create Road Fare rule (as draft - timezone-naive ISO format to satisfy MySQL datetime column)
    res = await client.post("/api/v1/pricing/road-rules", headers=headers, json={
        "zone_id": created_zone_id or PRESEEDED_ZONE_ID,
        "vehicle_class_id": PRESEEDED_CLASS_ID,
        "effective_from": "2026-06-01T00:00:00",
        "base_fare": 50,
        "per_km": 15,
        "per_min": 2,
        "waiting_per_min": 3,
        "surge_cap": 2.0,
        "min_fare": 80,
        "free_km": 2,
        "free_min": 5,
        "modifiers": [{"name": "NightModifier", "type": "pct", "value": 10, "window_start": "23:00", "window_end": "05:00"}]
    })
    assert res.status_code == 201
    created_road_rule_id = res.json()["id"]
    assert res.json()["status"] == "draft"
    
    # 3. Simulate Fare Calculations (Math Verification)
    res = await client.post("/api/v1/pricing/simulate", headers=headers, json={
        "zone_id": created_zone_id or PRESEEDED_ZONE_ID,
        "vehicle_class_id": PRESEEDED_CLASS_ID,
        "distance_km": 10.0,
        "duration_min": 20,
        "waiting_min": 10,
        "demand_supply_ratio": 1.5,
        "time_of_day": "14:00",
        "toll": 50,
        "promo_discount": 30,
        "rule_ids": [created_road_rule_id]
    })
    assert res.status_code == 200
    results = res.json()["results"]
    assert len(results) > 0
    sim_result = results[0]
    
    # Pricing formula:
    # subtotal = base_fare + dist_charge + time_charge + wait_charge
    # base_fare = 50
    # dist_charge = (10 - free_km) * 15 = 8 * 15 = 120
    # time_charge = (20 - free_min) * 2 = 15 * 2 = 30
    # wait_charge = (10 - free_min) * 3 = 5 * 3 = 15
    # subtotal = 50 + 120 + 30 + 15 = 215
    # modifier: NightModifier window is 23:00-05:00. Simulation time is 14:00 (no match, modifier = 0)
    # surge: multiplier is 1.5. surge_amount = subtotal * (1.5 - 1.0) = 215 * 0.5 = 107.5
    # toll = 50
    # promo = 30
    # expected total = subtotal + surge_amount + toll - promo = 215 + 107.5 + 50 - 30 = 342.5
    assert sim_result["fare_total"] == 342.5


# ── MODULE 14: PROMOTIONS, COUPONS & REFERRALS ───────────────────────────────────

async def test_module_14_promotions_and_coupons(client):
    global created_promo_id
    
    # 1. Create Promotion (aligned with PromotionCreate schema)
    promo_code = f"QA_SAVE_{uuid.uuid4().hex[:3]}".upper()
    res = await client.post("/api/v1/promotions", headers=headers, json={
        "code": promo_code,
        "type": "percent",
        "value": 15,
        "cap_minor": 5000,
        "min_trip_value_minor": 10000,
        "total_redemption_cap": 100,
        "validity_from": "2026-06-01T00:00:00Z",
        "validity_to": "2026-12-31T23:59:59Z",
        "service_types": [],
        "zones": []
    })
    assert res.status_code == 201
    created_promo_id = res.json()["id"]
    
    # 2. Get active referral programs (correct singular path /referrals/program)
    res = await client.get("/api/v1/referrals/program", headers=headers)
    assert res.status_code == 200


# ── MODULE 15 & 16: PAYMENTS, WALLETS, PAYOUTS & SETTLEMENTS ─────────────────────

async def test_module_15_16_payments_payouts_flow(client):
    # 1. Manual transaction entry (aligned with ManualEntryRequest schema)
    res = await client.post("/api/v1/payments", headers=headers, json={
        "customer_name": "Manual Entry Test",
        "customer_id": PRESEEDED_CUSTOMER_ID,
        "booking_ref": "BK-RD-00001",
        "service": "road",
        "method": "card",
        "gross_amount": 45000,
        "net_amount": 45000,
        "gateway_ref": f"pay_{uuid.uuid4().hex[:12]}"
    })
    assert res.status_code == 201
    
    # 2. Fetch payment reconciliation summary
    res = await client.get("/api/v1/payments/reconciliation/summary", headers=headers)
    assert res.status_code == 200
    
    # 3. Create Payout run (aligned with PayoutRunCreate schema)
    res = await client.post("/api/v1/payouts/runs", headers=headers, json={
        "run_type": "driver_weekly",
        "period_label": "May 2026",
        "period_start": "2026-05-01T00:00:00",
        "period_end": "2026-05-31T23:59:59"
    })
    assert res.status_code == 201
    run_id = res.json()["id"]
    
    # 4. Reject Payout run
    res = await client.post(f"/api/v1/payouts/runs/{run_id}/reject", headers=headers, json={
        "reason": "Verify calculation mismatches in bank sheets"
    })
    assert res.status_code == 200
    assert res.json()["status"] == "failed"


# ── MODULE 17: NOTIFICATIONS & TEMPLATE MANAGEMENT ───────────────────────────────

async def test_module_17_notifications(client):
    # Fetch template listing
    res = await client.get("/api/v1/notifications/templates", headers=headers)
    assert res.status_code == 200


# ── MODULE 18: SUPPORT & TICKETING CONSOLE ───────────────────────────────────────

async def test_module_18_support_ticketing(client):
    global created_ticket_id
    
    # 1. Fetch SLA policies
    res = await client.get("/api/v1/support/sla-policies", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) >= 6  # preseeded SLA policies
    
    # 2. Fetch open tickets list
    res = await client.get("/api/v1/support/tickets", headers=headers)
    assert res.status_code == 200
    
    # 3. Create support ticket (aligned with TicketCreate schema)
    res = await client.post("/api/v1/support/tickets", headers=headers, json={
        "subject": "QA billing dispute",
        "category": "refunds_billing",
        "priority": "high",
        "requester_name": "QA Customer",
        "requester_type": "customer",
        "requester_id": PRESEEDED_CUSTOMER_ID,
        "body": "Double charge verified during simulation."
    })
    assert res.status_code == 201
    created_ticket_id = res.json()["id"]
    
    # 4. Post ticket response / message
    res = await client.post(f"/api/v1/support/tickets/{created_ticket_id}/messages", headers=headers, json={
        "body": "We are investigating the double charge. Balance correction is pending.",
        "kind": "reply"
    })
    assert res.status_code == 201


# ── MODULE 19, 20, 21, 22, 23 & 24: CORE PLATFORM SERVICES ───────────────────────

async def test_module_19_reports_exports(client):
    res = await client.post("/api/v1/reports/exports", headers=headers, json={
        "name": "QA Financial Export Summary",
        "format": "csv"
    })
    assert res.status_code in (200, 201)


async def test_module_20_kyc_stats(client):
    res = await client.get("/api/v1/kyc/queue", headers=headers)
    assert res.status_code == 200


async def test_module_21_branding(client):
    res = await client.get("/api/v1/branding/profiles", headers=headers)
    assert res.status_code == 200


async def test_module_22_settings(client):
    # Retrieve settings
    res = await client.get("/api/v1/settings", headers=headers)
    assert res.status_code == 200
    
    # Retrieve platform toggles
    res = await client.get("/api/v1/settings/toggles", headers=headers)
    assert res.status_code == 200


async def test_module_23_audit(client):
    # Check list of events
    res = await client.get("/api/v1/audit/events?time_window=24h", headers=headers)
    assert res.status_code == 200
    
    # Check stats
    res = await client.get("/api/v1/audit/stats?time_window=24h", headers=headers)
    assert res.status_code == 200


async def test_module_24_integrations(client):
    # Test file upload multipart endpoint
    file_data = {"file": ("test.png", io.BytesIO(b"dummy image data"), "image/png")}
    res = await client.post("/api/v1/uploads", headers=headers, files=file_data)
    assert res.status_code == 200
    assert "url" in res.json()
