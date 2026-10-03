import { describe, expect, it } from 'vitest'
import { HttpError } from '../../../services/http/http-client'
import {
  classifyExecutionContractError,
  resolveExecutionActionCapability,
} from './useExecutionActionCapabilities'

describe('execution action capability adapter', () => {
  it('distinguishes an absent proposed contract from an unavailable service', () => {
    expect(classifyExecutionContractError(new HttpError('not found', 404))).toBe('unsupported_contract')
    expect(classifyExecutionContractError(new HttpError('not implemented', 501))).toBe('unsupported_contract')
    expect(classifyExecutionContractError(new HttpError('server error', 500))).toBe('unavailable')
    expect(classifyExecutionContractError(new Error('network unavailable'))).toBe('unavailable')
  })

  it('fails closed while retaining a distinct denial diagnostic', () => {
    expect(resolveExecutionActionCapability(null, 'unsupported_contract', 'update_task')).toEqual({
      state: 'unsupported_contract', allowed: false, reasons: ['UNSUPPORTED_CONTRACT'],
    })
    expect(resolveExecutionActionCapability(null, 'unavailable', 'update_task')).toEqual({
      state: 'unavailable', allowed: false, reasons: ['CONTRACT_UNAVAILABLE'],
    })
    expect(resolveExecutionActionCapability(null, 'ready', 'update_task')).toEqual({
      state: 'denied', allowed: false, reasons: ['PROJECT_ACCESS_DENIED'],
    })
  })

  it('uses only backend-published action codes and reasons', () => {
    const actions = [
      { code: 'update_task', allowed: true, reasons: [] },
      { code: 'delete_task', allowed: false, reasons: ['TEAM_LEADER_REQUIRED'] },
    ]

    expect(resolveExecutionActionCapability(actions, 'ready', 'update_task').state).toBe('allowed')
    expect(resolveExecutionActionCapability(actions, 'ready', 'delete_task')).toEqual({
      state: 'denied', allowed: false, reasons: ['TEAM_LEADER_REQUIRED'],
    })
    expect(resolveExecutionActionCapability(actions, 'ready', 'create_task')).toEqual({
      state: 'denied', allowed: false, reasons: ['ACTION_NOT_PUBLISHED'],
    })
  })
})
