# vite-plugin-html-img-to-picture

[![npm](https://img.shields.io/npm/dt/vite-plugin-html-img-to-picture?style=for-the-badge)](https://www.npmjs.com/package/vite-plugin-html-img-to-picture)
[![GitHub License](https://img.shields.io/github/license/atrocityz/vite-plugin-html-img-to-picture?style=for-the-badge)](https://github.com/atrocityz/vite-plugin-html-img-to-picture/blob/main/LICENSE)
![GitHub last commit](https://img.shields.io/github/last-commit/atrocityz/vite-plugin-html-img-to-picture?style=for-the-badge)
[![Issues](https://img.shields.io/github/issues/atrocityz/vite-plugin-html-img-to-picture?style=for-the-badge)](https://github.com/atrocityz/vite-plugin-html-img-to-picture/issues)

[RU](./README_ru.md)

Converting use of `img` tag to `picture`, with image optimization, including conversion to required formats.

## Installation
```console
npm install --save-dev vite-plugin-html-img-to-picture
```

```js
// vite.config.js
import { defineConfig } from 'vite'
import { imgToPicture } from "vite-plugin-html-img-to-picture"

export default defineConfig({
    plugins: [
        htmlImgConverter()
    ],
})
```

## Usage

> **IMPORTANT:** If `isRetinaSupport: true` (default = true), then you should initially upload all images at 2x size, as the plugin converts 2x image size to 1x to avoid quality loss.

```html
<img src="./images/test.png" alt="test" />
```

will be transformed to:

```html
<!-- WITH Retina display support (isRetinaSupport: true) -->
<!-- Image was originally uploaded at 2x size (300x300) -->
<picture>
    <source
        type="image/avif"
        srcset="/assets/images/test.avif, /assets/images/test@2x.avif 2x"
        sizes="(min-width: 150px) 150px, 100vw"
    />
    <source
        type="image/webp"
        srcset="/assets/images/test.webp, /assets/images/test@2x.webp 2x"
        sizes="(min-width: 150px) 150px, 100vw"
    />
    <img
        src="/assets/images/test.png"
        srcset="/assets/images/test.png, /assets/images/test@2x.png 2x"
        sizes="(min-width: 150px) 150px, 100vw"
        decoding="async"
        loading="lazy"
        width="150"
        height="150"
        alt="test"
    />
</picture>
```

```html
<!-- WITHOUT Retina display support (isRetinaSupport: false)  -->
<picture>
    <source type="image/webp" srcset="/assets/images/test.webp" sizes="(min-width: 150px) 150px, 100vw" />
    <source type="image/avif" srcset="/assets/images/test.avif" sizes="(min-width: 150px) 150px, 100vw" />
    <img
        src="/assets/images/test.png"
        srcset="/assets/images/test.png"
        sizes="(min-width: 150px) 150px, 100vw"
        decoding="async"
        loading="lazy"
        width="150"
        height="150"
        alt="test"
    />
</picture>
```

## Customization

You can change the settings for converting images.
As an example, the configuration might look like this:

```js
htmlImgOptimizer({
    formats: ["webp", "avif"], // Formats for conversion
    quality: 80, // Image quality
    outputDir: "/assets/images", // Path where converted images will be placed in build version
})
```

> **IMPORTANT:** The value for `outputDir` and the path where `vite` saves all images in the build version (in example it is `dist/assets/images`) **must match**.

## How plugin works
The plugin processes all HTML files from the folder `/src/**/*.html` and transforms the use of the `img` tag into a `picture`, while converting your image to the formats and sizes you need.

Rules under which the plugin works out:
- Image used is in `jpg` or `jpeg` or `png` format.
- Image used is not uploaded from third-party resources.
- Image you are using is not imported from the public directory (`/public` or the one that is set in `vite` configuration).

> This plugin works quietly in conjunction with [vite-plugin-html-inject](https://www.npmjs.com/package/vite-plugin-html-inject)

## Debugging

Debugging is disabled by the standard, but if you encounter an image processing problem, you can enable logging.:

```js
htmlImgOptimizer({
  isDebugMode: true, // (default = false)
})
```

## Plugin Options

- **[`formats`](#formats)**
- **[`quality`](#quality)**
- **[`outputDir`](#outputdir)**
- **[`defaultSizes`](#defaultsizes)**
- **[`isRetinaSupport`](#isretinasupport)**
- **[`lazyLoading`](#lazyloading)**
- **[`isDebugMode`](#isdebugmode)**

### `formats`

Type: `Format[]`

Default: `['avif', 'webp']`

Array of image formats to be converted.

### `quality`

Type: `number`

Default: 85

Image quality as a number 1-100.

### `outputDir`

Type: `string`

Default: /assets/images

Path where need to write converted images on build version.

### `defaultSizes`

Type: `string`

Default: (min-width: %widthpx) %widthpx, 100vw

Value for source and img tags attribute "sizes", %width will be replaced with actual size 1x image width.

### `isRetinaSupport`

Type: `boolean`

Default: true

Support retina displays.

### `lazyLoading`

Type: `boolean`

Default: true

Add "loading" attribute with value "lazy" to `img` tag.


### `isDebugMode`

Type: `boolean`

Default: false

Debug mode.