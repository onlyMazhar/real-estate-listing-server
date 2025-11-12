const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express()
const cors = require('cors');
const port = process.env.port || 3000;

app.use(cors())
app.use(express.json())



//BocHY9k6oJWI5YSk
const uri = "mongodb+srv://real-estate-db:BocHY9k6oJWI5YSk@cluster0.81efjl7.mongodb.net/?appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const db = client.db('real-estate-db')
    const listCollections = db.collection('property_listing')

    app.get('/lists', async (req, res) => {
      const result = await listCollections.find().toArray()
      res.send(result)
    })

    app.get('/lists/:id', async (req, res) => {
      const {id} = req.params;
      const objectId = id
      const result = await listCollections.findOne({_id: objectId})
      res.send({
        success:true,
        result
      });
    });

    app.post('/lists', async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await listCollections.insertOne(data);

      res.send({
        success: true,
        result
      })
    })


    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('Connection is OK')
})

app.get('/lists', (req, res) => {
  res.send('List of proparties')
})

app.listen(port, () => {
  console.log(`Listning from ${port}`)
})
