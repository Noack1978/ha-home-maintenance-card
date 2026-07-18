# 🧰 Home Maintenance Card

Eine eigenständige Lovelace-Karte für die [Home Maintenance](https://github.com/TJPoorman/home_maintenance)-Integration von TJPoorman. Sie bringt die volle Aufgabenverwaltung (hinzufügen, bearbeiten, erledigen, löschen) direkt auf dein Dashboard – ohne den Umweg über das separate Seitenleisten-Panel.

Diese Karte ist ein **eigenständiges Companion-Projekt** und kein offizieller Bestandteil der `home_maintenance`-Integration. Sie kommuniziert über deren WebSocket-API (`home_maintenance/get_tasks`, `add_task`, `update_task`, `remove_task`, `complete_task`).

---

## ✨ Funktionen

- 📋 Liste aller Wartungsaufgaben, sortiert nach Fälligkeit
- 🔴 Icon wird bei fälligen/überfälligen Aufgaben farblich hervorgehoben
- ➕ Neue Aufgabe direkt in der Karte anlegen
- ✏️ Aufgabe bearbeiten (Titel, Intervall, letztes Erledigungsdatum, Icon, NFC-Tag)
- ✅ Aufgabe mit einem Klick als erledigt markieren
- 🗑️ Aufgabe löschen (mit Bestätigungsabfrage)
- Kein externes Framework, keine CDN-Abhängigkeit – reine Web-Component, passt sich automatisch an dein Light-/Dark-Theme an

---

## ⚠️ Voraussetzung

Diese Karte benötigt eine installierte und eingerichtete Instanz der [Home Maintenance Integration](https://github.com/TJPoorman/home_maintenance) (TJPoorman). Ohne diese Integration liefert die Karte keine Daten.

---

## 🛠️ Installation

**Über HACS (empfohlen):**

1. HACS → Menü (⋮) → Benutzerdefinierte Repositories
2. Repository-URL dieses Repos eintragen, Kategorie **Frontend**
3. „Home Maintenance Card" installieren
4. Home Assistant neu laden (die Lovelace-Ressource wird von HACS automatisch registriert)
5. Karte zum Dashboard hinzufügen: `type: custom:home-maintenance-card`

---

## ⚙️ Konfiguration

| Option | Typ | Standard | Beschreibung |
|---|---|---|---|
| `title` | string | `Haus-Wartung` | Überschrift der Karte |

```yaml
type: custom:home-maintenance-card
title: Haus-Wartung
```

Kein `entity` nötig – die Karte lädt alle Aufgaben direkt über die WebSocket-API der Integration.

---

## 📄 Lizenz

MIT

---

<br>

## 🇬🇧 Home Maintenance Card (English)

A standalone Lovelace card for the [Home Maintenance](https://github.com/TJPoorman/home_maintenance) integration by TJPoorman. It brings full task management (add, edit, complete, delete) straight to your dashboard, without needing the separate sidebar panel.

This card is an **independent companion project** and not an official part of the `home_maintenance` integration. It talks to its WebSocket API (`home_maintenance/get_tasks`, `add_task`, `update_task`, `remove_task`, `complete_task`).

### Features

- Task list sorted by due date, with color-coded icons for due/overdue tasks
- Add, edit, complete, and delete tasks directly from the card
- No external framework or CDN dependency; adapts to your light/dark theme

### Requirement

Requires the [Home Maintenance integration](https://github.com/TJPoorman/home_maintenance) to be installed and configured. The card has no data of its own.

### Installation (HACS)

1. HACS → menu (⋮) → Custom repositories
2. Add this repository's URL, category **Frontend**
3. Install "Home Maintenance Card"
4. Reload Home Assistant
5. Add the card: `type: custom:home-maintenance-card`

### Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | string | `Haus-Wartung` | Card heading |

### License

MIT
