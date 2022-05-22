const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000
const app = express()
require('dotenv').config()


app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://montage-car:${process.env.PASS}@cluster0.lv5px.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    await client.connect()
    console.log('connected')
    const partsCollection = client.db('montage-car').collection('parts')

    app.get('/test', async(req, res) => {
        const query = {}
        const parts = await partsCollection.find(query).toArray()
        res.send(parts)
    })
}
run().catch(console.dir)





app.get('/', (req, res) => {
    res.send('Montage car server is running')
})

app.listen(port, () => {
    console.log('Listening port', port)
})