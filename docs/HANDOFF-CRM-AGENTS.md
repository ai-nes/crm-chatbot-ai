# Fpilot UI handoff

Canonical cross-repository handoff:

`../ai/crm-agents/docs/handoff-fpilot-crm.md`

Sibling repositories:

- Agent backend: `../ai/crm-agents` (`../ai/crm-agents/.git`)
- Frappe CRM: `../frappe-crm` (`../frappe-crm/.git`)

These paths are relative to the common workspace layout and intentionally contain no machine-specific absolute path.

UI entry point: `http://localhost:3000/chatbot`.

Keep the API/event contract synchronized with the canonical handoff before changing proxy routes, streaming, sessions, or HITL behavior.
