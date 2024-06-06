const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

// Middleware to handle Cross-Origin Resource Sharing
app.use(cors());
// Parse incoming requests with JSON payloads
app.use(express.json());

//routes

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.binqvht.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  const menuCollection = client.db("kfcData").collection("setMenu");
  const cartCollection = client.db("kfcData").collection("cart");
  const userCollection = client.db("kfcData").collection("users");
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    //! Get Data From 1
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    //! Cart post 1.1
    app.post("/cart", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });

    //! Cart Get 2
    app.get("/cart", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    //! Cart Delete 3
    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await cartCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    });

    //? Save User info to Database
    //! User Post -4
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ Message: "User Already Exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    //! middleware - varify token - 10
    const verifyToken = (req, res, next) => {
      console.log(81, "Inside verify Token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      // console.log(86, token);
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) => {
        if (err) {
          return res.status(401).send({ message: "Invalid token" });
        }
        req.decode = decode;
        next();
      });
    };

    //!varify Admin - 12
    const verifyAdmin = async (req, res, next) => {
      const email = req.decode.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //! User Get - 5
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      console.log(req.headers);
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //! User delete - 6
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    //! User patch - 7
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const update = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, update);
        res.send(result);
      }
    );

    //todo Check  User admin or not get - 8
    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    //! JWT related API: POST - 9
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("User Token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //! Check admin or Not admin - 11
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params?.email;
      console.log(145, email);
      if (email !== req.decode.email) {
        return res.status(403).send({ message: "Unauthorized access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    //! ADD item Post -13
    app.post("/menu", async (req, res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
    });

    //! Manage Item delete - 14
    app.delete("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await menuCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    });
    //! Upadate Item - GET -  for specific ID - 15
    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await menuCollection.findOne(query);
      res.send(result);
    });

    //! Update Item Patch - 16
    app.patch("/menu/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: {
          name: item.name,
          description: item.description,
          price: item.price,
          image: item.image,
        },
      };
      const result = await menuCollection.updateOne(filter, update);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//
app.get("/", (req, res) => {
  res.send("KFC SERVER ON");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

//kfcAdmin
//YLP2WysIFv8YBhp2
