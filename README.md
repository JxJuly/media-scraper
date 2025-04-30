# @july_cm/media-scraper | 媒体刮削器

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![codecov](https://codecov.io/gh/JxJuly/scrape-helper/branch/main/graph/badge.svg)](https://codecov.io/gh/JxJuly/scrape-helper)

使用 Emby 或 Jellyfin 构建家庭影院遇到不少刮削相关的问题，本工具旨在对常规刮削工具的刮削能力的补充。

*如果你只是想快捷的刮削磁盘、NAS 中的媒体或者不知道本工具在做什么，那么你无需使用它。*

## Features | 功能

- 可指定单一路径媒体文件刮削

- 可指定多个资源库路径做一键刮削

- 刮削产生的元数据和历史元数据支持多种合并方式

- 插件化设计，可指定或定制刮削源，用于刮削“冷门”资源

## Install | 安装

```
npm i @july_cm/media-scraper
```

## Start | 开始

```typescript
import { Scraper } from "@july_cm/media-scraper";

const scraper = new Scraper({
  mode: 'complete',
  donwloadImage: true,
  plugins: []
});

// 刮削单一资源
await scraper.run("/root/library-a/复仇者联盟.mp4");
// 刮削媒体库
await scraper.match(['/root/libaray-a']);
```

## Plugins | 插件

`Scraper` 对象本身不耦合任何刮削库，需要使用请务必添加至少一个刮削库插件，本仓库会陆续支持一些库的插件，同时也支持外部插件。

以下是内置插件：

### TMDBScraperPlugin | TMDB

```typescript
import { Scraper, TMDBScraperPlugin } from "@july_cm/media-scraper";

const scraper = new Scraper({
  mode: 'complete',
  donwloadImage: true,
  plugins: [
    new TMDBScraperPlugin({
      token: '',
      isAdult: false,
      language: ''
    })
  ]
});
```

TMDB 将资源分为电影和电视剧，如果遇到刮削不到资源的情况，极有可能是媒体的命名有问题将电视剧识别成了电影。

保险起见可以按照以下规范储存媒体资源：

```
// movie: 
**/[MovieName]/[MovieName].mp4
// eg:
**/movie-a/movie-a.mp4

// tv:
**/[SeriesName]/season[SeasonNumber]?/episode[EpisodeNumber].*.mp4
// eg:
**/亮剑/season1/episode1意大利炮.mp4
**/笑傲江湖/episode1.mp4
```

#### config

TMDB 的刮削插件必须要添加 token 令牌，令牌请去[官网](https://www.themoviedb.org/settings/api)申请。

```typescript
interface TMDBScrapePluginConfig {
  /** 刮削的凭证 */
  token: string;
  /** 刮削语言 */
  language?: string;
  /** r18 */
  isAdult?: boolean;
}
```

### JAVDBScrapePlugin | JAVDB

```typescript
import { Scraper, JAVDBScrapePlugin } from "@july_cm/media-scraper";

const scraper = new Scraper({
  mode: 'complete',
  donwloadImage: true,
  plugins: [new JAVDBScrapePlugin()]
});
```