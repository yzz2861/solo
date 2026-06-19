import mockAPI from './mockAPI.js'

function getAPI() {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI
  }
  return mockAPI
}

const api = new Proxy({}, {
  get(target, prop) {
    const realAPI = getAPI()
    if (!(prop in realAPI)) {
      return undefined
    }
    const fn = realAPI[prop]
    if (typeof fn === 'function') {
      return function(...args) {
        return fn.apply(realAPI, args)
      }
    }
    return fn
  },
  has(target, prop) {
    return prop in getAPI()
  },
  ownKeys(target) {
    return Object.keys(getAPI())
  }
})

export default api
