import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData, getPostBlocks } from '@/lib/db/getSiteData'
import { generateRobotsTxt } from '@/lib/robots.txt'
import { generateRss } from '@/lib/rss'
import { generateSitemapXml } from '@/lib/sitemap.xml'
import { DynamicLayout } from '@/themes/theme'
import { generateRedirectJson } from '@/lib/redirect'
import { checkDataFromAlgolia } from '@/lib/plugins/algolia'
import Link from 'next/link'

/**
 * 首页布局
 * @param {*} props
 * @returns
 */
const Index = props => {
  return (
    <DynamicLayout theme={siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)} layoutName='LayoutIndex' {...props}>
      <div className="w-full flex flex-col md:flex-row gap-6">
        
        <aside className="sidebar w-full md:w-64 p-4 hidden md:block rounded-xl">
          <h2 className="text-lg text-white mb-3">分类 Categories</h2>
          <ul>
            {props.categories?.map(c => (
              <li key={c.name} className="mb-2">
                <Link href={`/category/${c.name}`}>
                  <span className="category-item cursor-pointer">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" className="w-14 h-14 logo-glow rounded-xl" />
              <h1 className="title-glow">Chisenin Space</h1>
            </div>
            <div className="search-container hidden md:block">
              <input type="text" placeholder="Search..." />
            </div>
          </div>

          <div className="card-grid">
            {[
              { title: 'Blog', description: '所有文章与更新', link: '/archive' },
              { title: 'Projects', description: '我的项目', link: '/projects' },
              { title: 'Tools', description: '工具 / 资源', link: '/tools' },
              { title: 'About', description: '关于我', link: '/about' }
            ].map(item => (
              <Link href={item.link} key={item.title}>
                <div className="card cursor-pointer">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DynamicLayout>
  )
}

/**
 * SSG 获取数据
 * @returns
 */
export async function getStaticProps(req) {
  const { locale } = req
  const from = 'index'
  const props = await getGlobalData({ from, locale })
  const POST_PREVIEW_LINES = siteConfig(
    'POST_PREVIEW_LINES',
    12,
    props?.NOTION_CONFIG
  )
  props.posts = props.allPages?.filter(
    page => page.type === 'Post' && page.status === 'Published'
  )

  // 处理分页
  if (siteConfig('POST_LIST_STYLE') === 'scroll') {
    // 滚动列表默认给前端返回所有数据
  } else if (siteConfig('POST_LIST_STYLE') === 'page') {
    props.posts = props.posts?.slice(
      0,
      siteConfig('POSTS_PER_PAGE', 12, props?.NOTION_CONFIG)
    )
  }

  // 预览文章内容
  if (siteConfig('POST_LIST_PREVIEW', false, props?.NOTION_CONFIG)) {
    for (const i in props.posts) {
      const post = props.posts[i]
      if (post.password && post.password !== '') {
        continue
      }
      post.blockMap = await getPostBlocks(post.id, 'slug', POST_PREVIEW_LINES)
    }
  }

  // 生成robotTxt
  generateRobotsTxt(props)
  // 生成Feed订阅
  generateRss(props)
  // 生成
  generateSitemapXml(props)
  // 检查数据是否需要从algolia删除
  checkDataFromAlgolia(props)
  if (siteConfig('UUID_REDIRECT', false, props?.NOTION_CONFIG)) {
    // 生成重定向 JSON
    generateRedirectJson(props)
  }

  // 生成全文索引 - 仅在 yarn build 时执行 && process.env.npm_lifecycle_event === 'build'

  delete props.allPages

  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
          'NEXT_REVALIDATE_SECOND',
          BLOG.NEXT_REVALIDATE_SECOND,
          props.NOTION_CONFIG
        )
  }
}

export default Index
