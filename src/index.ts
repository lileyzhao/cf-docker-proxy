import { RegistryConfig, RegistryRequest } from './types'
import { handleStatusPage } from './status-page'

const REGISTRIES: Record<string, RegistryConfig> = {
  'docker.io': {
    url: 'https://registry-1.docker.io',
    authService: 'registry.docker.io',
    testImage: 'hello-world',
  },
  'ghcr.io': {
    url: 'https://ghcr.io',
    authService: 'ghcr.io',
    testImage: 'distroless/static',
  },
  'gcr.io': {
    url: 'https://gcr.io',
    authService: 'gcr.io',
    testImage: 'google-containers/pause',
  },
  'quay.io': {
    url: 'https://quay.io',
    authService: 'quay.io',
    testImage: 'prometheus/node-exporter',
  },
}

// 默认使用 Docker Hub
const DEFAULT_REGISTRY = 'docker.io'

function parseRegistryFromRepo(repository: string): RegistryRequest {
  const repositoryParts = repository.split('/')

  // 检测是否包含注册表前缀
  const hasRegistryPrefix =
    repositoryParts.length > 1 && repositoryParts[0] in REGISTRIES
  const registry = hasRegistryPrefix ? repositoryParts[0] : DEFAULT_REGISTRY

  // 获取路径部分（去除注册表前缀）
  const pathParts = hasRegistryPrefix
    ? repositoryParts.slice(1)
    : repositoryParts

  // 处理官方镜像的 library 前缀
  const normalizedPathParts =
    pathParts.length === 1 ? ['library', ...pathParts] : pathParts

  return {
    registry,
    cleanPath: '/' + normalizedPathParts.join('/'),
    isDockerHub: registry === 'docker.io',
  }
}

// 从路径中解析仓库信息
function parseRegistryFromPath(pathname: string): RegistryRequest {
  const pathParts = pathname.split('/')

  // 检测是否包含注册表前缀
  const hasRegistryPrefix = pathParts.length > 2 && pathParts[2] in REGISTRIES
  const registry = hasRegistryPrefix ? pathParts[2] : DEFAULT_REGISTRY

  // 获取路径部分（去除注册表前缀）
  const pathPartsWithoutRegistry = hasRegistryPrefix
    ? pathParts.slice(3)
    : pathParts.slice(2)

  // 处理官方镜像的 library 前缀
  const normalizedPathParts =
    pathPartsWithoutRegistry.length === 3
      ? ['library', ...pathPartsWithoutRegistry]
      : pathPartsWithoutRegistry

  return {
    registry: registry,
    cleanPath: '/v2/' + normalizedPathParts.join('/'),
    isDockerHub: registry === 'docker.io',
  }
}

// Cloudflare Worker 的主要导出对象
export default {
  // 处理所有 HTTP 请求的函数
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url)
    console.log('--------------------------------------------------------')
    console.log(`🚀 HTTP 请求进入:`, url.toString())

    // 根路径：返回代理状态信息
    if (url.pathname === '/') {
      return handleStatusPage(url, env, REGISTRIES, DEFAULT_REGISTRY)
    }

    // Docker Registry API v2 根路径：此时无法分析目标仓库，直接返回401
    if (url.pathname === '/v2/') {
      return createDockerV2UnauthorizedResponse(url, env)
    }

    if (!url.pathname.startsWith('/v2/')) {
      // 返回信息，只支持 Docker Registry API v2
      console.log('🚫 仅支持 Docker Registry API v2，当前请求:', url.pathname)
      return new Response(
        JSON.stringify({
          error: 'Only Docker Registry API v2 is supported',
          path: url.pathname,
          message: '仅支持 Docker Registry API v2',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // 认证端点：处理令牌获取
    if (url.pathname === '/v2/auth') {
      const scope = url.searchParams.get('scope')
      const scopeParts = scope?.split(':')
      if (!scope || !scopeParts || scopeParts.length !== 3) {
        return createDockerV2UnauthorizedResponse(url, env)
      }
      const repositoryInfo = parseRegistryFromRepo(scopeParts[1])
      console.log('📦 解析仓库信息: ', JSON.stringify(repositoryInfo))
      scopeParts[1] = repositoryInfo.cleanPath.split('/').slice(1).join('/') // 更新 scope 路径
      return await handleAuthEndpoint(
        request,
        url,
        repositoryInfo,
        scopeParts.join(':')
      )
    }

    // 解析仓库信息
    const registryRequest = parseRegistryFromPath(url.pathname)
    console.log('📦 解析仓库信息[已授权]:', JSON.stringify(registryRequest))

    // 处理其他 Docker Registry API 请求
    return await handleDockerRequest(request, env, registryRequest)
  },
} satisfies ExportedHandler<Env>

/**
 * 处理 /v2/auth 认证端点，获取访问令牌
 */
async function handleAuthEndpoint(
  request: Request,
  url: URL,
  registryRequest: RegistryRequest,
  scope: string
): Promise<Response> {
  const registryConfig = REGISTRIES[registryRequest.registry]

  // 先向指定仓库发送请求获取认证信息
  const dockerResponse = await fetch(`${registryConfig.url}/v2/`, {
    method: 'GET',
    redirect: 'follow',
  })

  console.log(`🔍 认证请求响应状态: `, dockerResponse.status)

  // 如果不需要认证，直接返回
  if (dockerResponse.status !== 401) {
    return dockerResponse
  }

  // 解析 WWW-Authenticate 头部获取认证服务器信息
  const wwwAuthenticateHeader = dockerResponse.headers.get('WWW-Authenticate')

  console.log(`🔍 WWW-Authenticate 头部: `, wwwAuthenticateHeader)
  if (!wwwAuthenticateHeader) {
    return dockerResponse
  }

  const authenticationInfo = parseAuthenticateHeader(wwwAuthenticateHeader)

  console.log(`🔑 解析认证信息: `, authenticationInfo, scope)
  return await fetchAuthToken(
    authenticationInfo,
    scope,
    request.headers.get('Authorization')
  )
}

/**
 * 处理 Docker Registry API 请求的核心函数
 */
async function handleDockerRequest(
  request: Request,
  env: Env,
  registryRequest: RegistryRequest
): Promise<Response> {
  const url = new URL(request.url)
  const registryConfig = REGISTRIES[registryRequest.registry]

  const pathParts = registryRequest.cleanPath.split('/')

  // 构建目标 URL 并转发请求
  if (pathParts[2] === registryRequest.registry) pathParts.splice(2, 1)
  const targetUrl = new URL(
    pathParts.join('/') + url.search,
    registryConfig.url
  )
  console.log(`🔗 转发请求到: `, targetUrl.toString())
  const proxyRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers: request.headers,
    redirect: registryRequest.isDockerHub ? 'manual' : 'follow',
  })

  const response = await fetch(proxyRequest)

  console.log(`🔄 转发请求响应: `, response.status)
  // 如果需要认证，返回未授权响应
  if (response.status === 401) {
    return createDockerV2UnauthorizedResponse(url, env)
  }

  // 处理仓库的重定向响应
  if (registryRequest.isDockerHub && response.status === 307) {
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
 * 解析 WWW-Authenticate 头部信息
 * 格式示例: Bearer realm="https://auth.docker.io/token",service="registry.docker.io"
 */
function parseAuthenticateHeader(authenticateStr: string): {
  realm: string
  service: string
} {
  // 提取引号内的值
  const realmMatch = authenticateStr.match(/realm="([^"]+)"/)
  const serviceMatch = authenticateStr.match(/service="([^"]+)"/)

  if (!realmMatch || !serviceMatch) {
    throw new Error(`无效的 WWW-Authenticate 头部: ${authenticateStr}`)
  }

  return {
    realm: realmMatch[1],
    service: serviceMatch[1],
  }
}

/**
 * 从认证服务器获取访问令牌
 */
async function fetchAuthToken(
  authInfo: { realm: string; service: string },
  scope: string | null,
  authorization: string | null
): Promise<Response> {
  const tokenUrl = new URL(authInfo.realm)

  // 设置请求参数
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

  console.log(`📡 令牌端点URL: `, tokenUrl.toString())

  // 请求访问令牌
  return await fetch(tokenUrl.toString(), {
    method: 'GET',
    headers: headers,
  })
}

function createDockerV2UnauthorizedResponse(url: URL, env: Env): Response {
  const headers = new Headers()

  if (env.ENVIRONMENT === 'dev') {
    headers.set(
      'WWW-Authenticate',
      `Bearer realm="http://${url.host}/v2/auth",service="cf-docker-proxy"`
    )
  } else {
    headers.set(
      'WWW-Authenticate',
      `Bearer realm="https://${url.hostname}/v2/auth",service="cf-docker-proxy"`
    )
  }

  return new Response(JSON.stringify({ message: 'UNAUTHORIZED' }), {
    status: 401,
    headers: headers,
  })
}
