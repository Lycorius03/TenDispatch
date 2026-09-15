---
name: OpenTenBase 数据调度中心 · TenDispatch
description: 深蓝色二维数据物流中心，以可见调度行为讲解 OpenTenBase。
colors:
  ink: "#07111F"
  panel: "#0B1728"
  cyan: "#32C7F4"
  orange: "#FF9F43"
  gold: "#FFD166"
  critical: "#FF625C"
  text: "#DCEBF7"
  muted: "#ADC5D9"
typography:
  headline:
    fontFamily: "Noto Sans SC, Microsoft YaHei, sans-serif"
    fontSize: "32px"
    fontWeight: 700
  title:
    fontFamily: "Noto Sans SC, Source Han Sans SC, Microsoft YaHei, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Noto Sans SC, Source Han Sans SC, Microsoft YaHei, sans-serif"
    fontSize: "16px"
    lineHeight: 1.65
  label:
    fontFamily: "Noto Sans SC, Microsoft YaHei, sans-serif"
    fontSize: "14px"
  auxiliary-display:
    fontFamily: "Barlow Condensed, Microsoft YaHei, sans-serif"
    fontWeight: 600
rounded:
  square: "0px"
  intake: "4px"
  coordinator: "6px"
  npc: "18px 18px 3px 18px"
spacing:
  compact: "8px"
  control: "20px"
  section: "24px"
  desk: "40px"
  canvas-margin: "80px"
components:
  confirm-dispatch:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    width: "180px"
    height: "56px"
  strategy-option:
    backgroundColor: "#10243A"
    textColor: "#D6E6F4"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    width: "220px"
    height: "56px"
  npc-bubble:
    backgroundColor: "#11283F"
    textColor: "{colors.text}"
    rounded: "{rounded.npc}"
    width: "440px"
    height: "180px"
---

# Design System: OpenTenBase 数据调度中心 · TenDispatch

## Overview

**Creative North Star: "二维数据物流中心"**

深蓝色操作台围绕一个连续的二维物流场景展开。OpenTenBase 是首要标题，TenDispatch 是从属产品名；CN、三个 DN 与 GTM 是可观察的教学机制。控制区辅助场景，玩家通过数据搬运和节点负载理解决策。

本文从当前源代码与用户指定的桌面方向提取。浏览器验证被管理员策略检查阻止；构建和逻辑测试不能替代截图、字体渲染或交互视觉验收。

**Key Characteristics:**

- 中央二维 SVG 场景，固定节点与运输轨道。
- 深蓝分层，青色写入、橙色查询、金色复制。
- 中文优先，状态同时提供文字、数值与颜色。
- 社团联络员通过右下角通讯气泡辅助教学。

## Colors

### Primary

- **数据青色**（`cyan`）：写入运输、可执行主按钮、已完成阶段、正常节点。

### Secondary

- **查询橙色**（`orange`）：查询请求和高负载预警。

### Tertiary

- **副本金色**（`gold`）：公共副本、复制过程和负载关注状态。
- **临界红色**（`critical`）：临界节点与警示灯。

### Neutral

- **底幕深蓝**（`ink`）：主操作台背景。
- **仓库深蓝**（`panel`）：节点与入口底板。
- **正文浅色**（`text`）与**说明蓝灰**（`muted`）：主要信息与辅助标签。

**The State Evidence Rule.** 每种运输颜色必须有图例；负载状态必须同时显示百分比，不能依赖颜色或动画单独传意。

## Typography

主场景使用 Noto Sans SC，缺失时回退 Microsoft YaHei；页面正文还允许 Source Han Sans SC。字体名称代表 CSS 字体栈，不代表每台电脑已安装字体。首页、报告及排行的既有展示字可保留 Barlow Condensed 与微软雅黑回退。

- 主操作台标题和 CN 标识使用 headline；从属产品名为 20px。
- 任务标题使用 title；任务说明、策略按钮与 NPC 正文使用 body。
- SVG 说明及辅助操作使用 label；会话补充信息为 13px。
- 上述字号均为未缩放画布值；1440×810 显示时整体乘以 0.75。

## Layout

游戏操作台固定为 1920×1080，居中按 `min(viewportWidth / 1920, viewportHeight / 1080)` 等比缩放。1440×810 对应 0.75；其他宽高比允许留边。此版本以桌面为验收范围，不能将辅助页的响应式规则视为游戏手机验收。

| 场景元素 | 画布坐标及尺寸 |
| --- | --- |
| 顶栏 | y=0，h=90，左右边距 80 |
| 场景 SVG | x=0，y=90，1920×730；viewBox `0 90 1920 730` |
| 数据入口 | x=760，y=110，400×80 |
| CN | x=760，y=250，400×160 |
| DN-01 / 02 / 03 | x=210 / 780 / 1350，y=590，各 360×180 |
| GTM | x=1650，y=130，160×140 |
| 图例 | x=80，y=792，右边距 80 |
| 控制区 | x=80，y=840，1260×220 |
| NPC 区 | x=1380，y=830，440×220；气泡高 180 |

三条 CN→DN 轨道分别抵达 x=390 / 960 / 1530。SVG 场景坐标与画布坐标对齐；不要再次添加 90px 偏移。首页使用同一场景的预览组件；报告和排行是独立辅助页。

## Elevation & Depth

游戏区通过深蓝底板、细边框、低透明网格和有限发光表达层次。节点保留平面几何，不引入透视相机或三维引擎。既有辅助页主按钮的阴影为 `0 12px 26px rgba(3, 12, 16, .35)`；该阴影不应扩展为场景所有面板的默认处理。

运动用于解释状态：CN 短转动、轨道运输、仓库预警、复制分裂与到达、GTM 同步波。启用 reduced motion 时隐藏运输粒子并压缩 CSS 动画；文字、数值与最终副本必须保留。

## Shapes

操作按钮与 DN 仓库以直角矩形为主；入口、CN 只使用轻微圆角。圆形仅用于协调核心、GTM 和头像。NPC 气泡采用独立的不对称圆角和尾巴，表现通讯来源。

## Components

### 调度按钮

策略选项宽 220、高 56，间隔 20；默认暗蓝、细描边，悬停加强青色边框，选中状态保留实色填充。确认按钮宽 180、高 56；禁用时暗化且不可执行。沿用全局可见键盘焦点（2px 浅青色轮廓，4px 偏移）。

### 数据节点与轨道

节点负载低于 60% 为青色；60% 起金色，80% 起橙色，95% 起红色。80% 起仓库描边脉冲，95% 起警示灯闪烁。最大与最小负载差超过 35 时显示数据倾斜提示，并在高负载入口堆积货物。

写入为方形货物；查询为橙色圆点，一节点查询只点亮中间 DN 轨道；复制以金色副本分裂和三个 DN 到达标记表现；同步模式显示 GTM 波纹及连接线。空闲状态保持轨道与节点可读。

### 社团通讯

气泡按需呼叫，可关闭；开启引导、教程、GTM 及结果阶段存在自动教学消息。不要把气泡描述为始终隐藏。固定右下角区域避免抢占中央物流过程。

保留配置中的原始社团头像，`object-fit: contain` 显示完整内容；全息效果仅由 CSS 降饱和、对比度及扫描线叠加完成，不能重绘或替换社团图像。

## Do's and Don'ts

### Do:

- Do 保持 OpenTenBase 首要、TenDispatch 从属的标题关系。
- Do 将中央场景、轨道与节点位置作为桌面布局基准。
- Do 用文字、数值和状态颜色共同解释调度后果。
- Do 保留社团原始头像与可关闭的教学通讯。

### Don't:

- Don't 将二维场景改为三维展示或让装饰遮挡运输过程。
- Don't 将警示、查询和副本颜色任意互换。
- Don't 把构建成功或逻辑测试通过描述为浏览器视觉验收。
