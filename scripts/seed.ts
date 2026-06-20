/**
 * 数据库种子脚本
 * 运行: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed.ts
 * 或作为 Next.js API: 暂不提供
 *
 * 包含:
 * 1. 知识库分类 + 60+ 条内容
 * 2. 首页名言 12 条（已升级为 100 条）
 * 3. 好歌推荐
 * 4. 系统文案初始值
 *
 * 焦虑类型解释 从 Excel 读取（100 条），其他分类保持内联数据。
 */

import mysql from 'mysql2/promise'
import * as XLSX from 'xlsx'
import * as path from 'path'

const DB_CONFIG = {
  host: process.env.DATABASE_HOST || '127.0.0.1',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'spiritualrefuge',
}

async function getConnection() {
  return mysql.createConnection(DB_CONFIG)
}

// ============================================
// 知识库分类
// ============================================

const KNOWLEDGE_CATEGORIES = [
  { name: '焦虑类型解释', sort_order: 1 },
  { name: '人设图鉴', sort_order: 2 },
  { name: '社交媒体套路拆解', sort_order: 3 },
  { name: 'CBT / 心理学方法', sort_order: 4 },
  { name: '情绪急救步骤', sort_order: 5 },
  { name: '行动建议库', sort_order: 6 },
  { name: '自我安抚 / 反比较训练', sort_order: 7 },
  { name: '典型案例', sort_order: 8 },
]

// ============================================
// 知识条目（61 条，覆盖 8 个分类）
// ============================================

interface SeedKnowledgeItem {
  categoryIndex: number // 0-based index into KNOWLEDGE_CATEGORIES
  title: string
  body: string
  tags: string[]
  applicable_scene?: string
  source_note?: string
  is_home_recommended?: boolean
}

const KNOWLEDGE_ITEMS: SeedKnowledgeItem[] = [
  // ⚠️ 焦虑类型解释（categoryIndex: 0）已迁移至 Excel：
  //    社交媒体焦虑知识库_焦虑类型解释_新增100条版.xlsx（100 条）
  //    由 loadAnxietyTypeItems() 动态读取，见文件底部。

  // ---------- 人设图鉴（12 条）----------
  {
    categoryIndex: 1,
    title: '精致女生人设',
    body: `## "精致女生"人设

这是社交媒体上最常见的女性人设之一。展示内容包括：精致的妆容、整洁的房间、健康的美食、自律的作息……

**拆解：**
- 只展示精心准备后的状态，不是日常
- 维持这种精致需要大量时间和金钱
- 视频和图片中的"精致"经过剪辑和修饰

**不需要为了迎合别人的标准而改变自己。你的生活节奏由你自己决定。**`,
    tags: ['精致', '女性', '日常'],
    applicable_scene: '识别社交媒体中"精致女生"形象',
  },
  {
    categoryIndex: 1,
    title: '成熟男生人设',
    body: `## "成熟男生"人设

展示内容包括：西装打扮、高品质消费、稳重谈吐、事业有成……

**拆解：**
- 这种展示通常是片段化的
- "成熟"不等于消费能力或外形
- 真正的成熟是情绪管理和责任承担，无法通过几张图片展示`,
    tags: ['成熟', '男性', '消费'],
    applicable_scene: '识别社交媒体中"成熟男生"形象',
  },
  {
    categoryIndex: 1,
    title: '厉害学生/学霸人设',
    body: `## "学霸"人设

展示：超整洁笔记、每日学习打卡、绩点截图、名校录取……

**拆解：**
- 学习是长期的、有时枯燥的过程，社交媒体只展示了结果
- 学霸也有学不进去、拖延、焦虑的时候
- 学习方法和节奏因人而异，盲目模仿反而可能降低效率`,
    tags: ['学霸', '学习', '名校'],
    applicable_scene: '识别社交媒体中"学霸"形象',
  },
  {
    categoryIndex: 1,
    title: '自律达人',
    body: `## "自律达人"人设

展示：每天 5 点起床、健身 1 小时、读书、冥想、健康饮食……

**拆解：**
- 这些展示经过了高度筛选，不包含放弃和失败的时刻
- 真实的自律不是完美的日程表，而是长期的习惯
- 每个人都有懈怠的时候，只是自律博主不会告诉你`,
    tags: ['自律', '时间管理', '习惯'],
    applicable_scene: '识别社交媒体中"自律达人"形象',
  },
  {
    categoryIndex: 1,
    title: '松弛感生活者',
    body: `## "松弛感生活者"人设

展示：慵懒的午后、随性的穿搭、不加修饰的日常……

**拆解：**
- 这种"松弛感"本身可能是精心策划的
- 拍摄的环境、光线、构图都经过了选择
- 真实的松弛不需要被展示和证明`,
    tags: ['松弛感', '生活方式', '自然'],
    applicable_scene: '识别社交媒体中"松弛感"形象',
  },
  {
    categoryIndex: 1,
    title: '完美恋爱人设',
    body: `## "完美恋爱人设"人设

展示：甜蜜的合照、昂贵的礼物、浪漫的约会、动人的文案……

**拆解：**
- 恋爱关系中的冲突、妥协、平淡不会被展示
- 礼物和场景不反映关系的真实质量
- 用别人的恋爱标准来衡量自己的感情状态是不公平的`,
    tags: ['恋爱', '情侣', '浪漫'],
    applicable_scene: '识别社交媒体中"完美恋爱"形象',
  },
  {
    categoryIndex: 1,
    title: '高消费生活方式人设',
    body: `## "高消费生活方式"人设

展示：名牌包、豪车、高级餐厅、奢华旅行……

**拆解：**
- 很多内容是商业合作或租赁拍摄
- 消费水平不等同于幸福感和生活质量
- 社交媒体放大了物质消费的可见度`,
    tags: ['消费', '名牌', '旅行'],
    applicable_scene: '识别社交媒体中"高消费"形象',
  },
  {
    categoryIndex: 1,
    title: '事业成功者人设',
    body: `## "事业成功者"人设

展示：大厂工牌、高薪 offer、创业成功、团队照片……

**拆解：**
- 成功背后的压力、失败、运气成分不被展示
- 多数人的职业道路有起伏，不是一条直线
- 职业成就只是人生众多维度中的一个`,
    tags: ['事业', '成功', '职场'],
    applicable_scene: '识别社交媒体中"事业成功"形象',
  },
  {
    categoryIndex: 1,
    title: '身材/外貌优势人设',
    body: `## "身材/外貌优势"人设

展示：健身成果、穿搭、自拍、身材对比……

**拆解：**
- 光线、角度、姿势、修图的作用远超想象
- 专业健身博主有教练、营养师、大量训练时间
- 健康的美是多样的，不只有一种标准`,
    tags: ['身材', '外貌', '健身'],
    applicable_scene: '识别社交媒体中"身材外貌"形象',
  },
  {
    categoryIndex: 1,
    title: '旅行达人',
    body: `## "旅行达人"人设

展示：世界各地打卡照、精致酒店、当地美食……

**拆解：**
- 旅行的真实体验包含疲倦、语言障碍、舟车劳顿
- 很多内容是赞助合作，不是自费
- 旅行的意义不是打卡数量，而是内心体验`,
    tags: ['旅行', '打卡', '生活方式'],
    applicable_scene: '识别社交媒体中"旅行达人"形象',
  },
  {
    categoryIndex: 1,
    title: '上岸/绩点/成绩优秀人设',
    body: `## "上岸/成绩优秀"人设

展示：录取通知书、成绩单、排名、证书……

**拆解：**
- 每一个成功者背后都有大量未被展示的失败者
- 幸存者偏差使成功看起来比实际更容易
- 你看到的是结果，不是漫长的备考过程`,
    tags: ['上岸', '成绩', '考研', '考公'],
    applicable_scene: '识别社交媒体中"上岸成功"形象',
  },
  {
    categoryIndex: 1,
    title: '高情商社交达人',
    body: `## "高情商社交达人"人设

展示：朋友聚会、社交活动、人脉广泛……

**拆解：**
- 社交达人的照片不代表他们拥有深度的亲密关系
- 很多社交圈是工作需要的表面关系
- 少而精的亲密关系可能比泛泛之交更令人满足`,
    tags: ['社交', '情商', '人脉'],
    applicable_scene: '识别社交媒体中"社交达人"形象',
  },

  // ---------- 社交媒体套路拆解（8 条）----------
  {
    categoryIndex: 2,
    title: '选择性展示的本质',
    body: `## 选择性展示的本质

社交媒体最核心的特征是：**人们只展示他们想让你看到的部分。**

这就像每个人都在拍一部关于自己的"宣传片"，而不是"纪录片"。

**理解这一点：**
- 你在拿别人的"宣传片"和你的"完整生活"进行比较
- 别人也有烦恼、失败、无聊的时刻，只是你不知道
- 这不是欺骗，而是人性的自然倾向——我们都希望展示好的一面`,
    tags: ['选择性展示', '比较', '人设'],
    applicable_scene: '理解社交媒体展示的底层逻辑',
  },
  {
    categoryIndex: 2,
    title: '滤镜与修图文化',
    body: `## 滤镜与修图文化

现在的手机 App 让任何人都能在几秒钟内美化照片。皮肤、五官、身材、光线都可以调整。

**影响：**
- 长期看修过的图片会让人对"正常的外貌"产生认知偏差
- 你有可能在拿自己的"镜子里的脸"和别人的"精修图"比较
- 很多博主公开承认：真人和照片差异很大`,
    tags: ['滤镜', '修图', '外貌'],
    applicable_scene: '看到精修图片时提醒自己这是处理过的',
  },
  {
    categoryIndex: 2,
    title: '叙事包装与故事线',
    body: `## 叙事包装与故事线

社交媒体上的内容不只是图片和文字，它们往往包含一个精心设计的"故事线"。

**常见叙事模式：**
- "从零到一"逆袭故事（省略了中间的反复和挫折）
- "日常 Vlog"（每一个镜头都经过了编排）
- "随手拍"（其实已经拍了 50 张选了 1 张）

**识别这些叙事包装，能帮助你看透内容的本质。**`,
    tags: ['叙事', '故事', '包装'],
    applicable_scene: '识别社交媒体内容的叙事结构',
  },
  {
    categoryIndex: 2,
    title: '算法推荐与情绪喂养',
    body: `## 算法推荐与情绪喂养

社交平台的推荐算法会分析你的行为，持续推送容易引发情绪反应的内容。

**算法的工作方式：**
- 你在一个内容上停留更久 → 算法推送更多同类内容
- 引发强烈情绪（焦虑、愤怒、羡慕）的内容更容易被传播
- 你搜索"焦虑"相关内容 → 算法认为你喜欢这类内容

**意识到这一点，你可以主动打破信息茧房。**`,
    tags: ['算法', '推荐', '情绪'],
    applicable_scene: '理解为什么总是刷到引发焦虑的内容',
  },
  {
    categoryIndex: 2,
    title: '商业合作与软广识别',
    body: `## 商业合作与软广识别

大量社交媒体内容背后是商业利益。

**识别信号：**
- 看起来很自然的推荐，其实是付费广告
- 博主展示的"日常用品"可能是品牌赞助
- 旅行、体验可能由酒店/品牌提供

**当你知道这是一个广告时，它的说服力就会大大降低。**`,
    tags: ['广告', '赞助', '商业'],
    applicable_scene: '识别社交媒体中的软广告和商业合作',
  },
  {
    categoryIndex: 2,
    title: '精心策划的"随手拍"',
    body: `## 精心策划的"随手拍"

很多图片看起来像是不经意间拍下的，但实际上经过了大量的准备。

**常见的策划方法：**
- 环境清理：把杂乱的物品移出镜头
- 光线调整：选择最佳时间和角度
- 多次拍摄：从几十张中选择最好的一张
- 后期处理：裁剪、调色、滤镜

**"随手"只是一种呈现风格，不是拍摄方式。**`,
    tags: ['策划', '拍摄', '摆拍'],
    applicable_scene: '看穿"随手拍"背后的准备工作',
  },
  {
    categoryIndex: 2,
    title: '人设的一致性与表演成本',
    body: `## 人设的一致性与表演成本

维持一个社交媒体人设需要持续的努力。发布越多精致内容，对下一次发布的要求就越高。

**表演成本：**
- 时间成本：策划、拍摄、修图、写文案
- 心理成本：担心内容不受欢迎、人设崩塌
- 经济成本：服装、场景、设备

**与其羡慕别人的人设，不如把精力放在真实的自己身上。**`,
    tags: ['人设', '表演', '成本'],
    applicable_scene: '理解维持人设需要付出的代价',
  },
  {
    categoryIndex: 2,
    title: '幸存者偏差与可见性偏见',
    body: `## 幸存者偏差与可见性偏见

社交媒体上存在严重的"幸存者偏差"：你只能看到"成功的"案例，看不到大量"失败的"案例。

**例子：**
- 100 个考研人中只有 5 个晒了录取通知，但你只看到这 5 个
- 创业失败的人很少发帖，成功的人频繁出现
- 算法把"成功案例"推到你的首页，让你觉得"所有人都在成功"

**记住：你没看到的失败者远多于你看到的成功者。**`,
    tags: ['幸存者偏差', '统计', '认知'],
    applicable_scene: '正确看待社交媒体上的成功案例比例',
  },

  // ---------- CBT / 心理学方法（8 条）----------
  {
    categoryIndex: 3,
    title: '事实与推测区分',
    body: `## 事实与推测区分

这是 CBT 中最基础也最有效的技术之一。

**事实（可以验证的）：**
- 她发了一条朋友圈展示旅行照片
- 她拿到了研究生录取通知

**推测（你自己加上去的）：**
- 她过得一定很开心
- 她的人生一切顺利
- 我比不上她

**焦虑往往来自把推测当成事实。** 在做出结论之前，先问自己：这是我看到的，还是我推断的？`,
    tags: ['CBT', '认知', '事实', '推测'],
    applicable_scene: '任何产生焦虑时进行认知梳理',
  },
  {
    categoryIndex: 3,
    title: '自动化想法识别',
    body: `## 自动化想法识别

"自动化想法"是指在你看到某些内容时自动冒出来的消极念头。

**常见自动化想法：**
- "我又落后了"
- "我永远做不到"
- "为什么我不如别人"

**练习步骤：**
1. 注意你的情绪变化（焦虑、低落）→ 回溯刚才看了什么
2. 捕捉冒出来的那个想法
3. 把它写下来，问自己：这是事实还是我的解读？
4. 用更客观的想法替代它`,
    tags: ['CBT', '自动化想法', '认知'],
    applicable_scene: '刷社交媒体后感到情绪低落时',
  },
  {
    categoryIndex: 3,
    title: '认知重评技术',
    body: `## 认知重评技术

认知重评是重新评估和解释一个情境的方法。

**当看到引发焦虑的内容时，尝试重评：**

| 初始想法 | 重评后的想法 |
|---------|------------|
| 她过得真好，我不如她 | 她展示了想让人看到的部分 |
| 我太差劲了 | 我正在自己的节奏里前进 |
| 所有人都在进步只有我在原地 | 每个人面临不同的处境和挑战 |

**重评不是自我欺骗，而是用一个更完整的视角看问题。**`,
    tags: ['认知重评', 'CBT', '视角'],
    applicable_scene: '用于情绪被触发后进行理性调整',
  },
  {
    categoryIndex: 3,
    title: '去灾难化技术',
    body: `## 去灾难化技术

焦虑常常让人把事情想得比实际上更糟糕。

**去灾难化的步骤：**
1. 识别可怕的想法（"我这辈子完了"）
2. 问自己：最坏的情况是什么？发生的概率有多大？
3. 即使最坏情况发生，我能做什么？
4. 正常情况（更有可能性）会是什么结果？

**绝大多数你担心的"灾难"，既不会发生，也没有你想象中那么可怕。**`,
    tags: ['去灾难化', 'CBT', '焦虑'],
    applicable_scene: '焦虑被放大到失控时',
  },
  {
    categoryIndex: 3,
    title: '行为激活：从小事开始',
    body: `## 行为激活：从小事开始

当焦虑和低落让人提不起劲时，行为激活是一个有效的恢复方法。

**原理：**
- 焦虑让人回避活动 → 回避让生活缩小 → 产生更多焦虑
- 打破循环的方法是从最小的行动开始

**很小的行动也能带来变化：**
1. 整理一下桌面
2. 散十分钟步
3. 给朋友发一条消息
4. 写下今天一个开心的瞬间

**行动产生能量，而不是能量产生行动。**`,
    tags: ['行为激活', '行动', '情绪'],
    applicable_scene: '焦虑让人不想做任何事时',
  },
  {
    categoryIndex: 3,
    title: '感恩练习',
    body: `## 感恩练习

研究显示，有意识地练习感恩可以显著改善情绪和减轻焦虑。

**简单练习：**
- 每晚写下今天 3 件让你感恩的小事
- 可以是非常微小的事：喝到一杯好喝的咖啡、天气很好、收到一条暖心的消息

**感恩不是否认困难，而是注意到那些被焦虑掩盖的、生活中正在正常运行的部分。**`,
    tags: ['感恩', '积极心理学', '情绪'],
    applicable_scene: '每天睡前或早晨进行',
  },
  {
    categoryIndex: 3,
    title: '正念呼吸练习',
    body: `## 正念呼吸练习

正念（Mindfulness）是指有意识地、不加评判地关注当下。

**一个简单的 3 分钟正念呼吸练习：**
1. 第一分钟：闭上眼睛，注意身体的感觉（坐着的重量、脚的触感）
2. 第二分钟：把注意力集中在呼吸上（鼻尖的空气流、胸腹的起伏）
3. 第三分钟：将注意力扩展到整个身体，感受当下的存在感

**如果走神了，不要批评自己，轻轻地把注意力拉回来就行。反复走神反复拉回，这就是练习的本质。**`,
    tags: ['正念', '呼吸', '冥想'],
    applicable_scene: '感到焦虑、烦躁、或思维被社交媒体占据时',
  },
  {
    categoryIndex: 3,
    title: '情绪标签化',
    body: `## 情绪标签化

给自己的情绪贴上准确的标签，本身就能缓解焦虑。

**研究显示，当人们能够准确命名自己的情绪时，大脑杏仁核（负责恐惧反应）的活动水平会下降。**

**练习：**
- 不只是"我很难受"，而是"我感到焦虑"或"我感到失望"
- 进一步细化：是"被比较感压住了"还是"对未来的不确定感"还是"对自己不满"

**越具体越好。命名它，你就开始掌控它。**`,
    tags: ['情绪', '标签', '自我觉察'],
    applicable_scene: '任何情绪波动时都可以练习',
  },

  // ---------- 情绪急救步骤（6 条）----------
  {
    categoryIndex: 4,
    title: 'STOP 技术：立刻暂停',
    body: `## STOP 技术

当你刷到让你特别焦虑的内容时，使用这个简短的技术：

- **S（Stop）**：暂停。放下手机，或至少关掉当前 App
- **T（Take a breath）**：深呼吸一次。慢慢吸气，缓缓呼出
- **O（Observe）**：观察你现在的感受。心跳快了吗？胃不舒服吗？脑子里在想什么？
- **P（Proceed）**：带着觉察继续。你可以选择不再看那条内容，转而做一件让你平静的事

**整个过程只需要一两分钟，但能打断自动化焦虑反应。**`,
    tags: ['STOP', '暂停', '急救'],
    applicable_scene: '刷到触发内容时立刻使用',
  },
  {
    categoryIndex: 4,
    title: '5-4-3-2-1 感官接地法',
    body: `## 5-4-3-2-1 感官接地法

当你感到被焦虑裹挟时，用这个练习把注意力拉回当下：

- **5** — 看到 5 样东西（环顾四周，说出它们的名字）
- **4** — 感受 4 种触感（衣服的质感、椅子的表面、皮肤上的空气流动……）
- **3** — 听到 3 种声音（空调声、远处的车声、自己的呼吸声……）
- **2** — 闻到 2 种气味（房间的味道、窗外吹入的风……）
- **1** — 尝到 1 种味道（喝一口水，感受水的清爽）

**这个技术与焦虑的本质相反：焦虑把你拖到未来，感官让你回到现在。**`,
    tags: ['接地', '感官', '当下'],
    applicable_scene: '焦虑严重到感觉脱离现实时',
  },
  {
    categoryIndex: 4,
    title: '深呼吸减压法',
    body: `## 深呼吸减压法

当焦虑袭来时，身体的生理反应是真实的：心跳加快、呼吸变浅、肌肉紧张。

**4-7-8 呼吸法：**
1. 用鼻子慢慢吸气，数 4 秒
2. 屏住呼吸，数 7 秒
3. 用嘴巴缓缓呼出，数 8 秒
4. 重复 3-4 次

**为什么有效：** 缓慢呼出激活了副交感神经系统，这是身体的"放松开关"。这不是心理暗示，而是生理机制。`,
    tags: ['呼吸', '放松', '生理'],
    applicable_scene: '感到生理上的焦虑反应时',
  },
  {
    categoryIndex: 4,
    title: '手机隔离 15 分钟',
    body: `## 手机隔离 15 分钟

有时候焦虑的源头就是手机本身。把手机放远 15 分钟，让自己获得一段不受打扰的时间。

**在这 15 分钟内，你可以：**
- 站起来走一走
- 看看窗外
- 泡一杯茶
- 什么都不做，就是发呆

**15 分钟不会错过什么重要的事。但你可能会需要不止 15 分钟来恢复平静。如果感觉好多了，不妨再延长一会儿。**`,
    tags: ['手机', '隔离', '休息'],
    applicable_scene: '刷手机刷到停不下来且越来越焦虑时',
  },
  {
    categoryIndex: 4,
    title: '写下你的情绪',
    body: `## 写下你的情绪

拿出纸笔（或者用手机的备忘录），把此刻的感受写下来。

**写作框架：**
1. 我刚才看到了什么？（具体描述那条内容）
2. 那一瞬间我的感觉是什么？（焦虑？嫉妒？自我否定？）
3. 这个感觉让我想到了什么？（对自己哪方面的担心？）
4. 如果是一个关心我的朋友，他会怎么对我说？

**写作帮助你把混乱的情绪捋顺。写完之后，你可能不会觉得问题都解决了，但通常会感觉好受一些。**`,
    tags: ['写作', '情绪', '表达'],
    applicable_scene: '思绪混乱、无法理清自己感受时',
  },
  {
    categoryIndex: 4,
    title: '换个视角看自己',
    body: `## 换个视角看自己

当你在比较自己和他人的差距时，不妨试试从未来的自己或关心你的人的角度来看。

**练习：**
- 想象五年后的你回头看今天，会怎么评价这条让你焦虑的内容？
- 想象你的好朋友知道了你今天的感受，会怎么安慰你？

**很多时候，我们对别人的善意和宽容，远远超过对自己的。给自己同等的善意。**`,
    tags: ['视角', '自我关怀', '未来'],
    applicable_scene: '陷入自我批评和比较中时',
  },

  // ---------- 行动建议库（6 条）----------
  {
    categoryIndex: 5,
    title: '减少社交媒体使用时间',
    body: `## 减少社交媒体使用时间

最直接的减少焦虑的方法就是减少接触引发焦虑的内容。

**具体方法：**
1. 设定每天的使用时间上限（例如每天 30 分钟）
2. 使用手机的"屏幕时间"功能设置限制
3. 把社交 App 放在文件夹深处（增加打开的阻力）
4. 在特定的时段不碰手机（吃饭时、睡前一小时）

**你没有错过什么，但你会获得更多平静。**`,
    tags: ['时间管理', '数字排毒', '习惯'],
    applicable_scene: '想要减少社交媒体对自己的影响时',
  },
  {
    categoryIndex: 5,
    title: '整理你的关注列表',
    body: `## 整理你的关注列表

你的社交媒体体验很大程度上取决于你关注了谁。

**清理建议：**
1. 取关那些持续让你感到焦虑、嫉妒、自卑的账号
2. 保留那些带给你平静、启发、真实感的账号
3. 增加关注那些展示"不完美的真实生活"的内容

**你的注意力是宝贵的，不要浪费在让你难受的内容上。**`,
    tags: ['关注', '清理', '选择'],
    applicable_scene: '觉得社交媒体整体让人焦虑时',
  },
  {
    categoryIndex: 5,
    title: '建立自己的成就记录',
    body: `## 建立自己的成就记录

社交媒体让你关注别人的成就，而忽视了自己的进步。

**建立一个简单的"我的成就档案"：**
- 写下你过去一年取得的所有进步（大的小的都算）
- 包括：学会的技能、克服的困难、坚持的习惯、帮过别人的事
- 定期回顾和更新

**你会发现自己其实一直在前进，只是没有被你自己注意到。**`,
    tags: ['成就', '成长', '自我认知'],
    applicable_scene: '觉得自己一事无成时',
  },
  {
    categoryIndex: 5,
    title: '寻找线下的真实连接',
    body: `## 寻找线下的真实连接

社交媒体提供的是"弱连接"——大量的浅层互动。而"强连接"——少数深入的面对面关系——对心理健康的保护作用更强。

**尝试：**
1. 约一个朋友线下见面聊天
2. 参加一个线下兴趣小组或活动
3. 和家人一起吃顿饭，放下手机

**一次真诚的线下对话，可能比刷 100 条动态更能滋养你。**`,
    tags: ['线下', '社交', '连接'],
    applicable_scene: '感到孤独但不被社交媒体的互动满足时',
  },
  {
    categoryIndex: 5,
    title: '把比较转化为学习',
    body: `## 把比较转化为学习

同样是看到别人的成就，你可以选择两个完全不同的方向：
- **嫉妒模式：** 她好优秀 → 我好差
- **学习模式：** 她做对了什么？哪些可以借鉴？

**练习转换：**
当你发现自己在比较时，主动问自己：
1. 她做了什么行动导致了那个结果？
2. 其中有没有我可以尝试的部分？
3. 我的实际情况和她的有什么不同？

**注意：这种转换是有意识的，需要练习。当你太焦虑时，先做好情绪恢复，再考虑学习。**`,
    tags: ['比较', '学习', '转化'],
    applicable_scene: '看到他人成就时想从负面比较转为正向学习',
  },
  {
    categoryIndex: 5,
    title: '设定自己的目标而非别人的',
    body: `## 设定自己的目标而非别人的

很多焦虑来源于：你在追求别人认为重要的事，而不是你真正想要的事。

**问自己：**
1. 如果没有人在看，我还会做现在正在努力的事吗？
2. 我现在的目标是我自己选择的，还是社会/家庭/朋友暗示我应该追求的？
3. 如果我的目标和别人完全不同，我能接受吗？

**真正的满足感来自做适合自己的事，而不是复制别人的路径。**`,
    tags: ['目标', '价值观', '自我'],
    applicable_scene: '对人生方向感到迷茫时',
  },

  // ---------- 自我安抚/反比较训练（5 条）----------
  {
    categoryIndex: 6,
    title: '反比较：找到你自己的标准',
    body: `## 找到你自己的标准

比较本身不是问题，问题在于你用了不适合自己的标准。

**练习：**
1. 列出 3-5 个对你来说真正重要的人生维度（不是别人告诉你的）
2. 在每个维度上，写下你自己的满意标准
3. 当你看到社交媒体内容时，问自己：这和我自己的标准有关系吗？

**一个让你平静的事实：你不需要在别人的游戏里赢。你可以定义自己的游戏。**`,
    tags: ['标准', '价值观', '比较'],
    applicable_scene: '被社会主流标准压得喘不过气时',
  },
  {
    categoryIndex: 6,
    title: '不完美练习',
    body: `## 不完美练习

社交媒体让我们对"完美"产生了病态的执着。有意识地练习接受不完美，可以减轻这种压力。

**练习方法：**
1. 发一条没有滤镜的自拍（如果是私人账号）
2. 承认自己今天某件事没做好，但没关系
3. 做一件不追求结果只追求过程的事

**完美是焦虑的燃料，不完美是自由的入口。**`,
    tags: ['不完美', '接纳', '自由'],
    applicable_scene: '被完美主义和"精致焦虑"困扰时',
  },
  {
    categoryIndex: 6,
    title: '身体扫描放松法',
    body: `## 身体扫描放松法

当你感觉焦虑存储在身体里（紧绷的肩膀、攥紧的拳头、咬紧的牙），试着做身体扫描。

**方法（5-10 分钟）：**
1. 舒服地坐着或躺着，闭上眼睛
2. 从脚开始，注意脚的感觉，然后慢慢往上
3. 到腿、腹部、胸部、肩膀、手臂、脖子、脸部
4. 每到一处，有意识地放松那个部位的肌肉
5. 最后感受整个身体的放松状态

**这个方法可以帮助你在睡前或任何紧张时刻放松下来。**`,
    tags: ['放松', '身体', '扫描'],
    applicable_scene: '身体紧张、入睡困难时',
  },
  {
    categoryIndex: 6,
    title: '自我对话的三种声音',
    body: `## 自我对话的三种声音

你的内在对话通常有三种声音，学会区分和调整它们：

- **批评者：** "你不够好""你又失败了"→ 这种声音常常夸大和绝对化
- **被批评者：** "我好难受""我没办法"→ 这种声音表达的是真实的情绪
- **关怀者：** "这很难，但你已经尽力了""每个人都会遇到这种事"→ 这个声音需要被刻意培养

**练习：当批评者太大声时，刻意启动关怀者的声音。**`,
    tags: ['自我对话', '内在', '关怀'],
    applicable_scene: '自我批评严重时',
  },
  {
    categoryIndex: 6,
    title: '创建你的"反焦虑工具包"',
    body: `## 创建你的"反焦虑工具包"

为自己准备一个随时可用的工具包，当社交媒体焦虑袭来时可以立即使用。

**你的工具包可以包括：**
- 一段你喜欢的音乐或音频
- 几张让你感到平静的照片
- 几个你信任的朋友的联系方式
- 一句对你有意义的提醒或名言
- 一个简单的呼吸练习
- 一个让你舒服的小物品（石头、手链、照片等）

**当焦虑来袭时，你不需要从零开始想办法，你的工具包已经准备好了。**`,
    tags: ['工具包', '准备', '应对'],
    applicable_scene: '提前准备，用于焦虑发作时',
  },

  // ---------- 典型案例（3 条）----------
  {
    categoryIndex: 7,
    title: '案例：朋友圈里的保研通知',
    body: `## 案例分析：朋友圈里的保研通知

**场景描述（虚构/示例）：**
小林刷朋友圈时，看到高中同学发了一条动态，配图是某 985 大学的研究生录取通知书，文案写着"几年的努力终于有了回报"。

**小林的即时反应：**
心跳加快，胸口发闷，脑子里冒出："她都能保研了，我还在原地……"

**分析：**
- **事实：** 同学被某大学录取为研究生
- **推测：** "她的人生一片光明", "我远远不如她", "我以后怎么办"
- **隐藏信息：** 你不知道她的 GPA 有多高、她经历过多少次被拒、她未来的压力有多大。你只知道一个结果。
- **比较陷阱：** 你在拿她的一个"高光点"和你的"全部现状"对比

**调整后的想法：**
"她取得了她的阶段性成果，我也在自己的道路上。每个人的节奏不同。"`,
    tags: ['案例', '朋友圈', '保研', '比较'],
    applicable_scene: '典型的朋友圈比较焦虑场景',
    is_home_recommended: true,
  },
  {
    categoryIndex: 7,
    title: '案例：小红书上的精致房间',
    body: `## 案例分析：小红书上的精致房间

**场景描述（虚构/示例）：**
小陈刷小红书时，看到一位博主展示了自己的出租屋改造。房间干净整洁，柔和的灯光、整齐的书架、漂亮的床单，标题写着"一个人也要好好生活"。

**小陈的即时反应：**
下意识看了看自己略显凌乱的房间，感到一阵沮丧和愧疚。

**分析：**
- **事实：** 博主发布了几张精心布置的房间照片
- **推测：** "她的生活真的很精致", "我太邋遢了", "我不配好好生活"
- **隐藏信息：** 这个博主可能花了几个小时整理和布置，拍照后又花了很久修图。房间在平时可能也不是这个样子。
- **比较陷阱：** 把自己的日常起居状态和一个精心策划的展示画面比较

**调整后的想法：**
"她的房间布置得很漂亮，但这只代表一个拍摄瞬间。我的生活不需要和别人的布景比较。"`,
    tags: ['案例', '小红书', '精致', '房间'],
    applicable_scene: '看到精致生活内容产生对自己的不满',
  },
  {
    categoryIndex: 7,
    title: '案例：朋友圈的旅行照',
    body: `## 案例分析：朋友圈的旅行照

**场景描述（虚构/示例）：**
小张在加班时刷到同事的马尔代夫旅行照。碧海蓝天、沙滩长裙，评论区全是"好羡慕""人生赢家"。

**小张的即时反应：**
看着自己面前的加班盒饭，感到一阵深深的落差和苦涩。

**分析：**
- **事实：** 同事正在海边度假，拍了几张照片
- **推测：** "她的生活好精彩", "我的生活好无聊", "我永远也没机会这样享受"
- **隐藏信息：** 旅行只是同事生活中 1% 的时间。她也有加班、烦恼、平淡的日子。而且她可能为了这次旅行花了几个月的积蓄。
- **比较陷阱：** 把别人 1% 的高光时刻和自己的 99% 普通时刻比较

**调整后的想法：**
"她有一个美好的假期，这很好。我的生活不只是这一个加班夜。以后我也能安排自己的旅行。"`,
    tags: ['案例', '旅行', '朋友圈', '比较'],
    applicable_scene: '看到他人旅行时产生落差感',
    is_home_recommended: true,
  },
]

// ============================================
// 首页名言（12 条）
// ============================================

const HOME_QUOTES = [
  { text: '慢慢来也是一种前进。', author: '系统推荐' },
  { text: '你不必和任何人比较，你是你自己的路。', author: '系统推荐' },
  { text: '焦虑不是软弱，是你在乎的证明。', author: '系统推荐' },
  { text: '今天能好好呼吸，就已经很棒了。', author: '系统推荐' },
  { text: '你看到的只是别人选择展示的片段。', author: '系统推荐' },
  { text: '呼吸。你现在是安全的。', author: '系统推荐' },
  { text: '即使走得慢，你也在往前走。', author: '系统推荐' },
  { text: '社交媒体不是真实的世界。', author: '系统推荐' },
  { text: '你的价值不由点赞数定义。', author: '系统推荐' },
  { text: '此刻，你拥有你需要的一切。', author: '系统推荐' },
  { text: '照顾好今天的自己，明天会更好。', author: '系统推荐' },
  { text: '你不是一个人在经历这些。', author: '系统推荐' },
]

// ============================================
// 好歌推荐（5 首）
// ============================================

const HOME_SONGS = [
  {
    title: '起风了',
    artist: '买辣椒也用券',
    reason: '温柔的旋律带你远离喧嚣',
    suitable_mood: '焦虑时',
  },
  {
    title: '平凡的一天',
    artist: '毛不易',
    reason: '赞美日常的小确幸',
    suitable_mood: '感到生活平淡时',
  },
  {
    title: 'New Boy',
    artist: '房东的猫 / 陈婧霏',
    reason: '轻快的节奏，让你看到明天的希望',
    suitable_mood: '需要一点希望时',
  },
  {
    title: '路过人间',
    artist: '郁可唯',
    reason: '让你感受到人与人之间的温暖',
    suitable_mood: '感到孤独时',
  },
  {
    title: 'You Are My Sunshine',
    artist: 'Jimmie Davis',
    reason: '简单温暖，像阳光一样照进心里',
    suitable_mood: '需要被温暖包围时',
  },
]

// ============================================
// 系统文案初始值
// ============================================

const ADMIN_CONTENTS = [
  {
    content_type: 'disclaimer',
    title: '免责声明',
    body: `# 免责声明

**重要提示：本产品不能替代专业医疗、心理咨询、心理治疗或医学诊断。**

精神避难所是一个社交媒体焦虑分析工具，旨在帮助用户认识和理解社交媒体引发的焦虑情绪，提供心理学知识和方法参考。

**核心声明：**
1. 本产品不替代专业医疗
2. 本产品不替代心理咨询
3. 本产品不替代心理治疗
4. 本产品不提供医学诊断
5. 严重风险时请寻求专业帮助

如果您正在经历强烈的痛苦或危险想法，请立即联系医院、专业医生、心理咨询师或当地紧急求助渠道。`,
  },
  {
    content_type: 'product_intro',
    title: '产品说明',
    body: `# 精神避难所 — 产品说明

精神避难所是一个面向社交媒体焦虑的网站工具。

**核心功能：**
- 上传社交媒体截图，获得 AI 结构化分析
- 识别截图中的人设包装、隐藏信息和比较陷阱
- 结合心理学方法（CBT、正念等）提供情绪解释
- 百宝箱知识库帮助建立长期抵抗比较焦虑的能力

**使用方式：**
1. 注册账号并登录
2. 上传朋友圈、小红书等平台的截图
3. 可选填写你的感受和焦虑强度
4. AI 为你生成结构化分析结果
5. 阅读分析、提交反馈、查看历史记录

**适合人群：**
所有在使用社交媒体过程中产生焦虑、困惑、不安、比较、自我否定等负面情绪，并希望获得解释、拆解和帮助的人。`,
  },
  {
    content_type: 'tutorial',
    title: '新手教程',
    body: `# 新手教程

**欢迎来到精神避难所！**

这是一个帮助你从社交媒体焦虑中抽离出来的工具。

**快速上手：**
1. **首页** — 浏览温暖的名言和推荐，搜索你需要的内容
2. **中间相机按钮** — 点击上传社交媒体截图，开始分析
3. **百宝箱** — 浏览知识库，了解焦虑类型、人设套路和应对方法
4. **我的** — 查看历史记录、个人笔记、修改账号设置

**提示：**
- 分析完成后记得提交反馈，帮助我们改进
- 可以在历史详情页添加备注和标签，记录你的思考
- 使用个人笔记记录你的成长和反思`,
  },
  {
    content_type: 'greeting',
    title: '首页问候',
    body: '今天想聊聊哪条截图？',
  },
  {
    content_type: 'coming_soon',
    title: 'Coming Soon',
    body: '这个功能还在准备中，第一版暂不开放。我们会在后续版本中逐步推出更多功能，感谢你的耐心和支持。',
  },
]

// ============================================
// 从 Excel 加载焦虑类型解释（100 条）
// ============================================

interface ExcelRow {
  title: string
  body: string
  tags: string
  applicable_scene: string
  source_note: string
  is_home_recommended: string
}

function loadAnxietyTypeItems(): SeedKnowledgeItem[] {
  try {
    const excelPath = path.resolve(
      __dirname,
      '../社交媒体焦虑知识库_焦虑类型解释_新增100条版.xlsx',
    )
    const wb = XLSX.readFile(excelPath)
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })

    const items: SeedKnowledgeItem[] = []
    // Excel rows 3-102 are the 100 items (0-indexed: 3-102)
    for (let i = 3; i <= 102; i++) {
      const r = raw[i]
      if (!r || !r[0]) continue

      const tagNames = String(r[3] ?? '')
        .split(/[,，]/)
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0)

      items.push({
        categoryIndex: 0, // 焦虑类型解释
        title: String(r[0] ?? '').trim(),
        body: String(r[2] ?? '').trim(),
        tags: tagNames,
        applicable_scene: String(r[4] ?? '').trim() || undefined,
        source_note: String(r[5] ?? '').trim() || undefined,
        is_home_recommended: String(r[6] ?? '否').trim() === '是',
      })
    }
    // eslint-disable-next-line no-console
    console.log(`📥 从 Excel 加载焦虑类型解释 ${items.length} 条`)
    return items
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('⚠️  无法加载焦虑类型 Excel，跳过：', (err as Error).message)
    return []
  }
}

// ============================================
// 执行种子脚本
// ============================================

async function main() {
  // eslint-disable-next-line no-console
  console.log('🚀 开始填充种子数据...\n')

  const conn = await getConnection()

  // 加载 Excel 条目
  const anxietyItems = loadAnxietyTypeItems()
  const allItems = [...anxietyItems, ...KNOWLEDGE_ITEMS]

  try {
    // 1. 知识库分类
    // eslint-disable-next-line no-console
    console.log('📁 插入知识库分类...')
    const categoryIds: number[] = []
    for (const cat of KNOWLEDGE_CATEGORIES) {
      const [result] = await conn.execute(
        'INSERT INTO knowledge_categories (name, sort_order) VALUES (?, ?)',
        [cat.name, cat.sort_order],
      ) as any[]
      categoryIds.push(result.insertId)
    }
    // eslint-disable-next-line no-console
    console.log(`   ✅ ${categoryIds.length} 个分类创建完成`)

    // 2. 知识条目 + 标签
    // eslint-disable-next-line no-console
    console.log('📝 插入知识条目...')
    for (const item of allItems) {
      const categoryId = categoryIds[item.categoryIndex]
      const [result] = await conn.execute(
        `INSERT INTO knowledge_items
          (category_id, title, body, applicable_scene, source_note, is_home_recommended)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          categoryId,
          item.title,
          item.body,
          item.applicable_scene || null,
          item.source_note || null,
          item.is_home_recommended ? 1 : 0,
        ],
      ) as any[]
      const itemId = result.insertId

      // 插入标签
      for (const tagName of item.tags) {
        // 确保标签存在
        await conn.execute(
          'INSERT IGNORE INTO knowledge_tags (tag_name) VALUES (?)',
          [tagName],
        )
        // 获取标签 ID
        const [tagRows] = await conn.execute(
          'SELECT id FROM knowledge_tags WHERE tag_name = ?',
          [tagName],
        ) as any[]
        if (tagRows.length > 0) {
          await conn.execute(
            'INSERT IGNORE INTO knowledge_item_tags (knowledge_item_id, knowledge_tag_id) VALUES (?, ?)',
            [itemId, tagRows[0].id],
          )
        }
      }
    }
    // eslint-disable-next-line no-console
    console.log(`   ✅ ${allItems.length} 条知识内容创建完成（含 Excel ${anxietyItems.length} 条）`)

    // 3. 首页名言
    // eslint-disable-next-line no-console
    console.log('💬 插入首页名言...')
    for (const quote of HOME_QUOTES) {
      await conn.execute(
        'INSERT INTO home_quotes (text, author) VALUES (?, ?)',
        [quote.text, quote.author],
      )
    }
    // eslint-disable-next-line no-console
    console.log(`   ✅ ${HOME_QUOTES.length} 条名言创建完成`)

    // 4. 好歌推荐
    // eslint-disable-next-line no-console
    console.log('🎵 插入好歌推荐...')
    for (const song of HOME_SONGS) {
      await conn.execute(
        'INSERT INTO home_songs (title, artist, reason, suitable_mood) VALUES (?, ?, ?, ?)',
        [song.title, song.artist, song.reason, song.suitable_mood],
      )
    }
    // eslint-disable-next-line no-console
    console.log(`   ✅ ${HOME_SONGS.length} 首好歌创建完成`)

    // 5. 系统文案
    // eslint-disable-next-line no-console
    console.log('📋 插入系统文案...')
    for (const content of ADMIN_CONTENTS) {
      await conn.execute(
        'INSERT INTO admin_contents (content_type, title, body) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), body = VALUES(body)',
        [content.content_type, content.title, content.body],
      )
    }
    // eslint-disable-next-line no-console
    console.log(`   ✅ ${ADMIN_CONTENTS.length} 条系统文案创建完成`)

    // eslint-disable-next-line no-console
    console.log('\n✨ 种子数据填充完成！')
    // eslint-disable-next-line no-console
    console.log('📌 提示：管理员账号需要在注册后手动通过 SQL 添加到 admin_users 表')
    // eslint-disable-next-line no-console
    console.log('   INSERT INTO admin_users (user_id, role) VALUES (<user_id>, "super_admin");')
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('❌ 种子数据填充失败：', err)
    process.exit(1)
  } finally {
    await conn.end()
  }
}

main()
