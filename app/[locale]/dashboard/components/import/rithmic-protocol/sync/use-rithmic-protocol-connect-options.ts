'use client'

import { useEffect, useState } from 'react'
import {
  RITHMIC_PROTOCOL_CORE_GATEWAY_ID,
  RITHMIC_PROTOCOL_GATEWAYS,
  getFallbackSystems,
  type RithmicProtocolEnvironment,
} from '@/lib/rithmic-protocol/systems'
import {
  listRithmicProtocolGateways,
  listRithmicProtocolSystems,
} from './actions'

export interface RithmicProtocolGatewayOption {
  id: string
  label: string
  environment: RithmicProtocolEnvironment
}

const INITIAL_GATEWAYS: RithmicProtocolGatewayOption[] =
  RITHMIC_PROTOCOL_GATEWAYS.filter(
    (gateway) => gateway.environment === 'production',
  ).map(({ id, label, environment }) => ({ id, label, environment }))

/**
 * Loads the connect points a user may pick, then probes the selected one with
 * `RequestRithmicSystemInfo` for its system names. Both lists come from the
 * server so UAT stays available on dev without leaking into production.
 */
export function useRithmicProtocolConnectOptions(enabled = true) {
  const [gateways, setGateways] =
    useState<RithmicProtocolGatewayOption[]>(INITIAL_GATEWAYS)
  const [gatewayId, setGatewayId] = useState(RITHMIC_PROTOCOL_CORE_GATEWAY_ID)
  const [systems, setSystems] = useState<string[]>(() =>
    getFallbackSystems(RITHMIC_PROTOCOL_CORE_GATEWAY_ID),
  )
  const [systemName, setSystemName] = useState('')
  const [loadingGateways, setLoadingGateways] = useState(false)
  const [loadingSystems, setLoadingSystems] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void (async () => {
      try {
        setLoadingGateways(true)
        const result = await listRithmicProtocolGateways()
        if (cancelled || result.gateways.length === 0) return
        setGateways(result.gateways)
        setGatewayId((current) =>
          result.gateways.some((gateway) => gateway.id === current)
            ? current
            : result.defaultGatewayId,
        )
      } catch (error) {
        console.warn('Failed to load Rithmic Protocol connect points', error)
      } finally {
        if (!cancelled) setLoadingGateways(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void (async () => {
      try {
        setLoadingSystems(true)
        const result = await listRithmicProtocolSystems(gatewayId)
        if (cancelled || result.gatewayId !== gatewayId) return
        if (result.systems.length > 0) {
          setSystems(result.systems)
          // Keep the user's pick when it still exists; otherwise clear so they
          // must choose explicitly (credentials stay disabled until then).
          setSystemName((current) =>
            result.systems.includes(current) ? current : '',
          )
        }
      } catch (error) {
        console.warn('Failed to load Rithmic Protocol systems', error)
        if (!cancelled) {
          const fallback = getFallbackSystems(gatewayId)
          setSystems(fallback)
          setSystemName((current) =>
            fallback.includes(current) ? current : '',
          )
        }
      } finally {
        if (!cancelled) setLoadingSystems(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, gatewayId])

  return {
    gateways,
    gatewayId,
    setGatewayId,
    systems,
    systemName,
    setSystemName,
    loadingGateways,
    loadingSystems,
  }
}
