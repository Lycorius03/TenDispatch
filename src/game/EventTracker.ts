export type GameEventType =
  | 'game_started'
  | 'tutorial_completed'
  | 'tutorial_wave_completed'
  | 'dispatch_rule_selected'
  | 'data_skew_triggered'
  | 'dispatch_rule_changed'
  | 'query_started'
  | 'query_completed'
  | 'replication_selected'
  | 'replication_changed'
  | 'gtm_event_triggered'
  | 'hint_used'
  | 'final_dispatch_started'
  | 'final_dispatch_completed'
  | 'game_completed'
  | 'ranked_wave_started'
  | 'ranked_wave_completed'
  | 'ranked_game_over'
  | 'prediction_used'
  | 'undo_used'

export interface GameEvent {
  type: GameEventType
  stage: string
  value?: string
  timestamp: number
  duration?: number
  attempt?: number
  result?: string
}

export class EventTracker {
  private events: GameEvent[] = []

  track(event: Omit<GameEvent, 'timestamp'>) {
    this.events.push({ ...event, timestamp: Date.now() })
  }

  getEvents() {
    return [...this.events]
  }

  reset() {
    this.events = []
  }
}
