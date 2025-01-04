import { PrismaClient } from '@prisma/client'
import { Request, Response } from 'express'
import { ILoginUser, IRegisterUser } from '../../types/user'
const prisma = new PrismaClient()
import argon2 from 'argon2'
import twilio from 'twilio'
import { generateToken } from '../../helpers/jwt'
import { AuthRequest } from '../../types/request'
import { generateCode } from '../../helpers/generateCode'

export const registerUser = async (req: Request, res: Response) => {
  try {
    const data: IRegisterUser = req.body

    // Check if password and confirm password match

    if (data.password !== data.confirmPassword) {
      res.status(400).json({
        isSuccess: false,
        message: 'Password must match',
      })

      return
    }

    // CHECK IF THE USER IS EXISTING
    const user = await prisma.users.findFirst({
      where: {
        email: data.email,
      },
    })

    if (user) {
      res.status(409).json({
        isSuccess: false,
        message: 'User already exists.',
      })

      return
    }

    // HASH THE PASSWORD

    const hashedPassword = await argon2.hash(data.password)

    // CREATE THE USER

    const newUser = await prisma.users.create({
      data: {
        fullname: data.fullname,
        email: data.email.toLowerCase(),
        phone_number: data.phone_number,
        password: hashedPassword,
      },
    })

    res.status(201).json({
      isSuccess: true,
      message: 'Success',
      newUser,
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      isSuccess: false,
      message: 'Something went wrong!',
    })
  }
}

export const loginUser = async (req: Request, res: Response) => {
  try {
    const data: ILoginUser = req.body

    const user = await prisma.users.findUnique({
      where: {
        email: data.email.toLowerCase(),
      },
    })

    if (!user) {
      res.status(401).json({
        isSuccess: false,
        message: 'Incorrect email or password',
      })

      return
    }

    const isPasswordCorrect = await argon2.verify(user.password, data.password)

    if (!isPasswordCorrect) {
      res.status(401).json({
        isSuccess: false,
        message: 'Incorrect email or password',
      })

      return
    }

    const { password, last_login, ...rest } = user
    const token = generateToken(user.id)

    res.status(200).json({
      isSuccess: true,
      user: rest,
      token: token,
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      isSuccess: false,
      message: 'Something went wrong!',
    })
  }
}

export const whoami = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const user = await prisma.users.findUnique({
      where: {
        id: userId,
      },
    })

    if (!user) {
      res.status(404).json({
        isSuccess: false,
        message: 'User not found',
      })

      return
    }

    const { password, ...rest } = user

    res.status(200).json({
      isSuccess: true,
      message: 'Success',
      user: rest,
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      isSuccess: false,
      message: 'Something went wrong!',
    })
  }
}

export const forgotPassword = async (req: Request, res: Response) => {
  const { phone_number } = req.body
  const code = generateCode()
  const expiry = new Date(Date.now() + 15 * 60 * 1000)

  try {
    const user = await prisma.users.findFirst({
      where: {
        phone_number,
      },
    })

    if (!user) {
      res.status(404).json({
        isSuccess: false,
        message: 'User not found!',
      })

      return
    }

    const verification_code = await prisma.verification_codes.create({
      data: {
        code,
        expiry,
        user_id: user.id,
      },
    })

    if (!verification_code) {
      res.status(500).json({
        isSuccess: false,
        message: 'Error while creating the verification code!',
      })
    }
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTHTOKEN
    const client = require('twilio')(accountSid, authToken)

    await client.messages.create({
      from: 'whatsapp:+14155238886',
      contentSid: 'HX229f5a04fd0510ce1b071852155d3e75',
      contentVariables: `{"1":"${code}"}`,
      to: `whatsapp:${phone_number}`,
    })

    res.status(200).json({
      isSuccess: true,
      message: 'The verification code is sent successfully!',
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      isSuccess: false,
      message: 'Something went wrong!',
    })
  }
}

export const verifyCode = async (req: Request, res: Response) => {
  try {
    const { phone_number, code } = req.body
    const user = await prisma.users.findFirst({
      where: {
        phone_number,
      },
    })

    if (!user) {
      res.status(400).json({
        isSuccess: false,
        message: 'The phone number is not found',
      })

      return
    }

    const confirmCode = await prisma.verification_codes.findFirst({
      where: {
        user_id: user.id,
      },
    })

    if (!confirmCode) {
      res.status(400).json({
        isSuccess: false,
        message: 'There is no verification code registered!',
      })

      return
    }

    if (confirmCode.expiry.getTime() < Date.now()) {
      res.status(400).json({
        isSuccess: false,
        message: 'code expired!',
      })

      return
    }

    if (confirmCode.code == code) {
      await prisma.verification_codes.update({
        where: {
          id: confirmCode.id,
        },
        data: {
          verified: true,
        },
      })

      res.status(200).json({
        isSuccess: true,
        message: 'The phone number is verified!',
      })

      return
    } else {
      res.status(400).json({
        isSuccess: false,
        message: 'incorrect verification code!',
      })
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({
      isSuccess: false,
      message: 'Something went wrong!',
    })
  }
}

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { phone_number, newPassword } = req.body

    if (!phone_number || !newPassword) {
      res.status(400).json({
        isSuccess: false,
        message: 'Fill the inputs',
      })

      return
    }

    const user = await prisma.users.findFirst({
      where: {
        phone_number,
      },
    })

    if (!user) {
      res.status(400).json({
        isSuccess: false,
        message: 'The phone number is not found',
      })

      return
    }

    const verification = await prisma.verification_codes.findFirst({
      where: {
        user_id: user.id,
      },
    })

    if (!verification) {
      res.status(400).json({
        isSuccess: false,
        message: 'There is no verification code registered!',
      })

      return
    }

    if (verification.verified) {
      const newPasswordHasshed = await argon2.hash(newPassword)

      await prisma.users.update({
        where: {
          id: verification.user_id,
        },
        data: {
          password: newPasswordHasshed,
        },
      })

      res.status(200).json({
        isSuccess: true,
        message: 'The password is successfully reseted!',
      })

      return
    } else {
      res.status(404).json({
        isSuccess: false,
        message: 'The phone_number is not verified!',
      })
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({
      isSuccess: false,
      message: 'Something went wrong!',
    })
  }
}
