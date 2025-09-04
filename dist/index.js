import { promises as fs } from "fs"
import path from "path"
import sharp from "sharp"
import { gzipSync } from "zlib"

const defaultOptions = {
  include: /\.html$/,
  formats: ['avif', 'webp'],
  quality: 85,
  outputDir: '/assets/images',
  defaultSizes: '(min-width: %widthpx) %widthpx, 100vw',
  isRetinaSupport: true,
  lazyLoading: true,
  isDebugMode: false,
}

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
}

const imageColors = [
  colors.cyan,
  colors.yellow,
  colors.blue,
  colors.magenta,
  colors.green,
  colors.white,
]

export function imgToPicture(userOptions = {}) {
  const options = { ...defaultOptions, ...userOptions }

  if (options.quality < 1 || options.quality > 100) {
    throw new Error('Quality must be between 1 and 100')
  }

  let config
  const processedImages = []
  const processedPartials = []
  const imageStats = []
  const imageCache = new Map()
  const imageMetadataCache = new Map()
  const memoryBuffers = new Map()
  const imageColorMap = new Map()

  const getColorForImage = (baseName) => {
    if (!imageColorMap.has(baseName)) {
      const colorIndex = imageColorMap.size % imageColors.length
      imageColorMap.set(baseName, imageColors[colorIndex])
    }

    return imageColorMap.get(baseName)
  }

  const extractAttributes = (imgTag) => {
    const attributes = {}
    const attrRegex = /(\w+)=["']([^"']*)["']/g
    let attrMatch

    while ((attrMatch = attrRegex.exec(imgTag)) !== null) {
      const [_, key, value] = attrMatch

      if (!['src', 'alt'].includes(key)) {
        attributes[key] = value
      }
    }

    return attributes
  }

  const getImageMetadata = async (imagePath) => {
    if (imageMetadataCache.has(imagePath)) {
      return imageMetadataCache.get(imagePath)
    }

    const metadata = await sharp(imagePath).metadata()
    const aspectRatio = metadata.height / metadata.width
    const metadataObj = {
      width: metadata.width,
      height: metadata.height,
      aspectRatio,
      isPortrait: metadata.height > metadata.width,
    }

    imageMetadataCache.set(imagePath, metadataObj)
    return metadataObj
  }

  const calculateHeight = (width, aspectRatio) => {
    return Math.round(width * aspectRatio)
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} kB`

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const getGzipSize = (buffer) => {
    try {
      const compressed = gzipSync(buffer)
      return compressed.length
    } catch {
      return 0
    }
  }

  const resolveImagePath = (src, baseDir) => {
    const projectRoot = path.resolve(config.root, '..')

    if (src.startsWith('/')) {
      return path.resolve(projectRoot, 'src', src.slice(1))
    } else {
      return path.resolve(baseDir, src)
    }
  }

  const generateImageVariants = async (imagePath, baseName, ext, metadata) => {
    const variants = []
    const formatTasks = []
    const baseWidth = options.isRetinaSupport
      ? Math.round(metadata.width / 2)
      : metadata.width

    for (const format of [...options.formats, ext]) {
      formatTasks.push(
        (async () => {
          const targetHeight = calculateHeight(baseWidth, metadata.aspectRatio)
          const outputFilename = `${baseName}.${format}`
          const cacheKey = `${imagePath}-${baseWidth}-${format}`

          if (imageCache.has(cacheKey)) {
            return imageCache.get(cacheKey)
          }

          let buffer
          try {
            buffer = await sharp(imagePath)
              .resize({
                width: baseWidth,
                height: targetHeight,
                withoutEnlargement: true,
                fit: 'inside',
              })
              .toFormat(format, {
                quality: options.quality,
              })
              .toBuffer()
          } catch (error) {
            console.warn(`Failed to process ${outputFilename}:`, error.message)
            return null
          }

          const resizedMetadata = await sharp(buffer).metadata()

          const variant = {
            buffer,
            finalPath: `${options.outputDir}/${outputFilename}`,
            targetWidth: baseWidth,
            width: resizedMetadata.width,
            height: resizedMetadata.height,
            format,
            density: '1x',
            aspectRatio: resizedMetadata.height / resizedMetadata.width,
            baseName: baseName,
          }

          imageCache.set(cacheKey, variant)
          memoryBuffers.set(variant.finalPath, buffer)

          if (options.isDebugMode) {
            console.log(
              `Generated ${outputFilename} (${variant.width}x${variant.height})`,
            )
          }

          return variant
        })(),
      )

      if (options.isRetinaSupport) {
        formatTasks.push(
          (async () => {
            const outputFilename = `${baseName}@2x.${format}`
            const cacheKey = `${imagePath}-${metadata.width}-${format}`

            if (imageCache.has(cacheKey)) {
              return imageCache.get(cacheKey)
            }

            let buffer
            try {
              if (format === ext) {
                buffer = await fs.readFile(imagePath)
              } else {
                buffer = await sharp(imagePath)
                  .toFormat(format, {
                    quality: options.quality,
                  })
                  .toBuffer()
              }
            } catch (error) {
              console.warn(
                `Failed to process ${outputFilename}:`,
                error.message,
              )
              return null
            }

            const variant = {
              buffer,
              finalPath: `${options.outputDir}/${outputFilename}`,
              targetWidth: metadata.width,
              width: metadata.width,
              height: metadata.height,
              format,
              density: '2x',
              aspectRatio: metadata.aspectRatio,
              baseName: baseName,
            }

            imageCache.set(cacheKey, variant)
            memoryBuffers.set(variant.finalPath, buffer)

            if (options.isDebugMode) {
              console.log(
                `Using original as 2x: ${outputFilename} (${variant.width}x${variant.height})`,
              )
            }

            return variant
          })(),
        )
      }
    }

    const results = await Promise.allSettled(formatTasks)

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        variants.push(result.value)
      } else if (options.isDebugMode && result.status === 'rejected') {
        console.warn('Failed to generate variant:', result.reason)
      }
    })

    return variants
  }

  const processImagesInContent = async (content, baseDir, fileId) => {
    const imgRegex = /<img[^>]+src="([^">]+\.(jpg|jpeg|png))"[^>]*>/gi
    let modifiedContent = content
    let hasChanges = false

    if (baseDir.includes('partials')) {
      baseDir = baseDir.replace('partials', '')
    }

    const matches = []
    let match
    while ((match = imgRegex.exec(content)) !== null) {
      matches.push(match)
    }

    if (matches.length > 0 && options.isDebugMode) {
      console.log(`Found ${matches.length} images in ${path.basename(fileId)}`)
    }

    for (const match of matches) {
      const [fullMatch, src, originalExt] = match

      if (
        src.startsWith('http') ||
        src.startsWith('data:') ||
        src.startsWith('/')
      ) {
        continue
      }

      try {
        const imagePath = resolveImagePath(src, baseDir)

        try {
          await fs.access(imagePath)
        } catch {
          if (options.isDebugMode) {
            console.warn(`Image file not found: ${imagePath}`)
          }
          continue
        }

        const metadata = await getImageMetadata(imagePath)
        const baseWidth = options.isRetinaSupport
          ? Math.round(metadata.width / 2)
          : metadata.width
        const imageBaseName = path.basename(src, path.extname(src))

        const variants = await generateImageVariants(
          imagePath,
          imageBaseName,
          originalExt,
          metadata,
        )
        processedImages.push(...variants)

        variants.forEach((variant) => {
          const size = variant.buffer.length
          const gzipSize = getGzipSize(variant.buffer)
          imageStats.push({
            path: variant.finalPath,
            size,
            gzipSize,
            format: variant.format,
            density: variant.density,
            baseName: variant.baseName,
          })
        })

        const formatGroups = {}
        variants.forEach((variant) => {
          if (!formatGroups[variant.format]) {
            formatGroups[variant.format] = []
          }
          formatGroups[variant.format].push(variant)
        })

        Object.values(formatGroups).forEach((group) => {
          group.sort((a) => (a.density === '1x' ? -1 : 1))
        })

        const altMatch = fullMatch.match(/alt="([^"]*)"/)
        const alt = altMatch ? altMatch[1] : ''
        const otherAttributes = Object.entries(extractAttributes(fullMatch))
          .map(([key, value]) => `${key}="${value}"`)
          .join(' ')

        const originalFormatVariants = formatGroups[originalExt] || []
        const imgSrcVariant =
          originalFormatVariants.find((v) => v.density === '1x') ||
          originalFormatVariants[0]

        const sourceTags = []
        for (const format of options.formats) {
          if (formatGroups[format]) {
            const variants = formatGroups[format]
            const srcset = variants
              .map((v) => `${v.finalPath} ${v.density}`)
              .join(', ')
            sourceTags.push(
              `  <source type="image/${format}" srcset="${srcset}" sizes="${options.defaultSizes.replaceAll('%width', baseWidth.toString())}">`,
            )
          }
        }

        const originalSrcset = originalFormatVariants
          .map((variant) => `${variant.finalPath} ${variant.density}`)
          .join(', ')

        const pictureHtml = `<picture>
                                    ${sourceTags.join('\n')}
                                      <img src="${imgSrcVariant?.finalPath || src}" 
                                           ${originalSrcset ? `srcset="${originalSrcset}"` : ''}
                                           sizes="${options.defaultSizes.replaceAll('%width', baseWidth.toString())}" 
                                           decoding="async"
                                           loading="${options.lazyLoading ? 'lazy' : 'eager'}" 
                                           width="${baseWidth}" 
                                           height="${baseWidth}" 
                                           alt="${alt}" 
                                           ${otherAttributes}>
                                    </picture>`

        modifiedContent = modifiedContent.replace(fullMatch, pictureHtml)
        hasChanges = true
      } catch (error) {
        if (options.isDebugMode) {
          console.warn(`Skipping image ${src}: ${error.message}`)
        }
      }
    }

    return hasChanges ? modifiedContent : content
  }

  const processPartials = async (content, baseDir) => {
    const loadRegex = /<load\s+src="([^"]+\.html)"\s*\/>/gi
    let modifiedContent = content
    let hasChanges = false

    let match
    while ((match = loadRegex.exec(content)) !== null) {
      const [fullMatch, partialPath] = match

      if (processedPartials.includes(partialPath)) {
        continue
      }

      try {
        const partialFilePath = resolveImagePath(partialPath, baseDir)

        try {
          await fs.access(partialFilePath)
        } catch {
          if (options.isDebugMode) {
            console.warn(`Partial file not found: ${partialFilePath}`)
          }
          continue
        }

        const partialContent = await fs.readFile(partialFilePath, 'utf-8')

        const processedPartial = await processPartials(
          partialContent,
          path.dirname(partialFilePath),
          partialFilePath,
        )
        const finalPartial = await processImagesInContent(
          processedPartial,
          path.dirname(partialFilePath),
          partialFilePath,
        )

        modifiedContent = modifiedContent.replace(fullMatch, finalPartial)
        hasChanges = true
        processedPartials.push(partialPath)

        if (options.isDebugMode) {
          console.log(`Processed partial: ${partialPath}`)
        }
      } catch (error) {
        if (options.isDebugMode) {
          console.warn(
            `Error processing partial ${partialPath}:`,
            error.message,
          )
        }
      }
    }

    return hasChanges ? modifiedContent : content
  }

  return {
    name: 'vite-plugin-html-img-to-picture',

    async configResolved(resolvedConfig) {
      config = resolvedConfig

      if (options.isDebugMode) {
        console.log(
          `${colors.bold}HTML Image Converter ${colors.reset}initialized`,
        )
      }
    },

    async transform(code, id) {
      if (!options.include.test(id)) return null
      if (id.includes('node_modules')) return null

      try {
        const baseDir = path.dirname(id)

        let processedContent = await processPartials(code, baseDir)
        processedContent = await processImagesInContent(
          processedContent,
          baseDir,
          id,
        )

        if (processedContent !== code) {
          return {
            code: processedContent,
            map: null,
          }
        }

        return null
      } catch (error) {
        console.error('Error in vite-html-image-optimizer:', error)
        return null
      }
    },

    async writeBundle() {
      const projectRoot = path.resolve(config.root, '..')
      const distDir = path.resolve(projectRoot, 'dist')

      if (processedImages.length > 0) {
        console.log(
          `Writing ${processedImages.length} optimized images to dist...`,
        )
      }

      for (const image of processedImages) {
        try {
          const destPath = path.join(distDir, image.finalPath)
          await fs.mkdir(path.dirname(destPath), { recursive: true })
          await fs.writeFile(destPath, image.buffer)
        } catch (error) {
          console.warn(
            `Failed to write image ${image.finalPath}:`,
            error.message,
          )
        }
      }
    },

    async closeBundle() {
      if (imageStats.length > 0) {
        console.log('\nOptimized images:')

        const maxPathLength = Math.max(
          ...imageStats.map((stat) => stat.path.length),
        )
        const maxSizeLength = Math.max(
          ...imageStats.map((stat) => formatFileSize(stat.size).length),
        )

        imageStats.sort((a, b) => a.baseName.localeCompare(b.baseName))

        imageStats.forEach((stat) => {
          const sizeFormatted = formatFileSize(stat.size)
          const gzipFormatted = formatFileSize(stat.gzipSize)
          const pathPadding = ' '.repeat(maxPathLength - stat.path.length)
          const sizePadding = ' '.repeat(maxSizeLength - sizeFormatted.length)
          const imageColor = getColorForImage(stat.baseName)

          console.log(
            `${colors.gray}../dist${colors.reset}` +
              `${imageColor}${stat.path}${colors.reset}` +
              `${pathPadding}  ` +
              `${colors.dim}${sizePadding}${colors.bold}${sizeFormatted}${colors.reset}${colors.dim} │ gzip: ${gzipFormatted}${colors.reset}`,
          )
        })
        console.log('')
      }

      imageCache.clear()
      imageMetadataCache.clear()
      memoryBuffers.clear()
      imageColorMap.clear()
    },
  }
}
