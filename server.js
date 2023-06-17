const express = require ('express')
const partOfSpeechRoutes = require('./routes/partOfSpeechRoutes')
const cors = require('cors')

// Create the app server
const app = express()

// Utilizing the use function to access the request body
app.use(express.json())

// Allowing cross-origin requests from the frontend
app.use(cors({
    origin: "http://localhost:3000",
}));

// Following the MVC approach so using the routes which calls the controllers
app.use('/api', partOfSpeechRoutes)

// Spinning the server on port 5000
app.listen(5000, () => {
    console.log('Server is running on port 5000')
})