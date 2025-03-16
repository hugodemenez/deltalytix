import { auth } from './auth'
import { common } from './common'
import { dashboard } from './dashboard'
import { importTranslations } from './import'
import { landing } from './landing'

export default {
  ...auth,
  ...common,
  ...dashboard,
  ...importTranslations,
  ...landing,
} as const 