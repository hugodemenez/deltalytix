import path from 'node:path'
import { fileURLToPath } from 'node:url'
import protobuf from 'protobufjs'
import { describe, expect, it, vi } from 'vitest'
import { observeMappedFillRow } from './admin-fill-coverage'
import { RithmicProtocolClient } from './client'
import { RithmicTemplateId } from './templates'

const PROTO_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'proto')

async function loadFillHistoryRoot(): Promise<protobuf.Root> {
  const root = new protobuf.Root()
  await root.load(path.join(PROTO_DIR, 'response_show_fill_history.proto'), {
    keepCase: false,
  })
  return root
}

function encodeShowFillHistory(
  root: protobuf.Root,
  payload: Record<string, unknown>,
): Buffer {
  const type = root.lookupType('rti.ResponseShowFillHistory')
  const err = type.verify(payload)
  if (err) throw new Error(`ResponseShowFillHistory verify failed: ${err}`)
  return Buffer.from(type.encode(type.create(payload)).finish())
}

type ClientInternals = {
  root: protobuf.Root
  ws: { readyState: number; send: () => void }
  queue: Array<{ templateId: number; raw: Buffer }>
  closed: boolean
  send: (typeName: string, payload: Record<string, unknown>) => Promise<void>
}

async function driveGetFillHistory(rows: Record<string, unknown>[]) {
  const root = await loadFillHistoryRoot()
  const client = new RithmicProtocolClient()
  const internals = client as unknown as ClientInternals
  internals.root = root
  internals.ws = { readyState: 1, send: vi.fn() }
  internals.closed = false
  internals.send = async () => undefined
  internals.queue = rows.map((payload) => ({
    templateId: RithmicTemplateId.SHOW_FILL_HISTORY_RESPONSE,
    raw: encodeShowFillHistory(root, {
      templateId: RithmicTemplateId.SHOW_FILL_HISTORY_RESPONSE,
      ...payload,
    }),
  }))
  const dropped: string[] = []
  const fills = await client.getFillHistory({
    accountId: 'A',
    startDateYyyymmdd: 20261030,
    endDateYyyymmdd: 20261108,
    observe: {
      onRow: ({ decoded, mapped }) => {
        const observation = observeMappedFillRow(decoded, mapped != null)
        if (!observation.accepted && observation.reason) {
          dropped.push(observation.reason)
        }
      },
    },
  })
  return { fills, dropped }
}

describe('getFillHistory observer vs control rows (N1)', () => {
  it('ignores rp_code 0 and rp_code 7 terminators that carry no fill fields', async () => {
    const withSuccess = await driveGetFillHistory([
      {
        symbol: 'MESZ6',
        fillId: '1',
        fillPrice: 5800,
        fillSize: 1,
        transactionType: 'BUY',
        fillDate: '20261030',
        ssboe: 1_800_000_000,
      },
      { rpCode: ['0'] },
    ])
    expect(withSuccess.fills).toHaveLength(1)
    expect(withSuccess.fills[0]?.fillId).toBe('1')
    expect(withSuccess.dropped).toEqual([])

    const noData = await driveGetFillHistory([{ rpCode: ['7'] }])
    expect(noData.fills).toHaveLength(0)
    expect(noData.dropped).toEqual([])
  })
})
