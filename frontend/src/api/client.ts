import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach access token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Serialised token refresh — prevents parallel 401s each triggering their own refresh
type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void }
let isRefreshing = false
let failedQueue: QueueEntry[] = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token!)))
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue this request until the ongoing refresh finishes
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    isRefreshing = true
    const refresh = localStorage.getItem('refresh_token')

    if (!refresh) {
      isRefreshing = false
      return Promise.reject(error)
    }

    try {
      const { data } = await axios.post('/api/auth/refresh', { refresh_token: refresh })
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      original.headers.Authorization = `Bearer ${data.access_token}`
      processQueue(null, data.access_token)
      return api(original)
    } catch (refreshErr) {
      processQueue(refreshErr, null)
      localStorage.clear()
      window.location.href = '/login'
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
