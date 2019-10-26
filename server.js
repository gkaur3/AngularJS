const mongoose = require("mongoose");
const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
//so that express server can intercept the incomung request and find out the token is valid or not
const expressJwt= require("express-jwt");
//const db = require("./models/db.js");
//const user = require("./routes/user.js");
//const message = require("./routes/message.js");
//const messageDetails = require("./routes/messageDetails.js");
const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.use(express.static("public"));

var jwtSecret = "Marlabs$Piscatway&PleasantView$Edison";

//when the user is just visit the application, they don't have token, so because of this line, we don't look for token unless user signup
//app.use(expressJwt({secret:jwtSecret}).unless({path:['/', '/signup', '/login']}));

const conn_string = "mongodb://localhost:27017/usersDatabase";
mongoose.connect(conn_string, {useNewUrlParser:true})
.then( ()=>{     
    console.log("database connected!!");
})
.catch((exp)=>{   
    console.log(exp.message);
});

const userSchema = mongoose.Schema({
    "username":{
        type:String,
        required: [true, 'username must be provided'],
        unique: true
    },
    "password":{
        type:String,
        required: [true, 'password must be provided'],
    },
    "firstname":{
        type:String,
        required: [true, 'Firstname must be provided']
    },
    "lastname":{
        type:String,
        required: [true, 'lastname must be provided']
    },
     "phone":{  
        type:Number,
        required: [true, 'phone number must be provided'],
        unique:true
    },
    "gender":{
        type:String,
        required:true
    }   
});

const messageSchema = mongoose.Schema({
    "message_title":{
        type:String,
        required:[true,'message must have a title']
    },
    "message_body":{
        type:String,
    },
    "sender":{
        type:String,
    },
    "receiver":{
        type:String
    },
    "important":{
      type:Boolean,
      default:false
    }
});

const userModel = mongoose.model("usersData", userSchema);
const messageModel = mongoose.model("messagesData",messageSchema);
/* const msgDetail = mongoose.model("messageDetails", msgDetailSchema); */

app.get("/", (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


app.post('/signup', async (req, res) => {
  try {
    const values = req.body;
    var result = await userModel.find({ username: values.username, phone: values.phone });

    if (result.length > 0) {
      //console.log(result);
      res.status(400).send(res.message);
    } else {
      var myData = new userModel(req.body);
      myData.save()
        .then((item) => {
          res.status(200).send({ item });
        })
        .catch((err) => {
          res.status(400).send(err.message);
        });
    }
  } catch (exp) {
    console.log("exception");
    res.status(400).send(exp.message);
  }
}); 

app.post('/login', async(req,res)=>{
  try{
    const values = req.body;
    //console.log(" values "+ values);
    var item = await userModel.find({username:values.username, password:values.password});
    if(item){
        var token = jwt.sign({username:req.body.username}, jwtSecret); 
        res.status(200).send({token:token, username:req.body.username, item});  
    }
    else{
      console.log("exception frm server TRY block");
        res.status(400).send("username or password doesn't match");
    }
  }
  catch(exp){
    console.log("exception frm server catch block");
    res.status(400).send("error occured");
  }
});

/* app.get('/message/:id', messageDetails.getMessageDetails); */

app.use((req, res, next)=>{
  //console.log("request intercepted");
  //to validate the token coming along with the client reqest to the server. It can come in any of three formats
  var token = req.headers['token']|| req.body['token'] || req.params['token'] ||  req.headers['x-access-token'];
  //const data = decode(token, { header: true })
  //console.log("token="+token);
  if(!token){   // if token is there
    res.send();
  } 
  else{
    token = token.slice(1, token.length-1);
    //check validity of the token
    jwt.verify(token, jwtSecret, (err, decoded)=>{  // decoded contains the value of the first parameter i.e. object of .sign() function
      if(err){
        res.send("invalid token");
      }
      else{
        //console.log(decoded);
        req.decoded = decoded;
        next();
      }
    });
   
  }
  // now we need to send the token along with request. We want to validate token when user access product page, see the product.service.ts file
}); 

//to get the list of users
app.get("/sendMessage", async(req,res)=>{
  try{
     var username = await userModel.find({},{username:1, _id:0})
      if(username.length>0){
      res.status(200).send(username)
       }
    }
  catch(exp){
    res.status(400).send(exp.message);
  }
});

// to send the message to database
app.post('/sendMessage', async(req,res)=>{
  try{
    const message = new messageModel(req.body);
    const saveMessage = message.save() ;
    if(saveMessage){
      res.status(200).send({saveMessage});
    }
    else{
      res.status(400).send("error occured while saving message");
    }

  }
  catch(exp){
    res.status(400).send("error occurred from server"+exp.message);
  }
});

// to get the messages for the loggedIn user
app.get('/messages', async (req,resp)=>{
  try {
    var username = req.decoded.username
    //console.log(valueInQuery);
    var messages = await messageModel.find({receiver: username});
    //console.log(messages);
    if (messages.length > 0) {
      console.log(messages);
      resp.status(200).send({messages});
    }
    else {
      resp.status(400).send("message not found");
    }
  }
  catch(exp){
    resp.status(400).send(exp.message);
  }
}); 


// to delete a message
app.delete("/messages/:_id", async(req,resp)=>{
  try{
    var id = req.params;
    //.log(req.params);
    var findMessage = await messageModel.findOneAndDelete({_id :id})
    if(findMessage){
        resp.status(200).send();
      }
  }
  catch(exp){
      resp.status(400).send(exp.message);
  }
  
});

// to get messages details
app.get("/messages/:_id", async(req,resp)=>{
  try{
      var valuesInRequest=req.params._id;
      //console.log("values"+req.params._id);
      var findMessage= await messageModel.find({_id: valuesInRequest });
      if(findMessage.length>0){
        console.log("from get request of messageDetails"+ findMessage);
        resp.status(200).send({findMessage});
      }
  }
  catch(exp){
        resp.status(400).send(exp.message);
  }
});

//to mark important
app.post("/messages/:_id", async(req,resp)=>{
  try{
    var values = req.body.headers._id;
    //console.log("VALUEs"+ values);
    var messageToMarkImportant = await messageModel.findById({"_id":values}, function(err,message){
        message.important = ! message.important;
        message.save(function (err, updatedMessage){
            resp.status(200).send(updatedMessage);
        });
    })
      //console.log(messageToMarkImportant);  
    /* if(messageToMarkImportant){
      console.log(messageToMarkImportant+"!!!!++++++____");
      resp.status(200).send(messageToMarkImportant);
    }
    else{
      console.log("NOTHING!!!!!!!");
    } */
  }
  catch(exp){
    resp.status(400).send();
  }
});

/* app.get("/sendMessage", async(req,resp)=>{
  try{
    var valuesInRequest = req.params.messageData.receiver;
    console.log(valuesInRequest);
    var receiver = await userModel.find({username: valuesInRequest.receiver});
    if(receiver){
      resp.status(200).send(receiver);
    }
    else{
      console.log("error occurred");
    }
  }
    catch(err){
      resp.status(400).send(err.message);
    }
}); */

const port = process.env.PORT || 3000;
app.listen(port, ()=>{
    console.log("abc+ server running @ localhost:"+port);
});