const state = {
    backendUrl: "",
    adminKey: "",
    selectedUser: null,
    loading: false,
    cloudDataLoading: false
};

const elements = {
    connectionPanel: document.getElementById("connectionPanel"),
    dashboardPanel: document.getElementById("dashboardPanel"),
    connectionForm: document.getElementById("connectionForm"),
    backendUrlInput: document.getElementById("backendUrlInput"),
    adminKeyInput: document.getElementById("adminKeyInput"),
    disconnectButton: document.getElementById("disconnectButton"),
    connectionLabel: document.getElementById("connectionLabel"),
    searchForm: document.getElementById("searchForm"),
    emailInput: document.getElementById("emailInput"),
    statusMessage: document.getElementById("statusMessage"),
    userPanel: document.getElementById("userPanel"),
    userDetails: document.getElementById("userDetails"),
    cloudDataDetails: document.getElementById("cloudDataDetails"),
    cloudDataStatus: document.getElementById("cloudDataStatus"),
    refreshCloudDataButton: document.getElementById("refreshCloudDataButton"),
    adminLabelForm: document.getElementById("adminLabelForm"),
    adminLabelInput: document.getElementById("adminLabelInput"),
    saveAdminLabelButton: document.getElementById("saveAdminLabelButton"),
    grantLifetimeButton: document.getElementById("grantLifetimeButton"),
    grantUntilForm: document.getElementById("grantUntilForm"),
    expiryDateInput: document.getElementById("expiryDateInput"),
    revokeButton: document.getElementById("revokeButton"),
    refreshRecentAppleButton: document.getElementById("refreshRecentAppleButton"),
    recentAppleUsers: document.getElementById("recentAppleUsers")
};

elements.connectionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const backendUrl = normalizeBackendUrl(elements.backendUrlInput.value);
    const adminKey = elements.adminKeyInput.value;
    if (!backendUrl || !adminKey) {
        setStatus("Enter the backend URL and admin API key.", "error");
        return;
    }

    state.backendUrl = backendUrl;
    state.adminKey = adminKey;
    elements.adminKeyInput.value = "";
    elements.connectionPanel.classList.add("hidden");
    elements.dashboardPanel.classList.remove("hidden");
    elements.disconnectButton.classList.remove("hidden");
    elements.connectionLabel.textContent = backendUrl;
    setStatus("Connected.", "success");
    loadRecentAppleUsers();
});

elements.adminLabelForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!state.selectedUser) {
        setStatus("Select a user first.", "error");
        return;
    }

    await saveAdminLabel();
});

elements.disconnectButton.addEventListener("click", () => {
    state.backendUrl = "";
    state.adminKey = "";
    state.selectedUser = null;
    elements.connectionPanel.classList.remove("hidden");
    elements.dashboardPanel.classList.add("hidden");
    elements.disconnectButton.classList.add("hidden");
    elements.userPanel.classList.add("hidden");
    elements.userDetails.replaceChildren();
    elements.cloudDataDetails.replaceChildren();
    setCloudDataStatus("");
    elements.adminLabelInput.value = "";
    elements.emailInput.value = "";
    elements.expiryDateInput.value = "";
    setStatus("");
});

elements.searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await searchUser(elements.emailInput.value);
});

elements.grantLifetimeButton.addEventListener("click", async () => {
    if (!state.selectedUser) return;
    const email = displayValue(state.selectedUser.email);
    if (!confirm(`Grant lifetime Fillr Plus access to ${email}?`)) return;
    await grantAccess(null);
});

elements.grantUntilForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.selectedUser) return;

    const expiresAt = expiryDateToIso(elements.expiryDateInput.value);
    if (!expiresAt) {
        setStatus("Choose a future expiry date and time.", "error");
        return;
    }

    const email = displayValue(state.selectedUser.email);
    if (!confirm(`Grant Fillr Plus access to ${email} until ${formatDate(expiresAt)}?`)) return;
    await grantAccess(expiresAt);
});

elements.revokeButton.addEventListener("click", async () => {
    if (!state.selectedUser) return;
    const email = displayValue(state.selectedUser.email);
    if (!confirm(`Revoke only administrator-granted Fillr Plus access for ${email}? Apple subscriptions and active trials are not cancelled.`)) return;
    await revokeAccess();
});

elements.refreshCloudDataButton.addEventListener("click", async () => {
    if (!state.selectedUser || state.cloudDataLoading) return;
    await loadCloudData(state.selectedUser.id);
});

elements.refreshRecentAppleButton.addEventListener("click", async () => {
    await loadRecentAppleUsers();
});

async function loadRecentAppleUsers() {
    await runRequest("Loading recent Apple users...", async () => {
        const response = await adminFetch("/admin/users/recent-apple");

        if (response.status === 401) {
            elements.recentAppleUsers.replaceChildren();
            setStatus("Invalid admin key.", "error");
            return;
        }

        if (!response.ok) {
            elements.recentAppleUsers.replaceChildren();
            setStatus("Could not load recent Apple users.", "error");
            return;
        }

        const payload = await safeJson(response);

        if (!payload || !Array.isArray(payload.users)) {
            elements.recentAppleUsers.replaceChildren();
            setStatus("Malformed response from backend.", "error");
            return;
        }

        renderRecentAppleUsers(payload.users);
        setStatus("Recent Apple users loaded.", "success");
    });
}

function renderRecentAppleUsers(users) {
    elements.recentAppleUsers.replaceChildren();

    if (users.length === 0) {
        const message = document.createElement("p");
        message.className = "muted";
        message.textContent = "No Apple users found.";
        elements.recentAppleUsers.append(message);
        return;
    }

    users.forEach((user) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "recentUserButton";

        const title = document.createElement("strong");
        title.textContent =
            user.adminLabel ||
            user.displayName ||
            user.email ||
            "Apple account — email unavailable";

        const details = document.createElement("span");
        details.textContent =
            `${formatDate(user.createdAt)} · ${user.id}`;

        button.append(title, details);

        button.addEventListener("click", () => {
            state.selectedUser = user;
            renderUser(user);
            setStatus("User selected.", "success");
        });

        elements.recentAppleUsers.append(button);
    });
}

async function searchUser(email) {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
        setStatus("Enter an email address.", "error");
        return;
    }

    await runRequest("Searching...", async () => {
        await fetchAndRenderUser(normalizedEmail, "User found.");
    });
}

async function saveAdminLabel() {
    await runRequest("Saving admin label...", async () => {
        const response = await adminFetch(
            `/admin/users/${encodeURIComponent(state.selectedUser.id)}/admin-label`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    adminLabel: elements.adminLabelInput.value
                })
            }
        );

        if (response.status === 401) {
            setStatus("Invalid admin key.", "error");
            return;
        }

        if (!response.ok) {
            setStatus("Could not save admin label.", "error");
            return;
        }

        const payload = await safeJson(response);
        state.selectedUser.adminLabel =
            payload?.adminLabel ?? null;

        elements.adminLabelInput.value =
            state.selectedUser.adminLabel || "";

        setStatus(
            state.selectedUser.adminLabel
                ? "Admin label saved."
                : "Admin label cleared.",
            "success"
        );

        await loadRecentAppleUsers();
    });
}

async function grantAccess(expiresAt) {
    await runRequest("Granting access...", async () => {
        const response = await adminFetch(`/admin/users/${encodeURIComponent(state.selectedUser.id)}/entitlement`, {
            method: "POST",
            body: JSON.stringify({
                expiresAt,
                note: "Granted through Fillr Admin Dashboard"
            })
        });

        if (response.status === 401) {
            setStatus("Invalid admin key.", "error");
            return;
        }
        if (!response.ok) {
            setStatus("Could not grant access.", "error");
            return;
        }

        setStatus("Access granted.", "success");
        await fetchAndRenderUser(state.selectedUser.id, "Access granted.");
    });
}

async function revokeAccess() {
    await runRequest("Revoking admin access...", async () => {
        const response = await adminFetch(`/admin/users/${encodeURIComponent(state.selectedUser.id)}/entitlement`, {
            method: "DELETE"
        });

        if (response.status === 401) {
            setStatus("Invalid admin key.", "error");
            return;
        }
        if (!response.ok) {
            setStatus("Could not revoke admin access.", "error");
            return;
        }

        setStatus("Admin access revoked.", "success");
        await fetchAndRenderUser(state.selectedUser.id, "Admin access revoked.");
    });
}

async function fetchAndRenderUser(email, successMessage) {
    const response = await adminFetch(`/admin/users?email=${encodeURIComponent(email)}`);
    if (response.status === 401) {
        clearSelectedUser();
        setStatus("Invalid admin key.", "error");
        return;
    }
    if (!response.ok) {
        clearSelectedUser();
        setStatus("Backend unavailable. Check the API URL and try again.", "error");
        return;
    }

    const payload = await safeJson(response);
    if (!payload || !Array.isArray(payload.users)) {
        clearSelectedUser();
        setStatus("Malformed response from backend.", "error");
        return;
    }

    if (payload.users.length === 0) {
        clearSelectedUser();
        setStatus("No user found.", "error");
        return;
    }

    state.selectedUser = payload.users[0];
    renderUser(state.selectedUser);
    setStatus(successMessage, "success");
    await loadCloudData(state.selectedUser.id, state.selectedUser.cloudData);
}

async function runRequest(message, action) {
    if (state.loading) return;
    state.loading = true;
    setButtonsDisabled(true);
    setStatus(message);
    try {
        await action();
    } catch {
        setStatus("Backend unavailable. Check the API URL and network connection.", "error");
    } finally {
        state.loading = false;
        setButtonsDisabled(false);
    }
}

function adminFetch(path, options = {}) {
    return fetch(`${state.backendUrl}${path}`, {
        ...options,
        headers: {
            "content-type": "application/json",
            "x-fillr-admin-key": state.adminKey,
            "x-request-id": makeRequestId(),
            ...(options.headers || {})
        }
    });
}

async function safeJson(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function renderUser(user) {
    elements.userDetails.replaceChildren();
    appendDetail("Email", user.email);
    appendDetail("Display Name", user.displayName);
    appendDetail("Admin Label", user.adminLabel);
    appendDetail("User ID", user.id);
    appendDetail("Created", formatDate(user.createdAt));
    appendDetail("Entitlement Source", user.entitlementSource);
    appendDetail("Entitlement Expiry", formatDate(user.entitlementExpiresAt));
    appendDetail("Admin Entitlement Active", user.adminEntitlementActive === true ? "Yes" : "No");
    renderCloudData(user.cloudData || null);
    elements.adminLabelInput.value = user.adminLabel || "";
    elements.userPanel.classList.remove("hidden");
}

function appendDetail(label, value) {
    if (value == null || value === "") return;
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = String(value);
    elements.userDetails.append(term, description);
}

function clearSelectedUser() {
    state.selectedUser = null;
    elements.userPanel.classList.add("hidden");
    elements.userDetails.replaceChildren();
    elements.cloudDataDetails.replaceChildren();
    setCloudDataStatus("");
}

function setButtonsDisabled(disabled) {
    document.querySelectorAll("button").forEach((button) => {
        button.disabled = disabled;
    });
    if (!disabled && state.cloudDataLoading) {
        elements.refreshCloudDataButton.disabled = true;
    }
}

function setStatus(message, type = "") {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = type ? `status ${type}` : "status";
}

async function loadCloudData(userId, fallbackCloudData = null) {
    if (state.cloudDataLoading) return;
    state.cloudDataLoading = true;
    elements.refreshCloudDataButton.disabled = true;
    renderCloudData(null);
    setCloudDataStatus("Loading cloud data...");

    try {
        const response = await adminFetch(`/admin/users/${encodeURIComponent(userId)}/cloud-data`);
        if (response.status === 401) {
            setCloudDataStatus("Invalid admin key.", "error");
            return;
        }
        if (!response.ok) {
            if (fallbackCloudData) {
                renderCloudData(fallbackCloudData);
            }
            setCloudDataStatus("Could not load cloud data.", "error");
            return;
        }

        const cloudData = await safeJson(response);
        if (!isCloudData(cloudData)) {
            if (fallbackCloudData) {
                renderCloudData(fallbackCloudData);
            }
            setCloudDataStatus("Malformed cloud data response.", "error");
            return;
        }

        state.selectedUser = { ...state.selectedUser, cloudData };
        renderCloudData(cloudData);
        setCloudDataStatus("");
    } catch {
        if (fallbackCloudData) {
            renderCloudData(fallbackCloudData);
        }
        setCloudDataStatus("Could not load cloud data.", "error");
    } finally {
        state.cloudDataLoading = false;
        elements.refreshCloudDataButton.disabled = false;
    }
}

function renderCloudData(cloudData) {
    elements.cloudDataDetails.replaceChildren();
    if (!cloudData) {
        appendCloudDetail("Vehicles", "Loading...");
        appendCloudDetail("Trips", "Loading...");
        appendCloudDetail("Fuel receipts", "Loading...");
        appendCloudDetail("Total trip distance", "Loading...");
        appendCloudDetail("Last data sync", "Loading...");
        return;
    }

    appendCloudDetail("Vehicles", formatCount(cloudData.vehicleCount));
    appendCloudDetail("Trips", formatCount(cloudData.tripCount));
    appendCloudDetail("Fuel receipts", formatCount(cloudData.fuelReceiptCount));
    appendCloudDetail("Total trip distance", formatDistanceKm(cloudData.totalTripDistanceKm));
    appendCloudDetail("Last data sync", cloudData.lastDataSyncAt ? formatDate(cloudData.lastDataSyncAt) : "No synced data");
}

function appendCloudDetail(label, value) {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = String(value);
    elements.cloudDataDetails.append(term, description);
}

function setCloudDataStatus(message, type = "") {
    elements.cloudDataStatus.textContent = message;
    elements.cloudDataStatus.className = type ? `status compactStatus ${type}` : "status compactStatus";
}

function isCloudData(value) {
    return value
        && typeof value === "object"
        && Number.isFinite(Number(value.vehicleCount))
        && Number.isFinite(Number(value.tripCount))
        && Number.isFinite(Number(value.fuelReceiptCount))
        && Number.isFinite(Number(value.totalTripDistanceKm))
        && (value.lastDataSyncAt == null || typeof value.lastDataSyncAt === "string");
}

function formatCount(value) {
    return new Intl.NumberFormat().format(Number(value || 0));
}

function formatDistanceKm(value) {
    return `${new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    }).format(Number(value || 0))} km`;
}

function normalizeBackendUrl(value) {
    try {
        const url = new URL(value.trim());
        url.pathname = url.pathname.replace(/\/+$/, "");
        url.search = "";
        url.hash = "";
        return url.toString().replace(/\/$/, "");
    } catch {
        return "";
    }
}

function expiryDateToIso(value) {
    if (!value) return null;

    const expiry = new Date(value);

    if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) {
        return null;
    }

    return expiry.toISOString();
}

function formatDate(value) {
    if (!value) return "None";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function displayValue(value) {
    return value == null || value === "" ? "this user" : String(value);
}

function makeRequestId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
        return globalThis.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
