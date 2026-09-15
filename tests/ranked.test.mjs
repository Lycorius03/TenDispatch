import assert from 'node:assert/strict'
import { GameEngine, comboMultiplier } from '../src/game/GameEngine.ts'
import { createRankedState, createTutorialState } from '../src/game/GameState.ts'
import { EventTracker } from '../src/game/EventTracker.ts'
import { getRankedWaveSet, rankedDifficultyQuota, rankedWaveArrivalSeconds, rankedWaveLibrary } from '../src/config/rankedWaves.ts'
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
for (const [difficulty, count] of Object.entries(rankedDifficultyQuota)) {
  assert.equal(dailyWaves.filter((wave) => wave.difficulty === difficulty).length, count)
}
const arrivalGaps = rankedWaveArrivalSeconds.slice(1).map((second, index) => second - rankedWaveArrivalSeconds[index])
assert.ok(arrivalGaps.reduce((sum, gap) => sum + gap, 0) / arrivalGaps.length >= 5 && arrivalGaps.reduce((sum, gap) => sum + gap, 0) / arrivalGaps.length <= 7)
assert.deepEqual([1, 2, 3, 4, 5].map(comboMultiplier), [1, 1.1, 1.2, 1.3, 1.5])

const engine = new GameEngine(new EventTracker())
let state = engine.start(createRankedState('TD-TEST-SEED'), '测试调度员')
assert.equal(state.phase, 'ranked')
const initialLoads = state.dnLoads

for (const [index, wave] of dailyWaves.entries()) {
  const defaultOption = wave.options.find((option) => option.id === wave.defaultStrategy)
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
assert.equal(new ScoreEngine().calculate(report).mode, 'ranked')

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
timeout = engine.submitRankedWave(timeout, 'not-a-strategy', 4001)
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
