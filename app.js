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
  bcrypt = require('bcrypt'),
  env = process.env,
  client_id = env.CLIENT_ID,
  client_secret = env.CLIENT_SECRET;

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
    // Remember who is logged in
    req.session.userId = user.id;
    console.log('\n\n\n\n\n\n\n\n\n\n' + req.session.userId);
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
      res.render('posts/posts', {ejsPosts: dbMates, userId: req.session.userId });
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

  db.Post.create({title:title, content:content})
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
        if (currentUser === post.user) {
         res.render('posts/edit', {ejsPost:dbPost})
        } else {
         res.send("You cannot edit this post");
        }
      })
});

//update post form
app.put("/posts/:id", function(req, res) {
   var postId = req.params.id;
   var title = req.body.title;
   var content = req.body.content;

   db.Post.find(postId)
      .then(function(dbPost) {
        if (currentUser === post.user) {
          dbPost.updateAttributes({title:title, content:content})
          .then(function(dbPost) {
          res.redirect("/posts/" + postId);
          })
        } else {
          res.send("You cannot edit this post");
        }
      });
});

//delete route
app.delete("/posts/:id", function(req, res) {
    var postId = req.params.id;
    // db.Post.find(postId)
    //     .then(function(dbPost) {
    //       if (currentUser === post.user) {
    //         dbPost.destroy()
    //         .then(function() {
    //           res.redirect("/posts");
    //         });
    //       } else {
    //         res.redirect('/');
    //       }
    //     });

    // Find post
    db.Post.find(postId).then(function(post) {
      // Authorize user (only allowed if post belongs to user)
      if (post.UserId === req.session.userId) {
        // Destroy post
        post.destroy().then(function() {
          // Redirect once destroyed
          res.redirect('/posts');
        });
      } else {
        res.send('Go away hacker!');
      }
    });
});

//ADD USER ROUTES
app.get('/', function (req, res) {
  // check for logged in user
  req.currentUser().then(function(user) {
    // if a user is logged in, render the home page and pass that user to the index
    // inside of variable named user
    if (user) {
        res.render('index/index', {user: user});
    // otherwise (if user is not logged in) render the home page and set user to null
    } else {
        res.render('index/index', {user: null});
    }
  }) 
})


// //get all users
app.get('/users', function(req,res) {
  db.User.all().then(function(dbUsers){
    res.render('users/users', {ejsUsers: dbUsers});
  })
});

//to make new user, retrieve form
app.get('/signup', function(req, res) {
  // Run currentUser function to see if anyone is already logged in
  req.currentUser().then(function(user) {
    // conditional to determine if someone is logged in do A, else do B
    if (user) {
      // if a user is logged in, log user out and redirect to signup
      req.logout();
      res.redirect('/signup');
    } else {
      res.render('users/signup');
    }
  })
});

//user submits sign up form
//submit new data, using post and .create method 
app.post('/users', function(req, res) {

  var user = req.body.user;
  // var email = req.body.email;
  // var password_digest = req.body.password_digest;
  console.log("This is req.body " + req.body);
  db.User.createSecure(req.body.email, req.body.passwordDigest)
  // create a user then pass the created user to a function (below)
    .then(function(user) {
      // login user that we just created
      req.login(user);
      // render home page and pass logged in user to that page
      res.render("index/index", {user: user});
    });
});

//login
app.get("/login", function(req, res) {
    res.render('users/login');
});

app.post("/login", function(req, res) {
  var user = req.body.user;
  var email = req.body.email;
  var passwordDigest = req.body.password;

  db.User
    .authenticate(email, passwordDigest)
    .then(function (user) {
      req.login(user);
      // once user is logged in, render home page and pass logged in user to 
      // the home page inside of user variable
      res.render("index/index", {user:user});
    });
});

//logout
app.delete('/logout', function(req,res){
  req.logout();
  res.redirect('/login');
});


//get user by id using .find method
app.get('/users/:id', function(req,res) {
  var userId = req.params.id;
  db.User.find(userId)
              .then(function(banana) {
                res.render('users/user', {ejsUser: banana});
              });
});


// app.get('/signup', function(req,res) {
//     res.render('signup')});
              



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

app.get('/search', function(req, res) {
  var q = req.query.q;

  if (q) {
    var url = 'https://api.foursquare.com/v2/venues/search?client_id='+client_id+'&client_secret='+client_secret+'&v=20130815&near=' + q 
    // + '&query=landmark'
    ;

    request(url, function(error, response, body) {
      var venues = JSON.parse(body).response.venues;
      console.log(venues);
      res.render('index/search', { noHappyHours: false, venues: venues, userId: req.session.userId });
    });
  } else {
    res.render('index/search', { noHappyHours: true, userId: req.session.userId });
  }
});


//submit new data, using post and .create method 
app.post('/search', function(req,res) {
  var title = req.body.title;
  var content = req.body.content;
  // var userId = req.session.userId; 

  // db.Post.create({ title: title, content: content, UserId: userId })
  //   .then(function) {

  //   }
  req.currentUser().then(function(user) {
    //gets current user
  console.log('this is a user');
  console.log(user);
  db.Post.create({ title: title, content: content, UserId: user.id })
  //calling line 61
    .then(function(title) {
      res.redirect('posts');
    });
  });
});



app.listen(process.env.PORT || 3000)



