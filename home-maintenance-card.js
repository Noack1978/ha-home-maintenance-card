/**
 * Home Maintenance Card
 * ----------------------
 * Custom Lovelace card that mirrors the "Home Maintenance" sidebar panel
 * (TJPoorman/home_maintenance) directly on a dashboard: list, add, edit,
 * complete and remove tasks — using the integration's own WebSocket API.
 *
 * Install:
 *   1. Copy this file to /config/www/home-maintenance-card.js
 *   2. Dashboards -> ... -> Resources -> Add resource
 *        URL: /local/home-maintenance-card.js
 *        Type: JavaScript module
 *   3. Add a card of type: custom:home-maintenance-card
 *
 * No card config options are required. Optional:
 *   type: custom:home-maintenance-card
 *   title: Haus-Wartung
 *
 * Supports the visual (GUI) card editor and resizable card size in the
 * Sections view layout editor.
 */

const WS = {
  list: (hass) => hass.callWS({ type: "home_maintenance/get_tasks" }),
  tags: (hass) => hass.callWS({ type: "tag/list" }),
  add: (hass, payload) =>
    hass.callWS({ type: "home_maintenance/add_task", ...payload }),
  update: (hass, payload) =>
    hass.callWS({ type: "home_maintenance/update_task", ...payload }),
  remove: (hass, id) =>
    hass.callWS({ type: "home_maintenance/remove_task", task_id: id }),
  complete: (hass, id) =>
    hass.callWS({ type: "home_maintenance/complete_task", task_id: id }),
};

const INTERVAL_LABELS = { days: "Tage", weeks: "Wochen", months: "Monate" };

function computeDue(task) {
  const last = task.last_performed ? new Date(task.last_performed) : null;
  if (!last || isNaN(last)) {
    return { due: null, isOn: true, label: "Kein Datum – bitte einmal erledigen" };
  }
  const due = new Date(last);
  if (task.interval_type === "days") due.setDate(due.getDate() + Number(task.interval_value));
  else if (task.interval_type === "weeks") due.setDate(due.getDate() + Number(task.interval_value) * 7);
  else if (task.interval_type === "months") due.setMonth(due.getMonth() + Number(task.interval_value));
  due.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / 86400000);
  const isOn = diffDays <= 0;

  let label;
  if (diffDays === 0) label = "Heute fällig";
  else if (diffDays > 0) label = `Fällig in ${diffDays} Tag${diffDays === 1 ? "" : "en"}`;
  else label = `Überfällig seit ${Math.abs(diffDays)} Tag${Math.abs(diffDays) === 1 ? "" : "en"}`;

  return { due, isOn, label };
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}

class HomeMaintenanceCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._tasks = [];
    this._tags = [];
    this._loaded = false;
    this._editingId = null; // null = closed, "new" = add, else task id
  }

  setConfig(config) {
    this._config = config || {};
    this._title = this._config.title || "Haus-Wartung";
  }

  static getStubConfig() {
    return { title: "Haus-Wartung" };
  }

  static getConfigElement() {
    return document.createElement("home-maintenance-card-editor");
  }

  // Enables the resize handles in the Sections view visual editor.
  getLayoutOptions() {
    return {
      grid_columns: 4,
      grid_rows: 5,
      grid_min_columns: 2,
      grid_max_columns: 12,
      grid_min_rows: 2,
      grid_max_rows: 20,
    };
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) {
      this._skeleton();
      this._refresh();
    }
  }

  getCardSize() {
    return 3 + Math.min(this._tasks.length, 8);
  }

  async _refresh() {
    if (!this._hass) return;
    try {
      const [tasks, tags] = await Promise.all([
        WS.list(this._hass),
        WS.tags(this._hass).catch(() => []),
      ]);
      this._tasks = (tasks || []).sort((a, b) => {
        const da = computeDue(a).due;
        const db = computeDue(b).due;
        if (!da) return -1;
        if (!db) return 1;
        return da - db;
      });
      this._tags = tags || [];
      this._loaded = true;
      this._renderList();
    } catch (err) {
      this._loaded = true;
      this._renderError(err);
    }
  }

  _skeleton() {
    const style = document.createElement("style");
    style.textContent = `
      :host { display: block; }
      ha-card { padding: 0; overflow: visible; }
      .header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 16px 4px 16px;
      }
      .header h1 {
        font-size: 1.2em; font-weight: 500; margin: 0;
        color: var(--primary-text-color);
      }
      .add-btn {
        --mdc-icon-button-size: 36px;
        color: var(--primary-color);
        cursor: pointer;
      }
      .list { padding: 4px 0 8px 0; }
      .empty {
        padding: 24px 16px; text-align: center;
        color: var(--secondary-text-color);
      }
      .row {
        display: flex; align-items: center; gap: 12px;
        padding: 10px 16px;
        border-top: 1px solid var(--divider-color);
      }
      .row:first-child { border-top: none; }
      .row ha-icon.task-icon {
        color: var(--state-icon-color, var(--paper-item-icon-color));
        flex-shrink: 0;
      }
      .row.due ha-icon.task-icon { color: var(--error-color); }
      .info { flex: 1; min-width: 0; cursor: pointer; }
      .info .title {
        color: var(--primary-text-color);
        font-weight: 500;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .info .subtitle {
        color: var(--secondary-text-color);
        font-size: 0.85em;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .row.due .subtitle { color: var(--error-color); }
      .actions { display: flex; gap: 4px; flex-shrink: 0; }
      .actions ha-icon-button { color: var(--secondary-text-color); }
      .actions .complete { color: var(--success-color, #4caf50); }
      .actions .delete:hover { color: var(--error-color); }

      .overlay {
        position: fixed; inset: 0; z-index: 8000;
        background: rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        padding: 16px;
      }
      .dialog {
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color);
        border-radius: var(--ha-card-border-radius, 12px);
        width: 100%; max-width: 420px;
        max-height: 90vh; overflow-y: auto;
        box-shadow: var(--ha-dialog-box-shadow, 0 4px 24px rgba(0,0,0,0.3));
      }
      .dialog h2 {
        margin: 0; padding: 16px 20px; font-size: 1.15em;
        border-bottom: 1px solid var(--divider-color);
      }
      .dialog form { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
      .field label {
        display: block; font-size: 0.85em;
        color: var(--secondary-text-color); margin-bottom: 4px;
      }
      .field input, .field select {
        width: 100%; box-sizing: border-box;
        padding: 10px; border-radius: 6px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color);
        font-size: 1em; font-family: inherit;
      }
      .row2 { display: flex; gap: 10px; }
      .row2 .field { flex: 1; }
      .dialog-actions {
        display: flex; justify-content: flex-end; gap: 8px;
        padding: 12px 20px 18px 20px;
      }
      button.btn {
        border: none; border-radius: 6px; padding: 9px 16px;
        font-size: 0.95em; font-weight: 500; cursor: pointer;
        font-family: inherit;
      }
      button.btn.secondary { background: transparent; color: var(--primary-text-color); }
      button.btn.primary { background: var(--primary-color); color: var(--text-primary-color, #fff); }
      button.btn.danger { background: var(--error-color); color: #fff; }
      .error { padding: 16px; color: var(--error-color); }
    `;

    const card = document.createElement("ha-card");
    card.innerHTML = `
      <div class="header">
        <h1></h1>
        <ha-icon-button class="add-btn" title="Aufgabe hinzufügen">
          <ha-icon icon="mdi:plus-circle"></ha-icon>
        </ha-icon-button>
      </div>
      <div class="list"><div class="empty">Lade Aufgaben…</div></div>
    `;
    card.querySelector("h1").textContent = this._title;
    card.querySelector(".add-btn").addEventListener("click", () => this._openDialog("new"));

    this.shadowRoot.append(style, card);
    this._listEl = card.querySelector(".list");
  }

  _renderError(err) {
    this._listEl.innerHTML = `<div class="error">Fehler beim Laden der Aufgaben: ${esc(err.message || err)}</div>`;
  }

  _renderList() {
    if (!this._tasks.length) {
      this._listEl.innerHTML = `<div class="empty">Noch keine Aufgaben. Tippe auf + zum Hinzufügen.</div>`;
      return;
    }
    this._listEl.innerHTML = "";
    for (const task of this._tasks) {
      const { isOn, label } = computeDue(task);
      const row = document.createElement("div");
      row.className = "row" + (isOn ? " due" : "");
      row.innerHTML = `
        <ha-icon class="task-icon" icon="${esc(task.icon || "mdi:calendar-check")}"></ha-icon>
        <div class="info">
          <div class="title">${esc(task.title)}</div>
          <div class="subtitle">${esc(label)} · alle ${esc(task.interval_value)} ${esc(INTERVAL_LABELS[task.interval_type] || task.interval_type)}</div>
        </div>
        <div class="actions">
          <ha-icon-button class="complete" title="Als erledigt markieren">
            <ha-icon icon="mdi:check-circle-outline"></ha-icon>
          </ha-icon-button>
          <ha-icon-button class="edit" title="Bearbeiten">
            <ha-icon icon="mdi:pencil"></ha-icon>
          </ha-icon-button>
          <ha-icon-button class="delete" title="Löschen">
            <ha-icon icon="mdi:trash-can-outline"></ha-icon>
          </ha-icon-button>
        </div>
      `;
      row.querySelector(".info").addEventListener("click", () => this._openDialog(task.id));
      row.querySelector(".complete").addEventListener("click", (e) => {
        e.stopPropagation();
        this._complete(task);
      });
      row.querySelector(".edit").addEventListener("click", (e) => {
        e.stopPropagation();
        this._openDialog(task.id);
      });
      row.querySelector(".delete").addEventListener("click", (e) => {
        e.stopPropagation();
        this._remove(task);
      });
      this._listEl.appendChild(row);
    }
  }

  async _complete(task) {
    try {
      await WS.complete(this._hass, task.id);
      this._refresh();
    } catch (err) {
      alert("Fehler: " + (err.message || err));
    }
  }

  async _remove(task) {
    if (!confirm(`"${task.title}" wirklich löschen?`)) return;
    try {
      await WS.remove(this._hass, task.id);
      this._refresh();
    } catch (err) {
      alert("Fehler: " + (err.message || err));
    }
  }

  _openDialog(id) {
    this._editingId = id;
    const isNew = id === "new";
    const task = isNew
      ? { title: "", interval_value: 30, interval_type: "days", last_performed: "", tag_id: "", icon: "" }
      : this._tasks.find((t) => t.id === id);
    if (!task) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const lastPerformed = task.last_performed ? String(task.last_performed).slice(0, 10) : "";

    const tagOptions = [`<option value="">Kein Tag</option>`]
      .concat(this._tags.map((t) => `<option value="${esc(t.id)}" ${t.id === task.tag_id ? "selected" : ""}>${esc(t.name || t.id)}</option>`))
      .join("");

    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML = `
      <div class="dialog">
        <h2>${isNew ? "Neue Aufgabe" : "Aufgabe bearbeiten"}</h2>
        <form>
          <div class="field">
            <label>Titel</label>
            <input name="title" type="text" required value="${esc(task.title)}" placeholder="z. B. Dunstabzugsfilter reinigen">
          </div>
          <div class="row2">
            <div class="field">
              <label>Intervall</label>
              <input name="interval_value" type="number" min="1" required value="${esc(task.interval_value)}">
            </div>
            <div class="field">
              <label>Einheit</label>
              <select name="interval_type">
                <option value="days" ${task.interval_type === "days" ? "selected" : ""}>Tage</option>
                <option value="weeks" ${task.interval_type === "weeks" ? "selected" : ""}>Wochen</option>
                <option value="months" ${task.interval_type === "months" ? "selected" : ""}>Monate</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label>Zuletzt erledigt (optional, sonst heute)</label>
            <input name="last_performed" type="date" value="${esc(lastPerformed)}" max="${todayStr}">
          </div>
          <div class="field">
            <label>Icon (optional, z. B. mdi:air-filter)</label>
            <input name="icon" type="text" value="${esc(task.icon || "")}" placeholder="mdi:calendar-check">
          </div>
          <div class="field">
            <label>NFC-Tag (optional)</label>
            <select name="tag_id">${tagOptions}</select>
          </div>
        </form>
        <div class="dialog-actions">
          <button type="button" class="btn secondary" data-act="cancel">Abbrechen</button>
          <button type="button" class="btn primary" data-act="save">Speichern</button>
        </div>
      </div>
    `;

    const close = () => overlay.remove();
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('[data-act="cancel"]').addEventListener("click", close);
    overlay.querySelector('[data-act="save"]').addEventListener("click", async () => {
      const form = overlay.querySelector("form");
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const iconVal = fd.get("icon").trim();
      const tagVal = fd.get("tag_id");
      const payload = {
        title: fd.get("title").trim(),
        interval_value: Number(fd.get("interval_value")),
        interval_type: fd.get("interval_type"),
        last_performed: fd.get("last_performed") || todayStr,
      };
      // The integration's schema expects a string or an omitted key —
      // sending an explicit null fails validation ("expected str... Got None").
      if (iconVal) payload.icon = iconVal;
      if (tagVal) payload.tag_id = tagVal;
      try {
        if (isNew) {
          await WS.add(this._hass, payload);
        } else {
          await WS.update(this._hass, { task_id: task.id, ...payload });
        }
        close();
        this._refresh();
      } catch (err) {
        alert("Fehler beim Speichern: " + (err.message || err));
      }
    });

    this.shadowRoot.appendChild(overlay);
    overlay.querySelector('input[name="title"]').focus();
  }
}

customElements.define("home-maintenance-card", HomeMaintenanceCard);

/**
 * Visual (GUI) editor for the card, shown in the dashboard editor
 * when the card is added/edited without switching to YAML mode.
 */
class HomeMaintenanceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        .field { padding: 12px 0; }
        label {
          display: block; font-size: 0.85em;
          color: var(--secondary-text-color); margin-bottom: 4px;
        }
        input {
          width: 100%; box-sizing: border-box;
          padding: 10px; border-radius: 6px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          font-size: 1em; font-family: inherit;
        }
        .hint {
          font-size: 0.8em; color: var(--secondary-text-color);
          margin-top: 10px;
        }
      </style>
      <div class="field">
        <label>Titel</label>
        <input name="title" type="text" value="${esc(this._config.title || "")}" placeholder="Haus-Wartung">
      </div>
      <div class="hint">
        Die Kartengröße lässt sich im Bereichs-Layout (Sections-Ansicht) über die
        Ziehpunkte am Kartenrand anpassen, sobald die Karte auf dem Dashboard liegt.
      </div>
    `;
    this.shadowRoot.querySelector('input[name="title"]').addEventListener("input", (e) => {
      this._config = { ...this._config, title: e.target.value };
      this._fireChanged();
    });
  }

  _fireChanged() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define("home-maintenance-card-editor", HomeMaintenanceCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "home-maintenance-card",
  name: "Home Maintenance Card",
  description: "Vollständige Aufgabenverwaltung (hinzufügen, bearbeiten, erledigen, löschen) für die Home-Maintenance-Integration.",
});
