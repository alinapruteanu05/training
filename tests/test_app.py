import copy

from fastapi.testclient import TestClient

from src.app import app, activities

client = TestClient(app)
original_activities = copy.deepcopy(activities)


def reset_activities():
    activities.clear()
    activities.update(copy.deepcopy(original_activities))


def test_root_redirect():
    response = client.get("/", follow_redirects=False)

    assert response.status_code in (307, 308)
    assert response.headers["location"] == "/static/index.html"


def test_get_activities():
    reset_activities()

    response = client.get("/activities")

    assert response.status_code == 200
    assert "Chess Club" in response.json()
    assert isinstance(response.json()["Chess Club"], dict)


def test_signup_for_activity():
    reset_activities()

    email = "newstudent@mergington.edu"
    response = client.post("/activities/Chess Club/signup", params={"email": email})

    assert response.status_code == 200
    assert response.json()["message"] == f"Signed up {email} for Chess Club"
    assert email in activities["Chess Club"]["participants"]


def test_signup_duplicate_returns_400():
    reset_activities()

    email = "michael@mergington.edu"
    response = client.post("/activities/Chess Club/signup", params={"email": email})

    assert response.status_code == 400
    assert response.json()["detail"] == "Already signed up for this activity"


def test_signup_missing_activity_returns_404():
    reset_activities()

    response = client.post("/activities/Track Club/signup", params={"email": "student@mergington.edu"})

    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_remove_participant():
    reset_activities()

    email = "michael@mergington.edu"
    response = client.delete("/activities/Chess Club/participants", params={"email": email})

    assert response.status_code == 200
    assert response.json()["message"] == f"Removed {email} from Chess Club"
    assert email not in activities["Chess Club"]["participants"]


def test_remove_non_registered_participant_returns_400():
    reset_activities()

    response = client.delete("/activities/Chess Club/participants", params={"email": "unknown@mergington.edu"})

    assert response.status_code == 400
    assert response.json()["detail"] == "Participant not registered"
