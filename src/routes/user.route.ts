import { Router } from 'express'
import {
  forgotPassword,
  loginUser,
  registerUser,
  resetPassword,
  verifyCode,
  whoami,
} from '../controllers/user.controller'
import { loginUserSchema, RegistrationSchema } from '../../schema/user'
import { validationMiddleware } from '../../middlewares/validation'
import { authenticate } from '../../middlewares/authenticate.middleware'
const router = Router()

router.post('/new', RegistrationSchema, validationMiddleware, registerUser)
router.post('/login', loginUserSchema, validationMiddleware, loginUser)
router.get('/whoami', authenticate, whoami)
router.post('/forget-password', authenticate, forgotPassword)
router.post('/verify-code', authenticate, verifyCode)
router.post('/reset-password', authenticate, resetPassword)

export default router
