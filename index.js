const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000
const app = express()
require('dotenv').config()
const jwt = require('jsonwebtoken')

const stripe = require('stripe')(process.env.SECRET_STRIPE_KEY);

app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://montage-car:${process.env.PASS}@cluster0.lv5px.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'You have no permission to access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.SECRET_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    await client.connect()
    const partsCollection = client.db('montage-car').collection('parts')
    const orderCollection = client.db('montage-car').collection('order')
    const reviewCollection = client.db('montage-car').collection('reviews')
    const paymentCollection = client.db('montage-car').collection('payment')
    const userCollection = client.db('montage-car').collection('users')

    // get all products api
    app.get('/parts' ,async(req, res) => {
        const query = {}
        const parts = await partsCollection.find(query).toArray()
        res.send(parts)
    })

    // get single product api
    app.get('/parts/:id',verifyJWT, async (req, res) => {
        const id = req.params.id
        const query = { _id: ObjectId(id) }
        const part = await partsCollection.findOne(query)
        res.send(part)
    })


    // Delete single product api
    app.delete('/parts/:id', async (req, res) => {
        const id = req.params.id
        const query = { _id: ObjectId(id) }
        const result = await partsCollection.deleteOne(query)
        res.send(result)
    })


    // create api for add new product
    app.post('/product', async (req, res) => {
        const product = req.body
        const result = await partsCollection.insertOne(product)
        res.send(result)
    })

    // post order
    app.post('/part', async (req, res) => {

        const data = req.body
        const result = await orderCollection.insertOne(data)
        res.send(result)
    })
    // admin checking api
    app.get('/admin/:email', async (req, res) => {
        const email = req.params.email
        const query = {email:email}
        const user = await userCollection.findOne(query)
      
        const isAdmin = user.role === 'admin'
        res.send({admin : isAdmin})
    })
    

    // user update api 
    app.patch('/userUpdate/:email', async (req, res) => {
        const user = req.body
        const email = req.params.email
        const filter = { email: email }
      
        const updateData = {
            $set: user,
        }
        const result = await userCollection.updateOne(filter, updateData)
        res.send( result)
    })

    // get single user api 
    app.get('/user/:email', async(req, res) => {
        const email = req.params.email
        const user = await userCollection.findOne({email:email})
        res.send(user)
    })


    // user api when user login or signUp
    app.put('/user/:email', async (req, res) => {
        const user = req.body
        const email = req.params.email
        const filter = { email: email }
        const options = { upsert: true }
        const updateData = {
            $set: user,
        }
        const result = await userCollection.updateOne(filter, updateData, options)
        const token = jwt.sign({ email: email }, process.env.SECRET_TOKEN, { expiresIn: '5d' })
        res.send({ result, token })
    })

    // admin api 
    app.put('/user/admin/:email', verifyJWT, async (req, res) => {
        const email = req.params.email
        const filter = { email: email }
        const initiator = req.decoded.email
        const initiatorAccount = await userCollection.findOne({ email: initiator })
        if (initiatorAccount.role == 'admin') {
            const updateData = {
                $set: {
                    role: 'admin'
                },
            }
            const result = await userCollection.updateOne(filter, updateData)
            return res.send(result)
        }
        else {
            return res.status(403).send({ message: 'Forbidden ' })
        }

    })
    // delete users api 
    app.delete('/user/:email', async (req, res) => {
        const email = req.params.email
        const result = await userCollection.deleteOne({ email: email })
        res.send(result)
    })


    //  get all users 
    app.get('/users', verifyJWT, async (req, res) => {
        const query = {}
        const users = await userCollection.find(query).toArray()
        res.send(users)

    })

    // order delete api 
    app.delete('/order/:id', async (req, res) => {
        const id = req.params.id
        const query = {_id:ObjectId(id)}
        const result = await orderCollection.deleteOne(query)
        res.send(result)
    })
    // get all orders api bu speacific user
    app.get('/order/:email', verifyJWT, async (req, res) => {
        const email = req.params.email
        const decodedEmail = req.decoded.email
        if (email === decodedEmail) {

            const query = { email: email }
            const order = await orderCollection.find(query).toArray()
            return res.send(order)
        }
        else {
            return res.status(403).send({ message: 'Forbidden access' })
        }
    })
    // get all orders for manage 
    app.get('/allOrders',verifyJWT, async (req, res) => {
        const orders = await orderCollection.find().toArray()
        res.send(orders)
    })
    
    app.get('/singleItem/:id',verifyJWT, async(req, res) => {
        const id = req.params.id
        const query = { _id: ObjectId(id) }
        const result = await orderCollection.findOne(query)
        res.send(result)
    })
    // payment api for stripe
    app.post('/create-payment-intent', async (req, res) => {
        const price = req.body.productPrice
        const total = price * 100
        const paymentIntent = await stripe.paymentIntents.create({
            amount: total,
            currency: 'usd',
            payment_method_types: ['card']
        });
        res.send({ clientSecret: paymentIntent.client_secret })

    })

    app.patch('/update/:id', async (req, res) => {
        const id = req.params.id
        const paymentData = req.body
        const query = { _id: ObjectId(id) }
        const updateDoc = {
            $set: {
                transactionId: paymentData.transactionId,
                paid: true
            }
        }
        const updatedData = await orderCollection.updateOne(query, updateDoc)
        const payment = await paymentCollection.insertOne(paymentData)
        res.send(updatedData)

    })



    app.post('/reviews', async (req, res) => {
        const reviewData = req.body
        const result = await reviewCollection.insertOne(reviewData)
        res.send(result)
    })

    app.get('/review', async(req, res) => {
        const query = {}
        const reviews = await reviewCollection.find(query).toArray()
        res.send(reviews)
    })



}
run().catch(console.dir)



app.get('/', (req, res) => {
    res.send('Montage car server is running')
})

app.listen(port, () => {
    console.log('Listening port', port)
})