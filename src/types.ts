// 支持的仓库配置
export type RegistryConfig = {
  url: string
  testImage: string
}

export type RegistryRequest = {
  registry: string
  cleanPath: string
  isDockerHub: boolean
}
