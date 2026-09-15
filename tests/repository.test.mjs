import assert from 'node:assert/strict'
import { LocalRepository } from '../src/services/LocalRepository.ts'

const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
}

const repository = new LocalRepository()
const first = repository.getOrCreatePlayerNickname()
assert.equal(repository.getOrCreatePlayerNickname(), first)

repository.savePlayerNickname('手写调度员')
assert.equal(repository.getOrCreatePlayerNickname(), '手写调度员')

const record = (score, difficulty = 'easy', hintCount = 0, duration = 80) => ({
  id: `${score}-${difficulty}-${hintCount}-${duration}`,
  nickname: '手写调度员',
  difficulty,
  score,
  title: '数据调度员',
  hintCount,
  duration,
  completedAt: new Date().toISOString(),
  breakdown: { version: 2, multiplier: 1, baseTotal: score, maximum: 100, distribution: 30, query: 25, replication: 20, architecture: 15, independence: 10, total: score, title: '数据调度员', feedback: '' },
  behavior: { shardingAdjustments: 0, skewTriggered: false, averageQueryNodes: 1, hintCount, stageTimes: {}, totalDuration: duration },
  events: [],
})

repository.save(record(70))
repository.save(record(90))
repository.save(record(60))
assert.equal(repository.getRankings().filter(item => item.nickname === '手写调度员' && item.difficulty === 'easy').length, 1)
assert.equal(repository.getRankings().find(item => item.nickname === '手写调度员' && item.difficulty === 'easy').score, 90)

repository.save(record(80, 'medium'))
assert.equal(repository.getRankings().filter(item => item.nickname === '手写调度员').length, 2)

const random = repository.nextRandomPlayerNickname()
assert.notEqual(random, '手写调度员')
assert.notEqual(random, first)
console.log('Repository: player nickname persists; random names avoid current and recorded names; best record updates per nickname and difficulty.')
