// 支持的仓库配置
export type RegistryConfig = {
  url: string
  authService: string
  testImage: string
}

export type RegistryRequest = {
  registry: string
  cleanPath: string
  isDockerHub: boolean
}