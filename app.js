//declare variables for all the packages we are going to use
//require all of our modules
//declare package express
var express = require('express'),
//parses the body of a POST request, uses data submitted in forms
	bodyParser = require('body-parser'),
//embedded javascript, so we can respond to requests with HTMLish pages
	ejs = require('ejs'),
//so we can use PUT and DELETE methods 
	methodOverride = require('method-override'),
	pg = require('pg'),
	db = require('./models'),
// request = require('request'),
	session = require('express-session'),
  request = require('request'),
//declare express server(called app)
	app = express(),
  bcrypt = require('bcrypt');

//to use ejs templates in views folder, set view engine to be ejs
app.set('view engine', 'ejs');

//to set up body parser
app.use(bodyParser.urlencoded({extended: true}));

//to set up method override to work with POST requests that have the parameter "_method=DELETE"
app.use(methodOverride('_method'));

//Add middlewear
//create a session
//keeps track of what cookies belong to what people
app.use(session({
  secret: 'super secret',
  resave: false,
  saveUninitialized: true
}));
//can store user id in session object
//middlewear json object


//save user data for a session
//do after adding at top: var session = require("express-session")
  //middlewear:
  //next refers to the logic of our app sending back data
  //look up user by session, parse body by form, say static assets are here
  //before request gets to our route, do these things to the request
  //so we have access to them in our route
app.use("/", function (req, res, next) {

  req.login = function (user) {
    //attach login to req object
    req.session.userId = user.id;
    //stores user id on the session
    //log you in once, and store cookie on our end
    //server gives the cookie to the client
    //session knows what cookie belongs to what people
    //our server keeps track of what cookies belong to what person
  };

  req.currentUser = function () {
    //find is a class method bc its on the constructor User
    return db.User.
      find({ where: { id: req.session.userId } })
      .then(function (user) {
        req.user = user;
        return user;
      })
  };

  req.logout = function () {
    req.session.userId = null;
    req.user = null;
  }

  next();
  //do the next middlewear
});


//ADD POST ROUTES

//get all posts
app.get('/posts', function(req,res) {
  db.Post.findAll(
    // {include: [db.User]}
    )
    .then(function(dbMates){
    res.render('posts/posts', {ejsPosts: dbMates});
  })
});

//to make new post, retrieve form
app.get('/posts/new', function(req,res) {

  res.render('posts/new');
});

//submit new data, using post and .create method 
app.post('/posts', function(req,res) {
  var title = req.body.title;
  var content = req.body.content;
  var imageUrl = req.body.imageUrl;

  db.Post.create({title:title, content:content, imageUrl:imageUrl})
              .then(function(ejsPosts) {
                res.redirect('/posts');
              });
});


//get post by id using .find method
app.get('/posts/:id', function(req,res) {
  var postId = req.params.id;
  db.Post.find(postId)
              .then(function(banana) {
                res.render('posts/post', {ejsPost: banana});
              });
});


//get edit form by id
app.get("/posts/:id/edit", function (req, res) {
  var postId=req.params.id;
  db.Post.find(postId)
      .then(function(dbPost) {
        res.render('posts/edit', {ejsPost:dbPost});
      })
});

//update post form
app.put("/posts/:id", function(req, res) {
   var postId = req.params.id;
   var title = req.body.title;
   var content = req.body.content;
   var imageUrl = req.body.imageUrl; 

   db.Post.find(postId)
      .then(function(dbPost) {
        dbPost.updateAttributes({title:title, content:content, imageUrl:imageUrl})
        .then(function(dbPost) {
          res.redirect("/posts/" + postId);
        });
      });
});

//delete route
app.delete("/posts/:id", function(req, res) {
    var postId = req.params.id;
    db.Post.find(postId)
        .then(function(dbPost) {
          dbPost.destroy()
          .then(function() {
            res.redirect("/posts");
          });
        });
});

//ADD USER ROUTES
app.get('/', function (req, res) {
  res.render('index/index');
})


//get all users
app.get('/users', function(req,res) {
  db.User.all().then(function(dbUsers){
    res.render('users/users', {ejsUsers: dbUsers});
  })
});

//to make new user, retrieve form
app.get('/users/signup', function(req, res) {

  res.render('users/signup');
});

//user submits sign up form
//submit new data, using post and .create method 
app.post('/users', function(req, res) {

  var user = req.body.user;
  // var email = req.body.email;
  // var password_digest = req.body.password_digest;
  console.log("This is req.body " + req.body);
  db.User.createSecure(req.body.email, req.body.passwordDigest)
    // db.User.createSecure({email:email, password_digest:password_digest})
              .then(function() {
           // .then(function(ejsUsers) {
                res.render('users/users');
              });
});

//login
app.get("/users/login", function(req, res) {
    res.render('users/login');
});

app.post("/login", function(req, res) {
  var user = req.body.user;
  var email = req.body.email;
  var passwordDigest = req.body.password;

  db.User
    .authenticate(email, passwordDigest)
    .then(function (user) {
          res.send(user);
          res.redirect("/");
    });
});

//get user by id using .find method
app.get('/users/:id', function(req,res) {
  var userId = req.params.id;
  db.User.find(userId)
              .then(function(banana) {
                res.render('users/user', {ejsUser: banana});
              });
});


//get edit form by id
app.get("/users/:id/edit", function (req, res) {
  var userId=req.params.id;
  db.User.find(userId)
      .then(function(dbUser) {
        res.render('users/edit', {ejsUser: dbUser});
      })
});

//update user form
app.put("/users/:id", function(req, res) {
   var userId = req.params.id;
   var email = req.body.email;
   var password = req.body.password;

   db.User.find(userId)
      .then(function(dbUser) {
        dbUser.updateAttributes({email:email, passwordDigest:passwordDigest})
        .then(function(dbUser) {
          res.redirect("/users/" + userId);
        });
      });
});

//delete route
app.delete("/users/:id", function(req, res) {
    var userId = req.params.id;
    db.User.find(userId)
        .then(function(dbUser) {
          dbUser.destroy()
          .then(function() {
            res.redirect("/users");
          });
        });
});



// app.get('/sync', function(req, res) {
//   db.sequelize.sync().then(function() {
//     res.send("Sequelize Sync done!");
//   });
// });




//starts server on port 3000
app.listen(3000, function() {
	var msg = '* Listening on Port 3000 *';
});