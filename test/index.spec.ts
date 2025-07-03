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
    const responseText = await response.text()
    const responseData = JSON.parse(responseText)

    // Remove timestamp for comparison
    delete responseData.timestamp

    expect(responseData).toMatchInlineSnapshot(`
      {
        "defaultRegistry": "docker.io",
        "registries": {
          "docker.io": {
            "testImage": "hello-world",
            "url": "https://registry-1.docker.io",
          },
          "gcr.io": {
            "testImage": "google-containers/pause",
            "url": "https://gcr.io",
          },
          "ghcr.io": {
            "testImage": "distroless/static",
            "url": "https://ghcr.io",
          },
          "k8s.io": {
            "testImage": "distroless/static",
            "url": "https://registry.k8s.io",
          },
          "quay.io": {
            "testImage": "prometheus/node-exporter",
            "url": "https://quay.io",
          },
        },
        "version": "0.0.1",
      }
    `)
  })

  it('responds with Hello World! (integration style)', async () => {
    const response = await SELF.fetch('https://example.com')
    const responseText = await response.text()
    const responseData = JSON.parse(responseText)

    // Remove timestamp for comparison
    delete responseData.timestamp

    expect(responseData).toMatchInlineSnapshot(`
      {
        "defaultRegistry": "docker.io",
        "registries": {
          "docker.io": {
            "testImage": "hello-world",
            "url": "https://registry-1.docker.io",
          },
          "gcr.io": {
            "testImage": "google-containers/pause",
            "url": "https://gcr.io",
          },
          "ghcr.io": {
            "testImage": "distroless/static",
            "url": "https://ghcr.io",
          },
          "k8s.io": {
            "testImage": "distroless/static",
            "url": "https://registry.k8s.io",
          },
          "quay.io": {
            "testImage": "prometheus/node-exporter",
            "url": "https://quay.io",
          },
        },
        "version": "0.0.1",
      }
    `)
  })
})
