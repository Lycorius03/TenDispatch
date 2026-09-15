export const replicationScenarios = {
  publicData: { name: '院系信息', size: 'small', frequency: 'high' },
  businessLogs: { name: '海量业务日志', records: 2_000_000, size: 'large', frequency: 'continuous-write' },
} as const
