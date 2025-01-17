import { clientsClaim } from 'workbox-core'
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute, setDefaultHandler } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

clientsClaim()

console.log('yay')

setDefaultHandler(new StaleWhileRevalidate())

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(/https:\/\/api\.musedash\.moe/, new NetworkFirst())

registerRoute(
  /\/covers\/.*\.hash\..*\.png$/,
  new CacheFirst({
    cacheName: 'hashCovers',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500
      })
    ]
  })
)

registerRoute(
  /\.hash\./,
  new CacheFirst({
    cacheName: 'hash',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50
      })
    ]
  })
)

registerRoute(
  /\/covers\/.*\.png$/,
  new CacheFirst({
    cacheName: 'covers',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 400,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      })
    ]
  })
)
