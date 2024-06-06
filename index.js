const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 5000;

const app = express();

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l574mko.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    app.get("/", (req, res) => {
      res.send("Hello From Real State!!!!!!!!");
    });

    // All Collection
    const usersCollection = client.db("EliteProperty").collection("users");
    const propertiesCollection = client
      .db("EliteProperty")
      .collection("properties");
    const wishListCollection = client
      .db("EliteProperty")
      .collection("wishList");

    //Verify Token
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // Create Token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "30d",
      });
      res.send({ token: token });
    });

    //save login user
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log("info", user);
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Get User role
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

    // Get all property for All
    app.get("/property", async (req, res) => {
      const result = await propertiesCollection
        .find({ status: "verified" })
        .toArray();
      res.send(result);
    });

    // Get a single Property for All
    app.get("/property/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await propertiesCollection.findOne(query);
      res.send(result);
    });

    //USER

    // Add to wishlist By user
    app.post("/property/wishlist", async (req, res) => {
      const property = req.body;
      const existWishProperty = await wishListCollection.findOne({
        email: req.body?.email,
      });
      if (existWishProperty) {
        return res.send({
          message: "This Property already exists in wishlist!!!!!",
          insertedId: null,
        });
      }
      const result = await wishListCollection.insertOne(property);
      res.send(result);
    });

    // Get all added wishlist bu user
    app.get("/property/wishList/:email", async (req, res) => {
      const result = await wishListCollection
        .find({ email: req.params.email })
        .toArray();
      res.send(result);
    });

     // Delete wishlist by user
     app.delete("/property/wishList/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishListCollection.deleteOne(query);
      res.send(result);
    });

    //AGENT

    //Post a Property by Agent
    app.post("/property", async (req, res) => {
      const property = req.body;
      const result = await propertiesCollection.insertOne(property);
      res.send(result);
    });

    // Get all added property by agent
    app.get("/myAddedProperty/:email", async (req, res) => {
      console.log(req.params.email);
      const result = await propertiesCollection
        .find({ agent_email: req.params.email })
        .toArray();
      res.send(result);
    });

    // Update a added property By Agent
    app.put("/property/:id", async (req, res) => {
      const id = req.params.id;
      console.log(req.body);
      const filter = { _id: new ObjectId(id) };
      const updateDocument = {
        $set: {
          agent_name: req.body?.agent_name,
          agent_email: req.body?.agent_email,
          property_title: req.body?.property_title,
          location: req.body?.location,
          price_range: req.body?.price_range,
          agent_image: req.body?.agent_image,
          status: req.body?.status,
        },
      };
      const updatedResult = await propertiesCollection.updateOne(
        filter,
        updateDocument
      );
      res.send(updatedResult);
    });

    // Delete by agent
    app.delete("/property/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await propertiesCollection.deleteOne(query);
      res.send(result);
    });

    //ADMIN

    //get all Property data
    app.get("/allProperty", async (req, res) => {
      const result = await propertiesCollection.find().toArray();
      res.send(result);
    });

    //Update status to verified
    app.patch("/property/:id", async (req, res) => {
      const id = req.params.id;
      console.log(req.body);
      const filter = { _id: new ObjectId(id) };
      const updateDocument = {
        $set: {
          status: req.body?.status,
        },
      };
      const updatedResult = await propertiesCollection.updateOne(
        filter,
        updateDocument
      );
      res.send(updatedResult);
    });

    //get All user data
    app.get("/allUser", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // Update user role
    app.patch("/user/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      // console.log(req.body);
      const filter = { _id: new ObjectId(id) };
      const updateDocument = {
        $set: {
          role: req.body.role,
        },
      };
      const updatedResult = await usersCollection.updateOne(
        filter,
        updateDocument
      );
      res.send(updatedResult);
    });

    // Delete a user by admin
    app.delete("/user/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //   await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
