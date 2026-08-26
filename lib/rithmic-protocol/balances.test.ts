import { describe, expect, it } from 'vitest'
import { mapAccountPnLUpdateToBalance } from './balances'
import { PNL_PLANT, RithmicTemplateId } from './templates'

describe('mapAccountPnLUpdateToBalance', () => {
  it('maps string numeric fields from AccountPnLPositionUpdate', () => {
    expect(
      mapAccountPnLUpdateToBalance({
        accountId: ' APEX-99 ',
        fcmId: 'FCM',
        ibId: 'IB',
        accountBalance: '51234.50',
        cashOnHand: '50000',
        marginBalance: '48000.25',
        availableBuyingPower: '10000',
        openPositionPnl: '-12.5',
        closedPositionPnl: '100',
        dayPnl: '87.5',
      }),
    ).toEqual({
      account_id: 'APEX-99',
      fcm_id: 'FCM',
      ib_id: 'IB',
      account_balance: 51234.5,
      cash_on_hand: 50000,
      margin_balance: 48000.25,
      available_buying_power: 10000,
      open_pnl: -12.5,
      closed_pnl: 100,
      day_pnl: 87.5,
    })
  })

  it('returns null without an account id', () => {
    expect(
      mapAccountPnLUpdateToBalance({
        accountBalance: '1',
      }),
    ).toBeNull()
  })
})

describe('PnL plant template ids', () => {
  it('matches async_rithmic / Reference Guide ids', () => {
    expect(PNL_PLANT).toBe(4)
    expect(RithmicTemplateId.PNL_POSITION_SNAPSHOT_REQUEST).toBe(402)
    expect(RithmicTemplateId.PNL_POSITION_SNAPSHOT_RESPONSE).toBe(403)
    expect(RithmicTemplateId.ACCOUNT_PNL_POSITION_UPDATE).toBe(451)
    expect(RithmicTemplateId.INSTRUMENT_PNL_POSITION_UPDATE).toBe(450)
  })
})
