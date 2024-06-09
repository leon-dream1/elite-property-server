const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
    const offersCollection = client.db("EliteProperty").collection("offers");
    const soldPropertyCollection = client
      .db("EliteProperty")
      .collection("soldProperty");

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

    // Get all property for All user
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
      console.log(property);
      const existWishProperty = await wishListCollection.findOne({
        wish_property_id: req.body?.wish_property_id,
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

    // get a single wishlist
    app.get("/offerProperty/wishList/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishListCollection.findOne(query);
      res.send(result);
    });

    // offer post by user
    app.post("/propertyOffer", async (req, res) => {
      const offer = req.body;
      const existWishProperty = await offersCollection.findOne({
        offer_property_id: req.body?.offer_property_id,
      });
      if (existWishProperty) {
        return res.send({
          message:
            "You already give a offer for this property!!! Wait for agent approval!!!",
          insertedId: null,
        });
      }
      const result = await offersCollection.insertOne(offer);
      res.send(result);
    });

    // get all property that is offer by user
    app.get("/propertyOffer/:email", async (req, res) => {
      const query = { buyer_email: req?.params?.email };
      const result = await offersCollection.find(query).toArray();
      res.send(result);
    });

    // get a property that is payable or accepted by agent
    app.get("/propertyOffer/payable/:id", async (req, res) => {
      const query = { _id: new ObjectId(req?.params?.id) };
      const result = await offersCollection.findOne(query);
      res.send(result);
    });

    // Delete wishlist by user
    app.delete("/property/wishList/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishListCollection.deleteOne(query);
      res.send(result);
    });

    // create-payment-intent for user
    app.post("/create-payment-intent", async (req, res) => {
      const price = req.body.price;
      console.log(price);
      const priceInCent = parseFloat(price) * 100;
      if (!price || priceInCent < 1) res.send("price nai");

      // generate clientSecret
      const { client_secret } = await stripe.paymentIntents.create({
        amount: priceInCent,
        currency: "usd",
        // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
        automatic_payment_methods: {
          enabled: true,
        },
      });
      // send client secret as response
      res.send({ clientSecret: client_secret });
    });

    //save bought property
    app.post("/soldProperty", async (req, res) => {
      const soldPropertyData = req.body;
      const result = await soldPropertyCollection.insertOne(soldPropertyData);

      if (result?.insertedId) {
        const filter = { _id: new ObjectId(req.body?.offer_property_id) };
        const updateDocument = {
          $set: {
            status: "sold",
          },
        };
        const updatedResult = await propertiesCollection.updateOne(
          filter,
          updateDocument
        );
        res.send(updatedResult);
      }
    });

    // update status accepted to bought

    app.patch("/soldProperty/:id", async (req, res) => {
      const id = req.params.id;
      console.log(req.body);
      const filter = { _id: new ObjectId(id) };
      const updateDocument = {
        $set: {
          status: req.body?.status,
          transactionId: req.body?.transactionId,
        },
      };
      const updatedResult = await offersCollection.updateOne(
        filter,
        updateDocument
      );
      console.log(updatedResult);
      res.send(updatedResult);
    });

    // remove  this bought property from wishlist
    app.delete("/soldProperty/:id", async (req, res) => {
      const id = req.params.id;
      const query = { wish_property_id: id };
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

    //  Requested Property
    app.get("/requestedProperty", async (req, res) => {
      const result = await offersCollection.find().toArray();
      res.send(result);
    });

    // Sold properties
    app.get("/mySoldProperty/:email", async (req, res) => {
      const result = await soldPropertyCollection
        .find({ agent_email: req.params?.email })
        .toArray();
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

    // Update Request Property status
    app.patch("/requestProperty/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDocument = {
        $set: {
          status: req.body?.status,
        },
      };
      const updatedResult = await offersCollection.updateOne(
        filter,
        updateDocument
      );
      res.send(updatedResult);
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
