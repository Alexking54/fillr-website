// Notification broadcasting and auto-rule editing.
//
// Loads after app.js and reuses its `state`, `adminFetch`, `safeJson`,
// `formatDate` and `makeRequestId` — both files are plain deferred scripts
// sharing one global scope, which is what keeps this dashboard build-free.

const notificationState = {
    options: null,
    // The form values the audience preview was run against. Send stays
    // disabled until this matches the form exactly, so nobody can preview a
    // narrow audience and then broadcast a wider one.
    previewedFingerprint: null,
    // Held across retries so a double-clicked Send collapses to one broadcast.
    pendingMessageId: null
};

const notificationElements = {
    viewTabs: document.getElementById("viewTabs"),
    connectionPanel: document.getElementById("connectionPanel"),
    dashboardPanel: document.getElementById("dashboardPanel"),
    notificationsPanel: document.getElementById("notificationsPanel"),
    rulesPanel: document.getElementById("rulesPanel"),

    composeForm: document.getElementById("composeForm"),
    composeTitle: document.getElementById("composeTitle_input"),
    composeBody: document.getElementById("composeBody"),
    composeCategory: document.getElementById("composeCategory"),
    composeDeepLink: document.getElementById("composeDeepLink"),
    composeAudience: document.getElementById("composeAudience"),
    composeSchedule: document.getElementById("composeSchedule"),
    titleCounter: document.getElementById("titleCounter"),
    bodyCounter: document.getElementById("bodyCounter"),
    previewButton: document.getElementById("previewButton"),
    sendButton: document.getElementById("sendButton"),
    composeStatus: document.getElementById("composeStatus"),
    refreshHistoryButton: document.getElementById("refreshHistoryButton"),
    historyList: document.getElementById("historyList"),

    rulesList: document.getElementById("rulesList"),
    refreshRulesButton: document.getElementById("refreshRulesButton"),
    ruleForm: document.getElementById("ruleForm"),
    ruleName: document.getElementById("ruleName"),
    ruleCondition: document.getElementById("ruleCondition"),
    ruleParams: document.getElementById("ruleParams"),
    ruleTitle: document.getElementById("ruleTitle"),
    ruleBody: document.getElementById("ruleBody"),
    rulePlaceholders: document.getElementById("rulePlaceholders"),
    ruleCategory: document.getElementById("ruleCategory"),
    ruleAudience: document.getElementById("ruleAudience"),
    ruleCooldown: document.getElementById("ruleCooldown"),
    ruleStatus: document.getElementById("ruleStatus")
};

const AUDIENCE_LABELS = {
    all: "Everyone",
    signedIn: "Signed-in accounts",
    plus: "Fillr Plus members",
    free: "Free accounts",
    trial: "On trial"
};

const DEEP_LINK_LABELS = {
    "": "Nothing in particular",
    home: "Home",
    notifications: "Notifications",
    vehicles: "Vehicles",
    fuel: "Find Fuel",
    trips: "Trips",
    fillrPlus: "Fillr Plus"
};

const CATEGORY_LABELS = {
    announcement: "Announcement",
    account: "Account",
    fuelPrices: "Fuel prices",
    serviceReminder: "Service reminder",
    registrationReminder: "Registration reminder",
    inactivity: "Inactivity"
};

// ---------------------------------------------------------------------- views

function showView(name) {
    const views = {
        accounts: notificationElements.dashboardPanel,
        notifications: notificationElements.notificationsPanel,
        rules: notificationElements.rulesPanel
    };

    for (const [key, panel] of Object.entries(views)) {
        panel.classList.toggle("hidden", key !== name);
    }

    notificationElements.viewTabs.querySelectorAll(".tab").forEach((tab) => {
        tab.setAttribute("aria-selected", String(tab.dataset.view === name));
    });

    if (name === "notifications") {
        loadOptions().then(loadHistory);
    }

    if (name === "rules") {
        loadOptions().then(loadRules);
    }
}

notificationElements.viewTabs.addEventListener("click", (event) => {
    const tab = event.target.closest(".tab");
    if (tab) {
        showView(tab.dataset.view);
    }
});

// app.js owns connect and disconnect; these listeners run after its own and
// only add the tab strip, so its logic is untouched.
document.getElementById("connectionForm").addEventListener("submit", () => {
    if (state.backendUrl && state.adminKey) {
        notificationElements.viewTabs.classList.remove("hidden");
        showView("accounts");
    }
});

document.getElementById("disconnectButton").addEventListener("click", () => {
    notificationElements.viewTabs.classList.add("hidden");
    notificationElements.notificationsPanel.classList.add("hidden");
    notificationElements.rulesPanel.classList.add("hidden");
    notificationState.options = null;
});

// -------------------------------------------------------------------- options

function fillSelect(select, values, labels, { includeBlank = false } = {}) {
    select.replaceChildren();

    if (includeBlank) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = labels[""] ?? "None";
        select.append(option);
    }

    for (const value of values) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = labels[value] ?? value;
        select.append(option);
    }
}

async function loadOptions() {
    if (notificationState.options) {
        return notificationState.options;
    }

    const response = await adminFetch("/admin/notifications/options");
    const payload = await safeJson(response);

    if (!response.ok || !payload) {
        setComposeStatus("Could not load options from the backend.", "error");
        return null;
    }

    notificationState.options = payload;

    fillSelect(notificationElements.composeCategory, payload.categories, CATEGORY_LABELS);
    fillSelect(notificationElements.composeAudience, payload.audiences, AUDIENCE_LABELS);
    fillSelect(notificationElements.composeDeepLink, payload.deepLinks, DEEP_LINK_LABELS, {
        includeBlank: true
    });
    fillSelect(notificationElements.ruleCategory, payload.categories, CATEGORY_LABELS);
    fillSelect(notificationElements.ruleAudience, payload.audiences, AUDIENCE_LABELS);
    fillSelect(notificationElements.ruleCondition, payload.conditionTypes, {
        inactivity: "Hasn't opened Fillr recently",
        trialEndingSoon: "Trial ending soon",
        plusLapsed: "Lapsed after trial"
    });

    renderRuleParams();
    return payload;
}

// -------------------------------------------------------------------- compose

function composeFingerprint() {
    return JSON.stringify({
        title: notificationElements.composeTitle.value.trim(),
        body: notificationElements.composeBody.value.trim(),
        category: notificationElements.composeCategory.value,
        deepLink: notificationElements.composeDeepLink.value,
        audience: notificationElements.composeAudience.value,
        schedule: notificationElements.composeSchedule.value
    });
}

function setComposeStatus(message, type = "") {
    notificationElements.composeStatus.textContent = message;
    notificationElements.composeStatus.className = `status ${type}`.trim();
}

function invalidatePreview() {
    notificationState.previewedFingerprint = null;
    notificationState.pendingMessageId = null;
    notificationElements.sendButton.disabled = true;
}

function updateCounters() {
    notificationElements.titleCounter.textContent =
        `${notificationElements.composeTitle.value.length}/64`;
    notificationElements.bodyCounter.textContent =
        `${notificationElements.composeBody.value.length}/300`;
}

notificationElements.composeForm.addEventListener("input", () => {
    updateCounters();
    // Any edit after a preview re-arms the guard.
    if (notificationState.previewedFingerprint !== composeFingerprint()) {
        invalidatePreview();
    }
});

notificationElements.previewButton.addEventListener("click", async () => {
    const audience = notificationElements.composeAudience.value;

    if (!notificationElements.composeTitle.value.trim() ||
        !notificationElements.composeBody.value.trim()) {
        setComposeStatus("Enter a title and body first.", "error");
        return;
    }

    setComposeStatus("Counting recipients…");

    const response = await adminFetch(
        `/admin/notifications/audience-preview?audience=${encodeURIComponent(audience)}`
    );
    const payload = await safeJson(response);

    if (!response.ok || !payload) {
        setComposeStatus("Could not preview the audience.", "error");
        return;
    }

    notificationState.previewedFingerprint = composeFingerprint();
    notificationState.pendingMessageId = makeRequestId();
    notificationElements.sendButton.disabled = payload.count === 0;

    setComposeStatus(
        payload.count === 0
            ? "No devices match that audience yet."
            : `${payload.count} recipient${payload.count === 1 ? "" : "s"}. Send is now enabled.`,
        payload.count === 0 ? "error" : "success"
    );
});

notificationElements.composeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (notificationState.previewedFingerprint !== composeFingerprint()) {
        invalidatePreview();
        setComposeStatus("The message changed. Preview the audience again.", "error");
        return;
    }

    const title = notificationElements.composeTitle.value.trim();
    const audience = notificationElements.composeAudience.value;
    const schedule = notificationElements.composeSchedule.value;

    const confirmed = window.confirm(
        schedule
            ? `Schedule "${title}" for ${AUDIENCE_LABELS[audience] ?? audience} at ${schedule}?`
            : `Send "${title}" to ${AUDIENCE_LABELS[audience] ?? audience} now? This cannot be undone.`
    );

    if (!confirmed) {
        return;
    }

    notificationElements.sendButton.disabled = true;
    setComposeStatus("Sending…");

    const response = await adminFetch("/admin/notifications", {
        method: "POST",
        body: JSON.stringify({
            messageId: notificationState.pendingMessageId,
            title,
            body: notificationElements.composeBody.value.trim(),
            category: notificationElements.composeCategory.value,
            deepLink: notificationElements.composeDeepLink.value || null,
            audience,
            scheduledFor: schedule ? new Date(schedule).toISOString() : null,
            sendNow: !schedule
        })
    });

    const payload = await safeJson(response);

    if (!response.ok) {
        setComposeStatus(payload?.message || "Send failed.", "error");
        notificationElements.sendButton.disabled = false;
        return;
    }

    setComposeStatus(
        schedule
            ? "Scheduled."
            : `Sent to ${payload.message.recipientCount} recipient(s).`,
        "success"
    );

    notificationElements.composeForm.reset();
    updateCounters();
    invalidatePreview();
    loadHistory();
});

notificationElements.refreshHistoryButton.addEventListener("click", loadHistory);

async function loadHistory() {
    const response = await adminFetch("/admin/notifications?limit=50");
    const payload = await safeJson(response);

    notificationElements.historyList.replaceChildren();

    if (!response.ok || !payload) {
        return;
    }

    if (payload.messages.length === 0) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "Nothing sent yet.";
        notificationElements.historyList.append(empty);
        return;
    }

    for (const message of payload.messages) {
        notificationElements.historyList.append(historyRow(message));
    }
}

// Everything below is built with createElement and textContent. The content is
// admin-authored text rendered back into the page, which is exactly where an
// innerHTML would become stored XSS.
function historyRow(message) {
    const row = document.createElement("div");
    row.className = "historyRow";

    const heading = document.createElement("div");
    heading.className = "historyHeading";

    const title = document.createElement("strong");
    title.textContent = message.title;

    const pill = document.createElement("span");
    pill.className = `pill ${message.status}`;
    pill.textContent = message.status;

    heading.append(title, pill);

    const body = document.createElement("p");
    body.className = "muted small";
    body.textContent = message.body;

    const meta = document.createElement("p");
    meta.className = "muted small";
    meta.textContent = [
        formatDate(message.createdAt),
        AUDIENCE_LABELS[message.audience] ?? message.audience,
        `${message.recipientCount} recipient(s)`,
        `${message.deliveredCount} pushed`,
        message.failedCount ? `${message.failedCount} failed` : null,
        message.source === "rule" ? "auto rule" : null
    ].filter(Boolean).join(" · ");

    row.append(heading, body, meta);
    return row;
}

// ---------------------------------------------------------------------- rules

notificationElements.ruleCondition.addEventListener("change", renderRuleParams);

function renderRuleParams() {
    const options = notificationState.options;
    notificationElements.ruleParams.replaceChildren();

    if (!options) {
        return;
    }

    const condition = notificationElements.ruleCondition.value;
    const defaults = options.conditionDefaults?.[condition] || {};
    const placeholders = [];

    for (const [key, value] of Object.entries(defaults)) {
        placeholders.push(`{{${key}}}`);

        const label = document.createElement("label");
        const span = document.createElement("span");
        span.textContent = key;

        let input;

        if (key === "signal") {
            input = document.createElement("select");
            fillSelect(input, ["appOpen", "activity"], {
                appOpen: "Hasn't opened the app",
                activity: "Hasn't logged a trip or fill-up"
            });
        } else {
            input = document.createElement("input");
            input.type = typeof value === "number" ? "number" : "text";
        }

        input.value = String(value);
        input.dataset.param = key;
        label.append(span, input);
        notificationElements.ruleParams.append(label);
    }

    notificationElements.rulePlaceholders.textContent = placeholders.length
        ? `Available in templates: ${placeholders.join(" ")}`
        : "";
}

function collectRuleParams() {
    const params = {};

    notificationElements.ruleParams.querySelectorAll("[data-param]").forEach((input) => {
        const raw = input.value;
        params[input.dataset.param] = input.type === "number" ? Number(raw) : raw;
    });

    return params;
}

notificationElements.refreshRulesButton.addEventListener("click", loadRules);

async function loadRules() {
    const response = await adminFetch("/admin/notification-rules");
    const payload = await safeJson(response);

    notificationElements.rulesList.replaceChildren();

    if (!response.ok || !payload) {
        return;
    }

    if (payload.rules.length === 0) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "No rules yet.";
        notificationElements.rulesList.append(empty);
        return;
    }

    for (const rule of payload.rules) {
        notificationElements.rulesList.append(ruleRow(rule));
    }
}

/// A rule that has never run, or has not run in a while, is the visible
/// symptom of a stopped cron service — so it is called out rather than shown
/// as a neutral date.
function staleness(rule) {
    if (!rule.isEnabled) {
        return { text: "disabled", stale: false };
    }

    if (!rule.lastRunAt) {
        return { text: "never run", stale: true };
    }

    const days = (Date.now() - new Date(rule.lastRunAt).getTime()) / 86_400_000;
    return {
        text: `last ran ${formatDate(rule.lastRunAt)}`,
        stale: days > 2
    };
}

function ruleRow(rule) {
    const row = document.createElement("div");
    row.className = "historyRow";

    const heading = document.createElement("div");
    heading.className = "historyHeading";

    const name = document.createElement("strong");
    name.textContent = rule.name;

    const pill = document.createElement("span");
    pill.className = `pill ${rule.isEnabled ? "sent" : "draft"}`;
    pill.textContent = rule.isEnabled ? "enabled" : "disabled";

    heading.append(name, pill);

    const body = document.createElement("p");
    body.className = "muted small";
    body.textContent = `${rule.titleTemplate} — ${rule.bodyTemplate}`;

    // Not named `state` — that is app.js's shared connection object, and
    // shadowing it here would be a trap for the next edit.
    const runState = staleness(rule);
    const meta = document.createElement("p");
    meta.className = runState.stale ? "status error compactStatus" : "muted small";
    meta.textContent = [
        rule.conditionType,
        AUDIENCE_LABELS[rule.audience] ?? rule.audience,
        `every ${rule.cooldownDays} days at most`,
        runState.text,
        rule.lastRunMatched == null ? null : `${rule.lastRunMatched} matched`,
        rule.lastRunError ? `error: ${rule.lastRunError}` : null
    ].filter(Boolean).join(" · ");

    const actions = document.createElement("div");
    actions.className = "actions";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "secondary small";
    toggle.textContent = rule.isEnabled ? "Disable" : "Enable";
    toggle.addEventListener("click", async () => {
        await adminFetch(`/admin/notification-rules/${rule.id}`, {
            method: "PATCH",
            body: JSON.stringify({ isEnabled: !rule.isEnabled })
        });
        loadRules();
    });

    const run = document.createElement("button");
    run.type = "button";
    run.className = "secondary small";
    run.textContent = "Run now";
    run.addEventListener("click", async () => {
        if (!window.confirm(`Run "${rule.name}" now? Matching users will be notified.`)) {
            return;
        }

        const response = await adminFetch(`/admin/notification-rules/${rule.id}/run`, {
            method: "POST"
        });
        const payload = await safeJson(response);
        setRuleStatus(
            response.ok
                ? `Ran "${rule.name}": ${payload.matched} notified.`
                : "Run failed.",
            response.ok ? "success" : "error"
        );
        loadRules();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger small";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
        if (!window.confirm(`Delete "${rule.name}"?`)) {
            return;
        }

        await adminFetch(`/admin/notification-rules/${rule.id}`, { method: "DELETE" });
        loadRules();
    });

    actions.append(toggle, run, remove);
    row.append(heading, body, meta, actions);
    return row;
}

function setRuleStatus(message, type = "") {
    notificationElements.ruleStatus.textContent = message;
    notificationElements.ruleStatus.className = `status ${type}`.trim();
}

notificationElements.ruleForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const response = await adminFetch("/admin/notification-rules", {
        method: "POST",
        body: JSON.stringify({
            name: notificationElements.ruleName.value.trim(),
            conditionType: notificationElements.ruleCondition.value,
            params: collectRuleParams(),
            titleTemplate: notificationElements.ruleTitle.value.trim(),
            bodyTemplate: notificationElements.ruleBody.value.trim(),
            category: notificationElements.ruleCategory.value,
            audience: notificationElements.ruleAudience.value,
            cooldownDays: Number(notificationElements.ruleCooldown.value),
            // Always created off. Enable it deliberately once the preview
            // shows a sensible match count.
            isEnabled: false
        })
    });

    const payload = await safeJson(response);

    if (!response.ok) {
        setRuleStatus(payload?.message || "Could not create the rule.", "error");
        return;
    }

    setRuleStatus("Rule created, disabled. Preview it, then enable it.", "success");
    notificationElements.ruleForm.reset();
    renderRuleParams();
    loadRules();
});

updateCounters();
