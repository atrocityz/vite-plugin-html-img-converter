# vite-plugin-html-img-to-picture

[![npm](https://img.shields.io/npm/dt/vite-plugin-html-img-to-picture?style=for-the-badge)](https://www.npmjs.com/package/vite-plugin-html-img-to-picture)
[![GitHub License](https://img.shields.io/github/license/atrocityz/vite-plugin-html-img-to-picture?style=for-the-badge)](https://github.com/atrocityz/vite-plugin-html-img-to-picture/blob/main/LICENSE)
![GitHub last commit](https://img.shields.io/github/last-commit/atrocityz/vite-plugin-html-img-to-picture?style=for-the-badge)
[![Issues](https://img.shields.io/github/issues/atrocityz/vite-plugin-html-img-to-picture?style=for-the-badge)](https://github.com/atrocityz/vite-plugin-html-img-to-picture/issues)

[EN](./README.md)

Преобразование использования `img` тега в `picture`, с оптимизацией изображения, включая конвертацию в нужные форматы. 

## Установка
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

## Использование

> **ВАЖНО:** Если `isRetinaSupport: true` (по стандарту = true), то следует изначально загружать все изображения в 2x размере, так как плагин преобразует 2x размер изображения в 1x, чтобы не потерять качество.

```html
<img src="./images/test.png" alt="test" />
```

будет преобразовано в:

```html
<!-- С ВКЛЮЧЕННОЙ поддержкой retina дисплеев (isRetinaSupport)  -->
<!-- Изображение изначально загружено в 2x размере (300x300) -->
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
<!-- С ВЫКЛЮЧЕННОЙ поддержкой retina дисплеев (isRetinaSupport)  -->
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

## Кастомизация

Можно изменять настройки для конвертации изображений.
Как пример, конфигурация может выглядеть так:

```js
htmlImgOptimizer({
    formats: ["webp", "avif"], // Форматы для конвертации
    quality: 80, // Качество изображения
    outputDir: "/assets/images", // Путь куда будут помещены конвертированные изображения в build версии
})
```

> **ВАЖНО:** Значение для `outputDir` и путь, куда `vite` сохраняет все изображения в build версии (в примере это `dist/assets/images`) **должны совпадать**.

## Как работает
Плагин обрабатывает все HTML файлы из папки `/src/**/*.html` и преобразует использование `img` тега в `picture`, при этом конвертирует ваше изображение в нужные вам форматы и размеры.

Правила, при которых плагин отрабатывает:
- Используемое изображение формата `jpg` или `jpeg` или `png`.
- Используемое изображение не подгружается из сторонних ресурсов.
- Используемое изображение не подключается из публичной директории (`/public` или та, что установлена в конфигурации `vite`).

> Плагин спокойно работает в связке с плагином [vite-plugin-html-inject](https://www.npmjs.com/package/vite-plugin-html-inject)

## Отладка

По стандарту отладка отключена, но, если Вы столкнулись с проблемой обработки изображений, можно включить логирование:

```js
htmlImgOptimizer({
  isDebugMode: true, // (по стандарту = false)
})
```

## Настройки плагина

- **[`formats`](#formats)**
- **[`quality`](#quality)**
- **[`outputDir`](#outputdir)**
- **[`defaultSizes`](#defaultsizes)**
- **[`isRetinaSupport`](#isretinasupport)**
- **[`lazyLoading`](#lazyloading)**
- **[`isDebugMode`](#isdebugmode)**

### `formats`

Тип: `Format[]`

По умолчанию: `['avif', 'webp']`

Массив с форматами изображений в которые нужно конвертировать.

### `quality`

Тип: `number`

По умолчанию: 85

Качество изображения от 1 до 100.

### `outputDir`

Тип: `string`

По умолчанию: /assets/images

Путь куда будут помещены конвертированные изображения в build версии.

### `defaultSizes`

Тип: `string`

По умолчанию: (min-width: %widthpx) %widthpx, 100vw

Значение атрибута "sizes" для `source` и `img` тегов, %width будет заменен на актуальную ширину изображения в 1x размере.

### `isRetinaSupport`

Тип: `boolean`

По умолчанию: true

Поддержка retina дисплеев.

### `lazyLoading`

Тип: `boolean`

По умолчанию: true

Добавлять атрибут "loading" со значением "lazy" для `img` тега.


### `isDebugMode`

Тип: `boolean`

По умолчанию: false

Режим отладки.

## License

[MIT](./LICENSE)