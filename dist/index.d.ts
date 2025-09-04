import { Plugin } from 'vite'

type Format = 'avif' | 'webp'

interface Options {
  /**
   * File extensions that need to be checked
   * @default /\.html$/
   */
  include?: RegExp
  /**
   * Array of image formats to be converted
   * @default ['avif','webp']
   */
  formats?: Format[]
  /**
   * Image quality as a number 1-100
   * @default 85
   */
  quality?: number
  /**
   * Path where need to write converted images on build version
   * @default /assets/images
   */
  outputDir?: string
  /**
   * Value for source and img tags attribute "sizes",
   * %width will be replaced with actual width of image
   * @default (min-width: %widthpx) %widthpx, 100vw)
   */
  defaultSizes?: string
  /**
   * Support retina displays
   * @default true
   */
  isRetinaSupport?: boolean
  /**
   * Add loading="lazy" attribute to img tag
   * @default true
   */
  lazyLoading?: boolean
  /**
   * Debug mode
   * @default false
   */
  isDebugMode?: boolean
}

declare function imgToPicture(optionsParam?: Options): Plugin

export { imgToPicture }
