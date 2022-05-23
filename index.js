const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000
const app = express()
require('dotenv').config()


app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://montage-car:${process.env.PASS}@cluster0.lv5px.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    await client.connect()
    const partsCollection = client.db('montage-car').collection('parts')
    const orderCollection = client.db('montage-car').collection('order')
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
    
}
run().catch(console.dir)







app.get('/', (req, res) => {
    res.send('Montage car server is running')
})

app.listen(port, () => {
    console.log('Listening port', port)
})