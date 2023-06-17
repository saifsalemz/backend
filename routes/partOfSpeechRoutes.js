const express = require('express')

const router = express.Router()

// Destructuring the controllers from the partOfSpeech controllers file
const { wordsGet, rankGet, rankPost, loginUser, wordsCreate } = require('../controllers/partOfSpeechControllers')

// Redirecting the endpoints to it's corresponding controller
router.get('/words', wordsGet)

router.get('/rank', rankGet)

router.post('/rank', rankPost)

router.post('/login', loginUser)

router.post('/create', wordsCreate)

// Export the routes to use it in server.js
module.exports = router