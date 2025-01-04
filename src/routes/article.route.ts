import { Router } from 'express'
import { CreateArticle } from '../../schema/article'
import { validationMiddleware } from '../../middlewares/validation'
import { authenticate } from '../../middlewares/authenticate.middleware'
import {
    createArticle,
    deleteMyarticle,
    getAllArticles,
    getMyArticles,
    updateMyArticle,
} from '../controllers/article.controller'
const router = Router()

router.post(
    '/new',
    authenticate,
    CreateArticle,
    validationMiddleware,
    createArticle
)

router.get('/my-articles', authenticate, getMyArticles)
router.get('/list', getAllArticles)
router.put('/update', authenticate, CreateArticle, updateMyArticle)
router.delete('/delete/:id', authenticate, deleteMyarticle)

export default router
