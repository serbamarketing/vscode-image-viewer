export interface IImage {
  path: string
  fullPath: string
  vscodePath: string
  size: number
  mtimeMs?: number
  fileName: string
  fileType: string
  dirPath: string
  tags?: string[]
}
