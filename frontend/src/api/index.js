import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({ baseURL: '/api' })

// Attach token to every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        if (!refresh) throw new Error('No refresh token')
        const { data } = await axios.post('/api/auth/refresh', { refresh_token: refresh })
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    const msg = err.response?.data?.detail || 'Something went wrong'
    if (typeof msg === 'string') toast.error(msg)
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login:    (data) => api.post('/auth/login', data).then(r => r.data),
  register: (data) => api.post('/auth/register', data).then(r => r.data),
  refresh:  (token) => api.post('/auth/refresh', { refresh_token: token }).then(r => r.data),
  me:       () => api.get('/auth/me').then(r => r.data),
}

// ── Reports ───────────────────────────────────────────────────
export const reportsApi = {
  upload:        (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/reports/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  myReports:     (status) => api.get('/reports/my', { params: status ? { status } : {} }).then(r => r.data),
  allReports:    (params) => api.get('/reports/all', { params }).then(r => r.data),
  getReport:     (id) => api.get(`/reports/${id}`).then(r => r.data),
  review:        (id, data) => api.post(`/reports/${id}/review`, data).then(r => r.data),
  patientStats:  () => api.get('/reports/stats/patient').then(r => r.data),
  doctorStats:   () => api.get('/reports/stats/doctor').then(r => r.data),
}

// ── Messages ──────────────────────────────────────────────────
export const messagesApi = {
  send:      (data) => api.post('/messages/send', data).then(r => r.data),
  inbox:     () => api.get('/messages/inbox').then(r => r.data),
  thread:    (userId) => api.get(`/messages/thread/${userId}`).then(r => r.data),
  markRead:  (id) => api.post(`/messages/${id}/read`).then(r => r.data),
  doctors:   () => api.get('/messages/doctors').then(r => r.data),
}

// ── Users ─────────────────────────────────────────────────────
export const usersApi = {
  me:       () => api.get('/users/me').then(r => r.data),
  update:   (data) => api.patch('/users/me', data).then(r => r.data),
  patients: () => api.get('/users/patients').then(r => r.data),
  get:      (id) => api.get(`/users/${id}`).then(r => r.data),
}

export default api
