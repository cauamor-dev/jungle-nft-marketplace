import { accountHandlers } from './account'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { demoHandlers } from './demo'
import { orderHandlers } from './orders'
import { socketHandlers } from '../socket'

export const handlers = [
  ...authHandlers,
  ...catalogHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...accountHandlers,
  ...demoHandlers,
  ...socketHandlers,
]
