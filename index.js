const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = 3000


const admin = require("firebase-admin");

const decoded = Buffer.from(process.env.FB_SERVICE_KEY , 'base64').toString('utf8')
const serviceAccount = JSON.parse(decoded);




// middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://eventra-00.web.app'],
  credentials: true
}));
app.use(express.json())


// jwt middleware
const verifyFirebaseToken = async(req , res , next)=>{
  const authHeader = req?.headers.authorization;
  if(!authHeader || !authHeader.startsWith('Bearer ')){
    return res.status(401).send({message : 'unauthorized access'})
  }
  const token = authHeader.split(' ')[1]
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.decoded = decoded ;
    next()
  } catch (error) {
    return res.status(401).send({message : 'unauthorized access'})
  }
  
}


const verifyTokenEmail = (req , res , next)=>{
  if(req.query.email !== req.decoded.email){
    return res.status(403).send({message:'forbidden access'})
  }
  next();
}



// firebase initilize

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vlrcl7k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



async function run() {
  try {
    
    
    const database = client.db("eventraData");
    const eventCollection = database.collection("eventCollection");
    const joinedEventCollection = database.collection("joinedEventCollection");




    app.get("/events", async(req , res)=>{
        const result = await eventCollection.find().toArray() || {};
        res.send(result)
    });

    app.get("/upcomingEvents", async(req , res)=>{
        // const today = new Date().toLocaleDateString('sv-SE');
        const today = new Date();
        today.setDate(today.getDate() - 1)
        // today.setHours(0,0,0,0)
        const query = {eventDate: {$gte : today}}
        const result = await eventCollection.find(query).toArray() || {};
        res.send(result)
    });

    app.get("/allEvents", async(req , res)=>{
      const result = await eventCollection.find().toArray() || {};
      res.send(result)
    })

    app.get("/eventDetails/:id",verifyFirebaseToken,async(req , res)=>{
        const id = req.params.id ;
        const query = {_id : new ObjectId(id)};
        const result = await eventCollection.findOne(query);
        res.send(result)
    });


    app.get("/manageEvents",verifyFirebaseToken, verifyTokenEmail, async(req , res)=>{
        const email = req.query.email ;
        const query = {userEmail : email};
        const result = await eventCollection.find(query).toArray();
        res.send(result)
    });

    app.get("/upcomingEventsByCategory", async(req , res)=>{
      const category = req.query.category ;
      const query = {
        eventType:{$regex: new RegExp(`^${category}$`, "i")}
      }
      const result = await eventCollection.find(query).toArray();
      res.send(result);
    });


    app.get("/upcomingEventsByTitle", async(req , res)=>{
      const title = req.query.title ;
      const query = {
        eventTitle:{$regex: new RegExp(title, "i")}
      }
      const result = await eventCollection.find(query).toArray();
      res.send(result);
    })

    app.post("/events", verifyFirebaseToken, async(req , res)=>{
        const doc = req.body;
        doc.eventDate = new Date(doc.eventDate);
        const result = await eventCollection.insertOne(doc);
        res.send(result);
    });
    


    app.put("/events/:id", verifyFirebaseToken , async(req , res)=>{
      const id = req.params.id ;
      const filter  = {_id : new ObjectId(id)}
       const options = { upsert: true };
       const updatedData = req.body ;
       updatedData.eventDate = new Date(updatedData.eventDate)
       const updateDoc = {
        $set: updatedData
       }
       const result = await eventCollection.updateOne(filter, updateDoc , options);
       res.send(result)
    })



    app.delete("/events/:id",verifyFirebaseToken,async(req , res)=>{
      const id = req.params.id ;
      const query = {_id : new ObjectId(id)}
      const result = await eventCollection.deleteOne(query)
      res.send(result)
    });


    app.get("/joinedEvents", verifyFirebaseToken , verifyTokenEmail, async(req , res)=>{
      const email = req.query.email ;

      const query = {userEmail : email};
      const result = await joinedEventCollection.find(query).sort({eventDate: 1}).toArray() || {};
      res.send(result)
    })


    app.post("/joinedEvents",verifyFirebaseToken,async(req , res)=>{
      const doc = req.body ;
      const result = await joinedEventCollection.insertOne(doc);
      res.send(result)
    })



  
    
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Eventra is running on port ${port}`)
})