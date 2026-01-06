const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.port || 3000;
require("dotenv").config();

/* ================== Middleware ================== */
app.use(cors({
  origin:[ 'http://localhost:5173','https://home-nest-ph-a-0010.netlify.app'],
  credentials: true
}));
app.use(express.json());

/* ================== Firebase Admin ================== */
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FB_PROJECT_ID,
    clientEmail: process.env.FB_CLIENT_EMAIL,
    privateKey: process.env.FB_PRIVATE_KEY,
  }),
});

/* ================== MongoDB ================== */
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.81efjl7.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

/* ================== Main ================== */
async function run() {
  try {
    const db = client.db('real-estate-db');
    const listCollections = db.collection('property_listing');
    const userCollection = db.collection('user');

    /* ================== Auth Middlewares ================== */
    const verifyToken = async (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];

      try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.decoded = decoded;
        next();
      } catch (err) {
        return res.status(401).send({ message: "Invalid token" });
      }
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const user = await userCollection.findOne({ email });

      if (!user || user.role !== "admin") {
        return res.status(403).send({ message: "Forbidden: Admin Only" });
      }
      next();
    };

    /* ================== User Role ================== */
    app.get('/user-role', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.status(400).send({ role: 'user' });
      }

      const user = await userCollection.findOne({ email });
      res.send({ role: user?.role || "user" });
    });

    /* ================== Properties ================== */
    app.get('/lists', async (req, res) => {
      const result = await listCollections.find().toArray();
      res.send(result);
    });

    app.get('/lists/:id', async (req, res) => {
      const objectId = new ObjectId(req.params.id);
      const result = await listCollections.findOne({ _id: objectId });
      res.send({ success: true, result });
    });

    app.post('/lists', async (req, res) => {
      const data = req.body;
      data._id = new ObjectId();
      const result = await listCollections.insertOne(data);
      res.send(result);
    });

    app.put('/lists/:id', async (req, res) => {
      const objectId = new ObjectId(req.params.id);
      const result = await listCollections.updateOne(
        { _id: objectId },
        { $set: req.body }
      );
      res.send({ success: true, result });
    });

    app.delete('/lists/:id', async (req, res) => {
      const result = await listCollections.deleteOne({
        _id: new ObjectId(req.params.id)
      });
      res.send({ success: true, result });
    });

    app.get('/myProperties', async (req, res) => {
      const email = req.query.email;
      const result = await listCollections.find({ user_email: email }).toArray();
      res.send(result);
    });

    app.get('/latest-property', async (req, res) => {
      const result = await listCollections
        .find()
        .sort({ posted_date: "desc" })
        .limit(10)
        .toArray();
      res.send(result);
    });

    app.get('/search', async (req, res) => {
      const { search, sort, minPrice, maxPrice } = req.query;

      let query = {};
      if (search) {
        query.$or = [
          { property_name: { $regex: search, $options: "i" } },
          { location: { $regex: search, $options: "i" } }
        ];
      }

      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseInt(minPrice);
        if (maxPrice) query.price.$lte = parseInt(maxPrice);
      }

      let cursor = listCollections.find(query);

      if (sort === "price-asc") cursor = cursor.sort({ price: 1 });
      if (sort === "price-desc") cursor = cursor.sort({ price: -1 });
      if (sort === "latest") cursor = cursor.sort({ posted_date: -1 });

      const result = await cursor.toArray();
      res.send(result);
    });



    /* ================== Users ================== */
    app.post('/user', async (req, res) => {
      try {
        const userData = req.body;
        const query = { email: userData.email };
        const existingUser = await userCollection.findOne(query);

        if (existingUser) {
          const result = await userCollection.updateOne(query, {
            $set: { last_loggedIn: new Date().toISOString() }
          });
          return res.send(result);
        }

        const newUser = {
          ...userData,
          role: 'user',
          created_at: new Date().toISOString(),
          last_loggedIn: new Date().toISOString(),
        };

        const result = await userCollection.insertOne(newUser);
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Server error" });
      }
    });

    app.get('/user', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    console.log("MongoDB connected successfully");
  } finally { }
}

run().catch(console.dir);

/* ================== Root ================== */
app.get('/', (req, res) => {
  res.send('Connection is OK');
});

app.listen(port, () => {
  console.log(`Listning from ${port}, server is ok`);
});
