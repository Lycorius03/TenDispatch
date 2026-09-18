import assert from 'node:assert/strict'
import { GameEngine, comboMultiplier } from '../src/game/GameEngine.ts'
import { createRankedState, createTutorialState } from '../src/game/GameState.ts'
import { EventTracker } from '../src/game/EventTracker.ts'
import { getRankedWaveSet, rankedDecisionWindowMs, rankedDifficultyQuota, rankedNextWaveDelayMs, rankedWaveLibrary } from '../src/config/rankedWaves.ts'
import { strategyVocabulary, tablePlacementRules, trainingLessons } from '../src/config/gameConfig.ts'
import { ScoreEngine } from '../src/game/ScoreEngine.ts'

const dailyWaves = getRankedWaveSet('TD-TEST-SEED')
const sameDailyWaves = getRankedWaveSet('TD-TEST-SEED')
const otherDailyWaves = getRankedWaveSet('TD-OTHER-SEED')
assert.equal(rankedWaveLibrary.length >= 28, true)
assert.equal(dailyWaves.length, 14)
assert.deepEqual(dailyWaves.slice(-3).map((wave) => wave.finalRush), [true, true, true])
assert.deepEqual(dailyWaves.map((wave) => wave.templateId), sameDailyWaves.map((wave) => wave.templateId))
assert.notDeepEqual(dailyWaves.map((wave) => wave.templateId), otherDailyWaves.map((wave) => wave.templateId))
assert.equal(new Set(dailyWaves.map((wave) => wave.templateId)).size, 14)
assert.equal(rankedDecisionWindowMs, 20000)
assert.equal(rankedNextWaveDelayMs, 3000)
for (const [difficulty, count] of Object.entries(rankedDifficultyQuota)) {
  assert.equal(dailyWaves.filter((wave) => wave.difficulty === difficulty).length, count)
}
assert.deepEqual([1, 2, 3, 4, 5].map(comboMultiplier), [1, 1.1, 1.2, 1.3, 1.5])

// 决策时能看见的那一层：按钮固定成物流动作，OpenTenBase 术语只在第二行。
const actionSet = new Set(Object.values(strategyVocabulary).map((item) => item.action))
for (const wave of rankedWaveLibrary) {
  assert.equal(new Set(wave.options.map((option) => option.id)).size, wave.options.length, wave.templateId)
  assert.equal(wave.options.some((option) => option.id === wave.defaultStrategy), true, wave.templateId)
  assert.ok(!/分片|副本|Shard|Replication|Broadcast/.test(`${wave.distribution}${wave.access}`), wave.templateId)
  for (const option of wave.options) {
    assert.equal(option.label, strategyVocabulary[option.id].action, `${wave.templateId}:${option.id}`)
    assert.ok(actionSet.has(option.label), option.label)
    assert.ok(!/分片|副本|Shard|Replication|Broadcast/.test(option.detail), `${wave.templateId}:${option.detail}`)
    assert.ok(option.note.length > 0, `${wave.templateId}:${option.id}`)
  }
}
assert.equal(trainingLessons.length, 3)
assert.equal(tablePlacementRules.length, 3)

const engine = new GameEngine(new EventTracker())
let state = engine.start(createRankedState('TD-TEST-SEED'), '测试调度员')
assert.equal(state.phase, 'ranked')
const initialLoads = state.dnLoads

for (const [index, wave] of dailyWaves.entries()) {
  const defaultOption = wave.options.find((option) => option.id === wave.defaultStrategy)
  for (const alternative of wave.options.filter((option) => option.id !== wave.defaultStrategy)) {
    const alternativeResult = engine.submitRankedWave(state, alternative.id, 1000)
    if (alternativeResult.phase !== 'ranked-dead') {
      assert.ok(alternativeResult.waveResults.at(-1).score.total < 75, `wave ${index + 1}: ${alternative.id}`)
    }
  }
  state = engine.submitRankedWave(state, defaultOption.id, 1000)
  assert.equal(state.waveResults.at(-1).wave, index + 1)
  assert.equal(state.waveResults.at(-1).score.decisionSpeed, 10)
  if (index === 0) assert.notDeepEqual(state.dnLoads, initialLoads)
  if (index < dailyWaves.length - 1) state = engine.advanceRankedWave(state)
}

assert.equal(state.waveResults.length, 14)
assert.equal(state.phase, 'ranked-result')
assert.ok(state.maxCombo >= 5)
const report = engine.finishRanked(state)
assert.equal(report.screen, 'result')
const rankedBreakdown = new ScoreEngine().calculate(report)
assert.equal(rankedBreakdown.mode, 'ranked')
// 结算对照官方用法，并给出贴场景的称号；分还是分，记忆点变成两条铁律。
assert.ok(report.waveResults.every((wave) => wave.preferred === true && wave.publicData !== undefined))
assert.ok((rankedBreakdown.placement ?? '').includes('→'))
assert.deepEqual(rankedBreakdown.badges, ['编号直达', '拒绝全量复制', '公共目录就近读'])
assert.match(rankedBreakdown.feedback, /对照官方用法/)
assert.match(rankedBreakdown.feedback, /大表、持续写入|小而公共|查询条件和分流键不一致/)

let prediction = engine.start(createRankedState('TD-PREDICT'), '预测测试')
prediction = engine.useRankedPrediction(prediction)
prediction = engine.submitRankedWave(prediction, 'id', 1000)
assert.equal(prediction.waveResults[0].predictionUsed, true)
assert.ok(prediction.waveResults[0].score.total <= 89)

const scoreBeforeUndo = prediction.totalScore
prediction = engine.undoRankedDecision(prediction)
assert.equal(prediction.phase, 'ranked')
assert.equal(prediction.combo, 0)
assert.equal(prediction.waveResults.length, 0)
assert.equal(prediction.totalScore, Math.max(0, scoreBeforeUndo - 50))

let timeout = engine.start(createRankedState('TD-TIMEOUT'), '超时测试')
timeout = engine.submitRankedWave(timeout, 'not-a-strategy', rankedDecisionWindowMs + 1)
assert.equal(timeout.waveResults[0].timedOut, true)
assert.equal(timeout.waveResults[0].score.decisionSpeed, 0)
assert.equal(timeout.waveResults[0].score.total, 0)

let tutorial = engine.start(createTutorialState(), '教学测试')
for (let step = 1; step <= 5; step += 1) tutorial = engine.completeTutorialStep(tutorial)
assert.equal(tutorial.tutorialStep, 5)
tutorial = engine.selectTutorialWave(tutorial, 'status')
assert.equal(tutorial.tutorialStep, 6)
assert.equal(tutorial.tutorialWaveCompleted, true)
assert.equal(tutorial.tutorialStrategy, 'status')
tutorial = engine.retryTutorialWave(tutorial)
assert.equal(tutorial.tutorialStep, 5)
assert.equal(tutorial.tutorialWaveCompleted, false)
tutorial = engine.selectTutorialWave(tutorial, 'id')
tutorial = engine.completeTutorialStep(tutorial)
assert.equal(tutorial.tutorialStep, 7)
tutorial = engine.selectTutorialWave(tutorial, 'replicated')
assert.equal(tutorial.tutorialStep, 8)
tutorial = engine.completeTutorialStep(tutorial)
assert.equal(tutorial.tutorialStep, 9)
tutorial = engine.selectTutorialWave(tutorial, 'time')
assert.equal(tutorial.tutorialStep, 10)
tutorial = engine.completeTutorialStep(tutorial)
assert.equal(tutorial.tutorialStep, 11)
tutorial = engine.completeTutorialStep(tutorial)
assert.equal(tutorial.tutorialCompleted, true)
assert.equal(tutorial.screen, 'home')

let safeTutorial = engine.start(createTutorialState(), '高负载教学测试')
for (let step = 1; step <= 5; step += 1) safeTutorial = engine.completeTutorialStep(safeTutorial)
safeTutorial = engine.selectTutorialWave({ ...safeTutorial, dnLoads: [99, 99, 99], tutorialWaveStartLoads: [99, 99, 99] }, 'status')
assert.equal(safeTutorial.phase, 'tutorial')
assert.equal(safeTutorial.tutorialWaveCompleted, true)

let dead = engine.start(createRankedState('TD-DEATH'), '死亡测试')
const deathWaves = getRankedWaveSet('TD-DEATH')
for (const [index, wave] of deathWaves.entries()) {
  const worst = wave.options.reduce((best, option) => option.loadDelta.reduce((sum, value) => sum + value, 0) > best.loadDelta.reduce((sum, value) => sum + value, 0) ? option : best)
  dead = engine.submitRankedWave(dead, worst.id, 1000)
  if (dead.phase === 'ranked-dead') break
  if (index < deathWaves.length - 1) dead = engine.advanceRankedWave(dead)
}
assert.equal(dead.phase, 'ranked-dead')
assert.ok(dead.dnLoads.some((load) => load >= 100))
assert.match(dead.deathReason, /负载已满/)
assert.equal(engine.advanceRankedWave(dead), dead)

console.log('Ranked: seeded wave library quotas, 14 waves, Final Rush, Combo, prediction cap, undo penalty, inherited state, and timeout fallback verified.')
