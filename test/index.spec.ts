import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
  SELF,
} from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
import worker from '../src/index'

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>

describe('Hello World worker', () => {
  it('responds with Hello World! (unit style)', async () => {
    const request = new IncomingRequest('http://example.com')
    // Create an empty context to pass to `worker.fetch()`.
    const ctx = createExecutionContext()
    const response = await worker.fetch(request, env, ctx)
    // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
    await waitOnExecutionContext(ctx)
    expect(await response.text()).toMatchInlineSnapshot(`
      "{
        "registries": {
          "docker.io": {
            "url": "https://registry-1.docker.io",
            "testImage": "hello-world"
          },
          "ghcr.io": {
            "url": "https://ghcr.io",
            "testImage": "distroless/static"
          },
          "gcr.io": {
            "url": "https://gcr.io",
            "testImage": "google-containers/pause"
          },
          "quay.io": {
            "url": "https://quay.io",
            "testImage": "prometheus/node-exporter"
          }
        },
        "defaultRegistry": "docker.io",
        "timestamp": "2025-07-03T06:06:10.823Z",
        "version": "1.0.0"
      }"
    `)
  })

  it('responds with Hello World! (integration style)', async () => {
    const response = await SELF.fetch('https://example.com')
    expect(await response.text()).toMatchInlineSnapshot(`
      "{
        "registries": {
          "docker.io": {
            "url": "https://registry-1.docker.io",
            "testImage": "hello-world"
          },
          "ghcr.io": {
            "url": "https://ghcr.io",
            "testImage": "distroless/static"
          },
          "gcr.io": {
            "url": "https://gcr.io",
            "testImage": "google-containers/pause"
          },
          "quay.io": {
            "url": "https://quay.io",
            "testImage": "prometheus/node-exporter"
          }
        },
        "defaultRegistry": "docker.io",
        "timestamp": "2025-07-03T06:06:10.832Z",
        "version": "1.0.0"
      }"
    `)
  })
})
