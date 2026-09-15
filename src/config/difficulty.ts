export const difficulties = {
  novice: { label: '新手', pressure: 0, guide: true, description: '全程引导 · 教程不计分 · 正式任务 ×0.75 · 最高 75' },
  easy: { label: '简单', pressure: 6, guide: false, description: '温和流量 · 积分 ×1 · 最高 100' },
  medium: { label: '中等', pressure: 14, guide: false, description: '更高写入压力 · 积分 ×1.5 · 最高 150' },
  inferno: { label: '高级', pressure: 24, guide: false, description: '热点放大 · 积分 ×2 · 最高 200' },
} as const
export type Difficulty = keyof typeof difficulties
export type SessionMode = 'tutorial' | 'ranked' | 'legacy'
export interface SessionOptions { difficulty: Difficulty; pressure: number; guide: boolean; mode?: SessionMode; dailySeed?: string }
export const randomNickname = () => `开源${['星航员', '代码侠', '守护者', '探索家', '信使'][Math.floor(Math.random() * 5)]}${Math.floor(1000 + Math.random() * 9000)}`

export const scoreMultiplier = (difficulty: Difficulty) => ({ novice: 0.75, easy: 1, medium: 1.5, inferno: 2 }[difficulty])

export const getDailySeed = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `TD-${year}${month}${day}`
}

export const sessionModes = {
  tutorial: {
    label: '新手教学',
    description: '约 4～6 分钟 · 11 个教学节点 · 3 波不限时训练 · 可无限重试',
  },
  ranked: {
    label: 'Ranked 极速调度',
    description: '90 秒 · 14 波 · Daily Seed 波次库 · Combo 冲榜',
  },
} as const
