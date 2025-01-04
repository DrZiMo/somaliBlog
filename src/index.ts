import express from 'express'
import dotenv from 'dotenv'
import userRoute from './routes/user.route'
import articleRoute from './routes/article.route'

dotenv.config()
const app = express()
const PORT = process.env.PORT

// Allows the data from the client
app.use(express.json())

app.use('/api/users', userRoute)
app.use('/api/articles', articleRoute)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
