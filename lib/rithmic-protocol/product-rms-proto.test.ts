import path from 'node:path'
import { fileURLToPath } from 'node:url'
import protobuf from 'protobufjs'
import { describe, expect, it } from 'vitest'
import { COMMISSION_FILL_RATE_BIT } from './commission-rates'

const protoDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'proto')

describe('Product RMS proto', () => {
  it('exposes commission_fill_rate on field 156969 with presence bit 64', async () => {
    const root = new protobuf.Root()
    await root.load(path.join(protoDir, 'request_product_rms_info.proto'), {
      keepCase: false,
    })
    await root.load(path.join(protoDir, 'response_product_rms_info.proto'), {
      keepCase: false,
    })

    const request = root.lookupType('rti.RequestProductRmsInfo')
    expect(request.fields.templateId.id).toBe(154467)
    expect(request.fields.accountId.id).toBe(154008)
    expect(request.fields.fcmId.id).toBe(154013)
    expect(request.fields.ibId.id).toBe(154014)

    const response = root.lookupType('rti.ResponseProductRmsInfo')
    expect(response.fields.commissionFillRate.id).toBe(156969)
    expect(response.fields.productCode.id).toBe(100749)
    expect(response.fields.presenceBits.id).toBe(153622)
    expect(response.fields.accountId.id).toBe(154008)

    const bits = root.lookupEnum('rti.ResponseProductRmsInfo.PresenceBits')
    expect(bits.values.COMMISSION_FILL_RATE).toBe(COMMISSION_FILL_RATE_BIT)
  })
})
