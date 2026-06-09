document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Small toast helper with optional undo callback
  function showToast(message, { type = 'info', duration = 5000, undoLabel = 'Undo', onUndo } = {}) {
    if (!messageDiv) return;
    if (onUndo) {
      messageDiv.innerHTML = `<span class="toast-message">${message}</span> <button id="toast-undo" class="toast-undo">${undoLabel}</button>`;
    } else {
      messageDiv.textContent = message;
    }
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');

    let undone = false;
    if (onUndo) {
      const btn = document.getElementById('toast-undo');
      btn.addEventListener('click', async () => {
        undone = true;
        try {
          await onUndo();
        } catch (e) {
          console.error('Undo failed', e);
        }
        messageDiv.classList.add('hidden');
      });
    }

    setTimeout(() => {
      if (!undone) messageDiv.classList.add('hidden');
    }, duration);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and activity options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML = details.participants && details.participants.length > 0
          ? details.participants.map((participant) => `
              <li>
                <span class="participant-email">${participant}</span>
                <button type="button" class="delete-participant" data-activity="${name}" data-email="${participant}" aria-label="Remove participant">✖</button>
              </li>
            `).join("")
          : '<li class="muted">No participants yet</li>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p><strong>Participants:</strong></p>
            <ul class="participant-list">
              ${participantsHTML}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Attach delete handlers for participants in this card
        activityCard.querySelectorAll('.delete-participant').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const email = btn.dataset.email;
            const activityName = btn.dataset.activity;
            if (!confirm(`Remove ${email} from ${activityName}?`)) return;
            try {
              const res = await fetch(
                `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
                { method: 'DELETE' }
              );
              const data = await res.json();
              if (res.ok) {
                // Show toast with undo
                showToast(`${email} removed from ${activityName}`, {
                  type: 'info',
                  undoLabel: 'Undo',
                  duration: 5000,
                  onUndo: async () => {
                    // Try to re-signup the participant
                    const r = await fetch(
                      `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`,
                      { method: 'POST' }
                    );
                    if (!r.ok) {
                      const err = await r.json().catch(() => ({}));
                      showToast(err.detail || 'Undo failed', { type: 'error', duration: 3000 });
                    } else {
                      showToast('Participant restored', { type: 'success', duration: 2000 });
                      fetchActivities();
                    }
                  }
                });

                // Refresh activities to update UI
                fetchActivities();
              } else {
                showToast(data.detail || 'Failed to remove participant', { type: 'error' });
              }
            } catch (err) {
              console.error('Error removing participant:', err);
              showToast('Error removing participant', { type: 'error' });
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
