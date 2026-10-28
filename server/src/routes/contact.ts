import { Router } from 'express'
import { formHandler } from './forms.js'

export const contactRouter = Router().post('/', formHandler('contact'))
