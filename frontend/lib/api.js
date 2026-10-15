/**
 * Centralized API layer — all fetch() calls to the FastAPI backend live here.
 * Components never call fetch() directly.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      message = body?.detail || body?.message || message
    } catch {}
    throw new Error(message)
  }

  return res.json()
}

/** POST /schedule — Run the CSP solver and generate a new timetable. */
export async function generateSchedule() {
  return request('/schedule', { method: 'POST' })
}

/** GET /timetable — Retrieve the last generated timetable. */
export async function getTimetable() {
  return request('/timetable')
}

/** GET /rooms/summary — Floor-wise room utilisation breakdown. */
export async function getRoomSummary() {
  return request('/rooms/summary')
}

/** GET /rooms/unused — List of rooms not assigned to any session. */
export async function getUnusedRooms() {
  return request('/rooms/unused')
}

/** GET /subjects — Full subject catalogue with hour requirements. */
export async function getSubjects() {
  return request('/subjects')
}

/** POST /subjects — Add a new subject. */
export async function addSubject(name, theory_hours, lab_hours, batch) {
  return request('/subjects', {
    method: 'POST',
    body: JSON.stringify({ name, theory_hours, lab_hours, batch }),
  })
}

/** DELETE /subjects/{name} — Remove a subject by name. */
export async function deleteSubject(name) {
  return request(`/subjects/${encodeURIComponent(name)}`, { method: 'DELETE' })
}

/** GET /rooms — Every room (name, type CR/CL, floor). */
export async function getRooms() {
  return request('/rooms')
}

/** POST /rooms — Add a room, e.g. "CR901" (theory) or "CL902" (lab). */
export async function addRoom(name) {
  return request('/rooms', { method: 'POST', body: JSON.stringify({ name }) })
}

/** DELETE /rooms/{name} — Remove a room. */
export async function deleteRoom(name) {
  return request(`/rooms/${encodeURIComponent(name)}`, { method: 'DELETE' })
}

/** GET /timings — { days: string[], slots: string[] }. */
export async function getTimings() {
  return request('/timings')
}

/** POST /timings/days — Add a day. */
export async function addDay(name) {
  return request('/timings/days', { method: 'POST', body: JSON.stringify({ name }) })
}

/** DELETE /timings/days/{name} — Remove a day. */
export async function deleteDay(name) {
  return request(`/timings/days/${encodeURIComponent(name)}`, { method: 'DELETE' })
}

/** POST /timings/slots — Add a time slot (appended after the last one). */
export async function addSlot(label) {
  return request('/timings/slots', { method: 'POST', body: JSON.stringify({ label }) })
}

/** DELETE /timings/slots/{label} — Remove a time slot. */
export async function deleteSlot(label) {
  return request(`/timings/slots/${encodeURIComponent(label)}`, { method: 'DELETE' })
}
