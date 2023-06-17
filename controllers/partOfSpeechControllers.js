const fs = require('fs')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

// Generating a random number to use it in various situations
// such as shuffling arrays and selecting random indexes
const genRandNum = (arrLength) => {
    const randFraction = Math.random() * arrLength
    const randIntNum = Math.floor(randFraction)
    return randIntNum
}

// Responsible for getting an array of 10 random words that includes at least 1 word of each type
const wordsGet = (req, res) => {

    // The fs is a built in node.js method to interact with file system, here we are reading
    // wordList from the TestData.json file or the "database"
    fs.readFile('./database/TestData.json', 'utf8', (err, data) => {
        if(err){
            console.log(err)
            res.status(500).send("error occured")
        }

        try {
            // The "utf8" converts the buffer into string to we parse it 
            const wordList = JSON.parse(data).wordList
        
        // Defining data containers first to make the code reusable
        const types = [ 'noun', 'adjective', 'verb', 'adverb' ]
        const seperateArrays = []
        const unshuffledArr = []
        const shuffledArr = []
        
        // pushing the words into seperate arrays according to their POS type
        types.map(type => seperateArrays.push(wordList.filter(word => word.pos === type)))

        // picking 1 random word from each POS type and pushing it into the unshuffled array
        // while removing it from the main wordList to avoid repetition of words
        seperateArrays.map(typeArr => {
            const randNum = genRandNum(typeArr.length)
            unshuffledArr.push(typeArr[randNum])
            // here we are removing the words by id using the indexes which we get from getRandNum
            wordList.splice(wordList.findIndex(word => word.id === typeArr[randNum].id), 1)
        })

        // adding more 6 random words to the unshuffled array
        for( i = 0 ; i < 6 ; i++){
            const randNum = genRandNum(wordList.length)
            unshuffledArr.push(wordList[randNum])
            wordList.splice(randNum, 1)
        }

        // here we are shuffling the array so that we dont get 4 POS types with the same order
        // in the first 4 indexes in every request
        for( i = 0 ; i < 10 ; i++){
            const randNum = genRandNum(unshuffledArr.length)
            shuffledArr.push(unshuffledArr[randNum])
            unshuffledArr.splice(randNum, 1)
        }

        res.send(shuffledArr)
        }

        catch (err) {
            res.status(500).send('Error getting Data');
        }
    })
}

// I added one user with hashed password to the database to use as admin for creating new words
const wordsCreate = async (req, res) => {

    // extracting the token from the headers and removing the "Bearer " part
    const token = req.headers.authorization.split("Bearer ")[1];

  // Checking if token is provided
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // this "verify" method in jwt returns back the data with which the token was signed in the first place
  const userObject = await jwt.verify(token, 'vgckbhjk782hdbj3_78gi');

  // I signed the token using the user ID so we should be able to get it from this object
  // so I am checking if this is the user with ID equal 1 ... this is the only user we have
  if(userObject.id === 1){

    // after verifying the user ID we start creating the new data, first we get the current data
    // using fs.readFile, the third parameter in the readFile function is a callback function that
    // runs only after the file read attempt is finished
    fs.readFile('./database/TestData.json', 'utf8', (err, data) => {
        const wordList = JSON.parse(data).wordList
        // here we add the new data object to the file or database
        wordList.push({ id: wordList.length+1, word: req.body.word, pos: req.body.pos })
        const newData = { wordList, scoresList: JSON.parse(data).scoresList, users: JSON.parse(data).users }
        // the stringify function accepts these parameters ( data, functions after converting, indent)
        fs.writeFile('./database/TestData.json', JSON.stringify(newData, null, 4), (err) => {
            console.log(err)
        })
        res.json({wordList})
    })
  }
}

// this controller calculates the student's rank according to
// this formula Math.floor((lowerScores/scoresList.length)*100)
const rankPost = (req, res) => {
    const finalScore = req.body.finalScore*10
    fs.readFile('./database/TestData.json', 'utf8', async (err, data) => {
        if(err){
            console.log(err)
        }
        const scoresList = JSON.parse(data).scoresList

        var lowerScores = 0;
        // calculating the number of scores that are lower than the user's score by mapping through the scores
        scoresList.map(userScore => userScore.score < finalScore ? lowerScores++ : lowerScores)
        
        // calculating the student rank
        const studentRank = Math.floor((lowerScores/scoresList.length)*100)
        
        // pushing the student rank to the scoresList to then push it to the database
        scoresList.push({ name: req.body.username, score: finalScore})

        const newData = {wordList:JSON.parse(data).wordList, scoresList, users:JSON.parse(data).users}

        fs.writeFile('./database/TestData.json', JSON.stringify(newData, null, 4), (err) => {
            console.log(err)
        })
        res.json({studentRank})
    })
    
}

// I added this controller that gets a list of the top 10 scores in order to build
// a top 10 leader board on the frontend
const rankGet = (req, res) => {
    fs.readFile('./database/TestData.json', 'utf8', async (err, data) => {
        if(err){
            console.log(err)
        }
        const scoresList = JSON.parse(data).scoresList

        // here we are sorting the records in descending order according to the score
        scoresList.sort((a, b) => b.score - a.score);

        // taking just the first 10 records in the scoresList
        scoresList.splice(10)

        res.json(scoresList)
    })
    
}

// I added this controller so that the admin can login and receive a JWT token to store it on the frontend
// which will be used to make authenticated "Create Word" requests
const loginUser = async (req, res) => {
    const { username , password } = req.body
    fs.readFile('./database/TestData.json', 'utf8', async (err, data) => {
        const users = await JSON.parse(data).users
        const userIndex = users.findIndex(user => user.username === username)
        const user = users[userIndex]
        // the bcrypt.compare function is used to compare provided password with hashed password
        const passMatch = await bcrypt.compare(password, user.password)
        if(passMatch){
            // here we are signing the token, the secret key should be pulled from a .env file
            // but just for simplicity I hard coded it
            const token = jwt.sign({id:user.id}, "vgckbhjk782hdbj3_78gi", { expiresIn: '3d'})
            res.json({user: user.username, token})
        } else {
            res.json({mssg: "Invalid Credentials"})
        }
    })
    /*
    *  I used the below code to generate a hashed password for one user only
    *  just for the sake of this simple project
    *  const salt = await bcrypt.genSalt(10)
    *  const hash = await bcrypt.hash(password, salt)
    *  console.log('hashed : ', hash)
    */
}

// exporting the controller functions to use it in the routes file
module.exports = {
    wordsGet,
    wordsCreate,
    rankGet,
    rankPost,
    loginUser
}