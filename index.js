const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000
const app = express()
require('dotenv').config()

const stripe = require('stripe')(process.env.SECRET_STRIPE_KEY);

app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://montage-car:${process.env.PASS}@cluster0.lv5px.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
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
    app.get('/parts', async (req, res) => {
        const query = {}
        const parts = await partsCollection.find(query).toArray()
        res.send(parts)
    })

    app.get('/parts/:id', async (req, res) => {
        const id = req.params.id
        const query = { _id: ObjectId(id) }
        const part = await partsCollection.findOne(query)
        res.send(part)
    })
    app.post('/part', async (req, res) => {

        const data = req.body
        const result = await orderCollection.insertOne(data)
        res.send(result)
    })
        // user api
    app.put('/user/:email', async (req, res) => {
        const user = req.body
        const email = req.params.email
        const filter = {email:email}
        const options = {upsert: true}
        const updateData = {
            $set: user,
        }
        const result = await userCollection.updateOne(filter,updateData,options)
        res.send(result)
    })



    app.get('/order', async (req, res) => {
        const query = {}
        const order = await orderCollection.find(query).toArray()
        res.send(order)
    })

    app.get('/singleItem/:id', async (req, res) => {
        const id = req.params.id
        const query = { _id: ObjectId(id) }
        const result = await orderCollection.findOne(query)
        res.send(result)
    })

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

        console.log(paymentData.transactionId)

        const updateDoc = {
            $set: {
                transactionId: paymentData.transactionId,
                paid: true

            }
        }
        const updatedData = await orderCollection.updateOne(query, updateDoc)
        const payment = await paymentCollection.insertOne(paymentInfo)
        res.send(updatedData)

    })



    app.post('/reviews', async (req, res) => {
        const reviewData = req.body
        const result = await reviewCollection.insertOne(reviewData)
        res.send(result)
    })

    app.get('/review', async (req, res) => {
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