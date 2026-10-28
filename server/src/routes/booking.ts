import { Router } from 'express'
import { formHandler } from './forms.js'

export const bookingRouter = Router().post('/', formHandler('booking'))
