import { RegistryConfig, RegistryRequest } from './types'
import { handleStatusPage } from './status-page'
import packageInfo from '../package.json'

// ===== Constants =====
const DEFAULT_REGISTRY = 'docker.io'
const DOCKER_V2_PREFIX = '/v2/'
const DOCKER_AUTH_ENDPOINT = '/v2/auth'
const LIBRARY_PREFIX = 'library'
const SERVICE_NAME = 'cf-docker-proxy'
const API_VERSION = packageInfo.version

// ===== Registry Configuration =====
const REGISTRIES: Record<string, RegistryConfig> = {
  'docker.io': {
    url: 'https://registry-1.docker.io',
    testImage: 'hello-world',
  },
  'ghcr.io': {
    url: 'https://ghcr.io',
    testImage: 'distroless/static',
  },
  'gcr.io': {
    url: 'https://gcr.io',
    testImage: 'google-containers/pause',
  },
  'k8s.io': {
    url: 'https://registry.k8s.io',
    testImage: 'distroless/static',
  },
  'quay.io': {
    url: 'https://quay.io',
    testImage: 'prometheus/node-exporter',
  },
}

// ===== User Agent Detection Patterns =====
const BROWSER_PATTERNS = [
  'mozilla',
  'chrome',
  'safari',
  'firefox',
  'edge',
  'opera',
]

// ===== Registry Parsing Utilities =====

/**
 * Normalizes URL by adding https:// prefix if missing
 * @param url - URL string that may be missing protocol
 * @returns Normalized URL with https:// prefix
 */
function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`
  }
  return url
}

/**
 * Parses registry proxy environment variable into array of URLs
 * @param envValue - Environment variable value (string or undefined)
 * @returns Array of normalized URLs
 * @description Supports single URL or comma-separated URLs
 */
function parseRegistryProxy(envValue: string | undefined): string[] {
  if (!envValue) {
    return []
  }

  // Check for comma-separated values
  if (envValue.includes(',')) {
    return envValue
      .split(',')
      .map((url) => url.trim())
      .filter((url) => url.length > 0)
      .map(normalizeUrl)
  }

  // Single URL
  const trimmedUrl = envValue.trim()
  return trimmedUrl.length > 0 ? [normalizeUrl(trimmedUrl)] : []
}

/**
 * Simple hash function to generate consistent index
 * @param str - String to hash
 * @returns Hash value
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Gets all available URLs for a registry
 * @param registry - Registry name
 * @param env - Environment variables
 * @returns Array of URLs including official and proxy URLs
 */
function getRegistryUrls(registry: string, env: Env): string[] {
  const officialUrl = REGISTRIES[registry].url
  let proxyUrls: string[] = []

  // Get proxy URLs based on registry
  switch (registry) {
    case 'docker.io':
      proxyUrls = parseRegistryProxy(env.DOCKER_IO_PROXY)
      break
    case 'ghcr.io':
      proxyUrls = parseRegistryProxy(env.GHCR_IO_PROXY)
      break
    case 'gcr.io':
      proxyUrls = parseRegistryProxy(env.GCR_IO_PROXY)
      break
    case 'k8s.io':
      proxyUrls = parseRegistryProxy(env.K8S_IO_PROXY)
      break
    case 'quay.io':
      proxyUrls = parseRegistryProxy(env.QUAY_IO_PROXY)
      break
    default:
      // For other registries, no proxy support yet
      break
  }

  return [officialUrl, ...proxyUrls]
}

/**
 * Selects a registry URL from the configuration with consistency
 * @param config - Registry configuration
 * @param imageName - Optional image name for consistent selection
 * @param registry - Registry name for special handling
 * @param env - Environment variables for dynamic configuration
 * @returns A single URL string
 * @description Uses hash-based selection for same image names, defaults to first URL otherwise
 */
function selectRegistryUrl(
  config: RegistryConfig,
  imageName?: string,
  registry?: string,
  env?: Env
): string {
  let urls: string[]

  // Get URLs with environment variable support for all registries
  if (registry && env) {
    urls = getRegistryUrls(registry, env)
  } else {
    urls = [config.url]
  }

  if (urls.length > 0) {
    let selectedUrl: string

    if (imageName && urls.length > 1) {
      // Use consistent hash-based selection for same image
      const hash = simpleHash(imageName)
      const index = hash % urls.length
      selectedUrl = urls[index]
    } else {
      // Default to first URL if no image name provided or only one URL
      selectedUrl = urls[0]
    }

    console.log(`🎯 Selected URL for ${registry || 'registry'}: ${selectedUrl}`)

    return selectedUrl
  }

  throw new Error('Registry configuration must have at least one URL')
}

/**
 * Parses registry information from a repository string
 * @param repository - Repository string (e.g., 'ghcr.io/owner/repo' or 'nginx')
 * @returns Parsed registry request information
 */
function parseRegistryFromRepo(repository: string): RegistryRequest {
  const parts = repository.split('/')
  const { registry, pathParts } = extractRegistryAndPath(parts, 0)
  const normalizedParts = addLibraryPrefixIfNeeded(pathParts)

  // Extract image name (without version/tag)
  const imageName = normalizedParts.join('/')

  return {
    registry,
    cleanPath: '/' + normalizedParts.join('/'),
    isDockerHub: registry === DEFAULT_REGISTRY,
    imageName,
  }
}

/**
 * Parses registry information from a URL path
 * @param pathname - URL pathname (e.g., '/v2/ghcr.io/owner/repo/manifests/latest')
 * @returns Parsed registry request information
 */
function parseRegistryFromPath(pathname: string): RegistryRequest {
  const parts = pathname.split('/')
  const { registry, pathParts } = extractRegistryAndPath(parts, 2)
  const normalizedParts = addLibraryPrefixIfNeeded(pathParts, 2)

  // Extract image name from path
  // Path format: /v2/{imageName}/manifests/{tag} or /v2/{imageName}/blobs/{digest}
  let imageName = normalizedParts.slice(0, 2).join('/')

  return {
    registry,
    cleanPath: DOCKER_V2_PREFIX + normalizedParts.join('/'),
    isDockerHub: registry === DEFAULT_REGISTRY,
    imageName,
  }
}

/**
 * Extracts registry and path parts from split string array
 * @param parts - Array of path parts
 * @param startIndex - Starting index to check for registry
 * @returns Object containing registry and remaining path parts
 */
function extractRegistryAndPath(
  parts: string[],
  startIndex: number
): {
  registry: string
  pathParts: string[]
} {
  const registryCandidate = parts[startIndex]
  const hasRegistryPrefix = registryCandidate && registryCandidate in REGISTRIES

  return {
    registry: hasRegistryPrefix ? registryCandidate : DEFAULT_REGISTRY,
    pathParts: hasRegistryPrefix
      ? parts.slice(startIndex + 1)
      : parts.slice(startIndex),
  }
}

/**
 * Adds 'library' prefix for official Docker images when needed
 * @param pathParts - Array of path parts
 * @returns Normalized path parts with library prefix if needed
 */
function addLibraryPrefixIfNeeded(
  pathParts: string[],
  startIndex: number = 0
): string[] {
  return pathParts.length === startIndex + 1
    ? [LIBRARY_PREFIX, ...pathParts]
    : pathParts
}

// ===== Main Worker Handler =====

/**
 * Cloudflare Worker main export handler
 */
export default {
  /**
   * Handles all HTTP requests to the worker
   * @param request - The incoming request
   * @param env - Environment variables
   * @param _ctx - Execution context (unused)
   * @returns Promise resolving to the response
   */
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url)
    console.log('--------------------------------------------------------')
    console.log(`🚀 HTTP request received: ${url.toString()}`)

    // Root path: return different content based on request type
    if (url.pathname === '/') {
      return handleRootPath(request, url, env)
    }

    // Docker Registry API v2 root path: cannot analyze target registry, return 401
    if (url.pathname === DOCKER_V2_PREFIX) {
      return createDockerV2UnauthorizedResponse(url, env)
    }

    if (!url.pathname.startsWith(DOCKER_V2_PREFIX)) {
      // Return error: only Docker Registry API v2 is supported
      console.log(
        `🚫 Only Docker Registry API v2 supported, current path: ${url.pathname}`
      )
      return createErrorResponse(
        'Only Docker Registry API v2 is supported',
        url.pathname,
        'Only Docker Registry API v2 is supported',
        400
      )
    }

    // Authentication endpoint: handle token acquisition
    if (url.pathname === DOCKER_AUTH_ENDPOINT) {
      const scope = url.searchParams.get('scope')
      const scopeParts = scope?.split(':')
      if (!scope || !scopeParts || scopeParts.length !== 3) {
        return createDockerV2UnauthorizedResponse(url, env)
      }
      const repositoryInfo = parseRegistryFromRepo(scopeParts[1])
      console.log(
        `📦 Parsed repository info: ${JSON.stringify(repositoryInfo)}`
      )
      scopeParts[1] = repositoryInfo.cleanPath.split('/').slice(1).join('/') // Update scope path
      return await handleAuthEndpoint(
        request,
        url,
        repositoryInfo,
        scopeParts.join(':'),
        env
      )
    }

    // Parse registry information
    const registryRequest = parseRegistryFromPath(url.pathname)
    console.log(
      `📦 Parsed registry request [authorized]: ${JSON.stringify(
        registryRequest
      )}`
    )

    // Handle other Docker Registry API requests
    return await handleDockerRequest(request, env, registryRequest)
  },
} satisfies ExportedHandler<Env>

// ===== Authentication Handlers =====

/**
 * Handles the /v2/auth endpoint for token authentication
 * @param request - The incoming request
 * @param url - Request URL
 * @param registryRequest - Parsed registry information
 * @param scope - Authentication scope
 * @returns Promise resolving to the authentication response
 */
async function handleAuthEndpoint(
  request: Request,
  url: URL,
  registryRequest: RegistryRequest,
  scope: string,
  env: Env
): Promise<Response> {
  const registryConfig = REGISTRIES[registryRequest.registry]

  // First send request to specified registry to get authentication info
  const registryUrl = selectRegistryUrl(
    registryConfig,
    registryRequest.imageName,
    registryRequest.registry,
    env
  )
  const dockerResponse = await fetch(`${registryUrl}/v2/`, {
    method: 'GET',
    redirect: 'follow',
  })

  // If no authentication required, return directly
  if (dockerResponse.status !== 401) {
    return dockerResponse
  }

  // Parse WWW-Authenticate header to get authentication server info
  const wwwAuthenticateHeader = dockerResponse.headers.get('WWW-Authenticate')

  console.log(`🔍 WWW-Authenticate header: ${wwwAuthenticateHeader}`)
  if (!wwwAuthenticateHeader) {
    return dockerResponse
  }

  const authenticationInfo = parseAuthenticateHeader(wwwAuthenticateHeader)

  console.log(
    `🔑 Parsed auth info: ${JSON.stringify(
      authenticationInfo
    )}, scope: ${scope}`
  )
  return await fetchAuthToken(
    authenticationInfo,
    scope,
    request.headers.get('Authorization')
  )
}

// ===== Docker API Handlers =====

/**
 * Handles Docker Registry API requests by proxying to the appropriate registry
 * @param request - The incoming request
 * @param env - Environment variables
 * @param registryRequest - Parsed registry information
 * @returns Promise resolving to the proxied response
 */
async function handleDockerRequest(
  request: Request,
  env: Env,
  registryRequest: RegistryRequest
): Promise<Response> {
  const url = new URL(request.url)
  const registryConfig = REGISTRIES[registryRequest.registry]

  const pathParts = registryRequest.cleanPath.split('/')

  // Remove duplicate registry name from path if present
  const REGISTRY_INDEX = 2 // Index where registry name might appear in path
  if (pathParts[REGISTRY_INDEX] === registryRequest.registry) {
    pathParts.splice(REGISTRY_INDEX, 1)
  }

  // Build target URL and forward request
  const registryUrl = selectRegistryUrl(
    registryConfig,
    registryRequest.imageName,
    registryRequest.registry,
    env
  )
  const targetUrl = new URL(pathParts.join('/') + url.search, registryUrl)
  console.log(`🔗 Forwarding request to: ${targetUrl.toString()}`)
  const proxyRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers: request.headers,
    redirect: registryRequest.isDockerHub ? 'manual' : 'follow',
  })

  const response = await fetch(proxyRequest)

  console.log(`🔄 Forward request response status: ${response.status}`)
  // Handle authentication required responses
  const UNAUTHORIZED_STATUS = 401
  if (response.status === UNAUTHORIZED_STATUS) {
    return createDockerV2UnauthorizedResponse(url, env)
  }

  // Handle Docker Hub redirect responses
  const REDIRECT_STATUS = 307
  if (registryRequest.isDockerHub && response.status === REDIRECT_STATUS) {
    const location = response.headers.get('Location')
    if (location) {
      const redirectResponse = await fetch(location, {
        method: 'GET',
        redirect: 'follow',
      })
      return redirectResponse
    }
  }

  return response
}

/**
 * Parses WWW-Authenticate header information
 * @param authenticateStr - The WWW-Authenticate header value
 * @returns Parsed authentication information
 * @example
 * Input: 'Bearer realm="https://auth.docker.io/token",service="registry.docker.io"'
 * Output: { realm: 'https://auth.docker.io/token', service: 'registry.docker.io' }
 */
function parseAuthenticateHeader(authenticateStr: string): {
  realm: string
  service: string
} {
  // Extract values within quotes
  const realmMatch = authenticateStr.match(/realm="([^"]+)"/)
  const serviceMatch = authenticateStr.match(/service="([^"]+)"/)

  if (!realmMatch || !serviceMatch) {
    throw new Error(`Invalid WWW-Authenticate header: ${authenticateStr}`)
  }

  return {
    realm: realmMatch[1],
    service: serviceMatch[1],
  }
}

/**
 * Fetches authentication token from the registry's auth server
 * @param authInfo - Authentication server information
 * @param scope - Authentication scope
 * @param authorization - Authorization header from original request
 * @returns Promise resolving to the token response
 */
async function fetchAuthToken(
  authInfo: { realm: string; service: string },
  scope: string | null,
  authorization: string | null
): Promise<Response> {
  const tokenUrl = new URL(authInfo.realm)

  // Set request parameters
  if (authInfo.service) {
    tokenUrl.searchParams.set('service', authInfo.service)
  }

  if (scope) {
    tokenUrl.searchParams.set('scope', scope)
  }

  const headers = new Headers()
  if (authorization) {
    headers.set('Authorization', authorization)
  }

  console.log(`📡 Token endpoint URL: ${tokenUrl.toString()}`)

  // Request access token
  return await fetch(tokenUrl.toString(), {
    method: 'GET',
    headers: headers,
  })
}

// ===== Response Helpers =====

/**
 * Creates a standardized error response
 * @param error - Error message
 * @param path - Request path
 * @param message - Localized message
 * @param status - HTTP status code
 * @returns Error response
 */
function createErrorResponse(
  error: string,
  path: string,
  message: string,
  status: number
): Response {
  return new Response(JSON.stringify({ error, path, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Creates a Docker v2 unauthorized response with proper WWW-Authenticate header
 * @param url - Request URL for building the realm
 * @param env - Environment variables
 * @returns 401 Unauthorized response
 */
function createDockerV2UnauthorizedResponse(url: URL, env: Env): Response {
  const protocol = env.ENVIRONMENT === 'dev' ? 'http' : 'https'
  const host = env.ENVIRONMENT === 'dev' ? url.host : url.hostname
  const realm = `${protocol}://${host}${DOCKER_AUTH_ENDPOINT}`

  const headers = new Headers({
    'WWW-Authenticate': `Bearer realm="${realm}",service="${SERVICE_NAME}"`,
    'Content-Type': 'application/json',
  })

  return new Response(JSON.stringify({ message: 'UNAUTHORIZED' }), {
    status: 401,
    headers,
  })
}

// ===== Root Path Handler =====

/**
 * Handles root path requests, distinguishing between browser and API requests
 * @param request - The incoming request
 * @param url - Request URL
 * @param env - Environment variables
 * @returns Response appropriate for the request type
 */
function handleRootPath(request: Request, url: URL, env: Env): Response {
  const userAgent = request.headers.get('User-Agent') || ''
  const accept = request.headers.get('Accept') || ''

  const isBrowserRequest = detectBrowserRequest(userAgent, accept)

  console.log(
    `🔍 Request type detection: ${JSON.stringify({
      userAgent: userAgent.substring(0, 100),
      accept,
      isBrowserRequest,
    })}`
  )

  // Browser requests return status page
  if (isBrowserRequest) {
    return handleStatusPage(url, env, REGISTRIES, DEFAULT_REGISTRY)
  }

  // Non-browser requests (API requests) return JSON formatted registry mapping
  return new Response(
    JSON.stringify(
      {
        registries: REGISTRIES,
        defaultRegistry: DEFAULT_REGISTRY,
        timestamp: new Date().toISOString(),
        version: API_VERSION,
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    }
  )
}

// ===== Request Detection Utilities =====

/**
 * Detects if the request is from a browser
 * @param userAgent - User-Agent header value
 * @param accept - Accept header value
 * @returns true if request is from a browser
 */
function detectBrowserRequest(userAgent: string, accept: string): boolean {
  const lowerUserAgent = userAgent.toLowerCase()

  return (
    // Check for common browser patterns in User-Agent
    BROWSER_PATTERNS.some((pattern) => lowerUserAgent.includes(pattern)) ||
    // Check if client explicitly accepts HTML
    accept.includes('text/html')
  )
}
