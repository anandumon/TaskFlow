import urllib.request
import urllib.error
import json
import uuid
import sys

BASE_URL = "http://localhost:8080/api/v1"

def http_req(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}" if path.startswith("/") else f"{BASE_URL}/{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            resp_body = resp.read().decode("utf-8")
            return resp.status, json.loads(resp_body) if resp_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = {"raw": err_body}
        return e.code, parsed
    except Exception as e:
        return 0, {"error": str(e)}

def register_and_login(name, email, password):
    print(f"\n[AUTH] Registering user: {name} ({email})")
    status, res = http_req("/auth/register", "POST", {
        "firstName": name.split()[0],
        "lastName": name.split()[1] if len(name.split()) > 1 else "User",
        "email": email,
        "password": password
    })
    if status != 201:
        print(f"FAILED to register {email}: status={status}, res={res}")
        return None, None
    dev_code = res.get("data", {}).get("devCode", "123456")
    print(f"[AUTH] Verifying email for {email} with OTP: {dev_code}")
    v_status, v_res = http_req("/auth/verify-email", "POST", {
        "email": email,
        "otp": dev_code
    })
    if v_status != 200 or not v_res.get("data", {}).get("success"):
        print(f"FAILED to verify {email}: status={v_status}, res={v_res}")
        return None, None
    token = v_res["data"]["accessToken"]
    user_id = v_res["data"]["user"]["id"]
    print(f"[AUTH] Successfully registered & logged in: {email} (id: {user_id})")
    return token, user_id

def run_test():
    suffix = uuid.uuid4().hex[:6]
    alice_email = f"alice_{suffix}@taskflow.dev"
    bob_email = f"bob_{suffix}@taskflow.dev"
    password = "SecurePassword123!"

    print("======================================================================")
    print("🚀 TASKFLOW MULTI-TENANT AUTHORIZATION & PERMISSION TEST SUITE")
    print("======================================================================")

    # 1. Register Alice & Bob
    alice_token, alice_id = register_and_login("Alice Admin", alice_email, password)
    assert alice_token, "Alice token is required"

    # 2. Alice creates Organization A
    print("\n--- Step 1: Alice creates Organization 'Acme Global' ---")
    st, res = http_req("/organizations", "POST", {"name": "Acme Global"}, alice_token)
    assert st == 201, f"Expected 201, got {st}: {res}"
    org_a = res["data"]
    org_a_id = org_a["id"]
    print(f"✔ Organization A created: {org_a['name']} (ID: {org_a_id})")

    # 3. Alice creates Workspace A
    print("\n--- Step 2: Alice creates Workspace 'Engineering' in Organization A ---")
    st, res = http_req(f"/organizations/{org_a_id}/workspaces", "POST", {
        "name": "Engineering",
        "description": "Core engineering team workspace",
        "color": "#6366F1"
    }, alice_token)
    assert st == 201, f"Expected 201, got {st}: {res}"
    ws_a = res["data"]
    ws_a_id = ws_a["id"]
    print(f"✔ Workspace A created: {ws_a['name']} (ID: {ws_a_id})")

    # 4. Alice creates Project A
    print("\n--- Step 3: Alice creates Project 'Mobile Application' in Workspace A ---")
    st, res = http_req(f"/workspaces/{ws_a_id}/projects", "POST", {
        "name": "Mobile Application",
        "description": "Next-gen iOS and Android app",
        "environments": "DEV,SIT,UAT,RELEASE,MAIN"
    }, alice_token)
    assert st == 201, f"Expected 201, got {st}: {res}"
    proj_a = res["data"]
    proj_a_id = proj_a["id"]
    print(f"✔ Project A created: {proj_a['name']} (ID: {proj_a_id})")

    # 5. Alice creates Task A
    print("\n--- Step 4: Alice creates Task A 'Implement Authentication' ---")
    st, res = http_req(f"/workspaces/{ws_a_id}/tasks", "POST", {
        "title": "Implement Authentication",
        "description": "Multi-tenant auth with Google & Supabase",
        "status": "todo",
        "environment": "DEV",
        "projectId": proj_a_id
    }, alice_token)
    assert st == 201, f"Expected 201, got {st}: {res}"
    task_a = res["data"]
    task_a_id = task_a["id"]
    print(f"✔ Task A created: {task_a['title']} (ID: {task_a_id})")

    # 6. Alice invites Bob to Project A
    print(f"\n--- Step 5: Alice invites Bob ({bob_email}) to Project A ---")
    st, res = http_req(f"/projects/{proj_a_id}/invitations", "POST", {
        "email": bob_email,
        "role": "MEMBER"
    }, alice_token)
    assert st == 201, f"Expected 201, got {st}: {res}"
    invite = res["data"]
    token = invite["token"]
    print(f"✔ Invitation dispatched: Token={token}, Role={invite['role']}, ExpiresAt={invite['expiresAt']}")

    # 7. Unauthenticated Token Verification (simulating clicking invite link)
    print("\n--- Step 6: Public Invitation Token Verification ---")
    st, res = http_req(f"/invitations/{token}", "GET")
    assert st == 200, f"Expected 200, got {st}: {res}"
    inv_pub = res["data"]
    print(f"✔ Public invite details verified: Org='{inv_pub['orgName']}', Workspace='{inv_pub['workspaceName']}', Project='{inv_pub['projectName']}'")

    # 8. Register Bob
    bob_token, bob_id = register_and_login("Bob Collaborator", bob_email, password)
    assert bob_token, "Bob token is required"

    # 9. Bob accepts the invitation
    print("\n--- Step 7: Bob accepts Invitation ---")
    st, res = http_req(f"/invitations/{token}/accept", "POST", {}, bob_token)
    assert st == 200, f"Expected 200, got {st}: {res}"
    accept_data = res["data"]
    print(f"✔ Invitation accepted: User {bob_email} joined Org '{accept_data['organizationName']}' and Workspace '{accept_data['workspaceName']}'")

    # 10. Verify Bob can access Organization A & Workspace A
    print("\n--- Step 8: Bob verifies access to Organization A, Workspace A, Project A ---")
    st, res = http_req("/organizations", "GET", token=bob_token)
    assert st == 200, f"Expected 200, got {st}: {res}"
    org_ids = [o["id"] for o in res["data"]]
    assert org_a_id in org_ids, f"Organization A {org_a_id} not visible to Bob! Orgs: {org_ids}"
    print(f"✔ Bob can view Organization A ({org_a['name']})")

    st, res = http_req(f"/organizations/{org_a_id}/workspaces", "GET", token=bob_token)
    assert st == 200, f"Expected 200, got {st}: {res}"
    ws_ids = [w["id"] for w in res["data"]]
    assert ws_a_id in ws_ids, f"Workspace A {ws_a_id} not visible to Bob! Workspaces: {ws_ids}"
    print(f"✔ Bob can view Workspace A ({ws_a['name']})")

    st, res = http_req(f"/workspaces/{ws_a_id}/projects", "GET", token=bob_token)
    assert st == 200, f"Expected 200, got {st}: {res}"
    proj_ids = [p["id"] for p in res["data"]]
    assert proj_a_id in proj_ids, f"Project A {proj_a_id} not visible to Bob! Projects: {proj_ids}"
    print(f"✔ Bob can view Project A ({proj_a['name']})")

    st, res = http_req(f"/projects/{proj_a_id}/tasks", "GET", token=bob_token)
    assert st == 200, f"Expected 200, got {st}: {res}"
    task_ids = [t["id"] for t in res["data"]]
    assert task_a_id in task_ids, f"Task A {task_a_id} not visible to Bob! Tasks: {task_ids}"
    print(f"✔ Bob can view Task A ({task_a['title']})")

    # 11. Multi-Tenant Independence: Bob creates his OWN Organization & Workspace
    print("\n--- Step 9: Multi-Tenancy: Bob creates his own Organization 'Bob Labs' ---")
    st, res = http_req("/organizations", "POST", {"name": "Bob Labs"}, bob_token)
    assert st == 201, f"Expected 201, got {st}: {res}"
    org_b = res["data"]
    org_b_id = org_b["id"]
    print(f"✔ Organization B created: {org_b['name']} (ID: {org_b_id})")

    st, res = http_req(f"/organizations/{org_b_id}/workspaces", "POST", {
        "name": "Bob Innovation Lab",
        "description": "Bob's private R&D lab"
    }, bob_token)
    assert st == 201, f"Expected 201, got {st}: {res}"
    ws_b = res["data"]
    ws_b_id = ws_b["id"]
    print(f"✔ Workspace B created: {ws_b['name']} (ID: {ws_b_id})")

    # 12. Security Test: Tenant Isolation (Alice CANNOT access Bob Labs)
    print("\n--- Step 10: Security Negative Test: Alice tries to access Bob Labs ---")
    st, res = http_req(f"/organizations/{org_b_id}", "GET", token=alice_token)
    print(f"  Alice access to Bob Labs: status={st}, code={res.get('error', {}).get('code')}")
    assert st == 403, f"Expected 403 Forbidden for Alice accessing Bob Labs, got {st}"
    print("✔ Cross-tenant isolation verified: Alice blocked with 403 FORBIDDEN from accessing Bob Labs")

    st, res = http_req(f"/organizations/{org_b_id}/workspaces", "GET", token=alice_token)
    print(f"  Alice access to Bob Workspaces: status={st}, code={res.get('error', {}).get('code')}")
    assert st == 403, f"Expected 403 Forbidden for Alice listing Bob workspaces, got {st}"
    print("✔ Cross-workspace isolation verified: Alice blocked with 403 FORBIDDEN from listing Bob workspaces")

    # 13. Admin Removal Scenario: Alice removes Bob from Acme Global
    print("\n--- Step 11: Alice removes Bob's membership from Organization A ---")
    st, res = http_req(f"/organizations/{org_a_id}/members", "GET", token=alice_token)
    assert st == 200, f"Expected 200, got {st}: {res}"
    members = res["data"]
    bob_member = next((m for m in members if m["userId"] == bob_id), None)
    assert bob_member, f"Bob's membership record not found in Org A: {members}"
    bob_member_id = bob_member["id"]
    print(f"Found Bob membership in Org A: ID={bob_member_id}")

    st, res = http_req(f"/organizations/{org_a_id}/members/{bob_member_id}", "DELETE", token=alice_token)
    assert st == 200, f"Expected 200, got {st}: {res}"
    print(f"✔ Alice removed Bob from Organization A (memberId: {bob_member_id})")

    # 14. Immediate Revocation Check for Bob
    print("\n--- Step 12: Immediate Revocation Verification for Bob ---")
    st, res = http_req(f"/organizations/{org_a_id}", "GET", token=bob_token)
    print(f"  Bob access to Org A after removal: status={st}, message={res.get('error', {}).get('message')}")
    assert st == 403, f"Expected 403 Forbidden for Bob accessing Org A after removal, got {st}"
    print("✔ Bob immediately blocked from Organization A: 403 FORBIDDEN")

    st, res = http_req(f"/organizations/{org_a_id}/workspaces", "GET", token=bob_token)
    print(f"  Bob access to Org A workspaces after removal: status={st}")
    assert st == 403, f"Expected 403 Forbidden for Bob accessing Org A workspaces, got {st}"
    print("✔ Bob immediately blocked from Org A Workspaces: 403 FORBIDDEN")

    st, res = http_req(f"/workspaces/{ws_a_id}", "GET", token=bob_token)
    print(f"  Bob access to Workspace A after removal: status={st}")
    assert st == 403, f"Expected 403 Forbidden for Bob accessing Workspace A, got {st}"
    print("✔ Bob immediately blocked from Workspace A: 403 FORBIDDEN")

    # 15. Bob still retains his own independent organization!
    print("\n--- Step 13: Bob retains his own personal organization (Bob Labs) ---")
    st, res = http_req(f"/organizations/{org_b_id}", "GET", token=bob_token)
    assert st == 200, f"Expected 200, got {st}: {res}"
    print(f"✔ Bob retains full access to '{res['data']['name']}' (Status 200 OK)")

    print("\n======================================================================")
    print("🎉 ALL 13 MULTI-TENANT COLLABORATION & ISOLATION TESTS PASSED!")
    print("======================================================================")

if __name__ == "__main__":
    run_test()
