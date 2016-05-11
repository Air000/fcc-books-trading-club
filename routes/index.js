var express = require('express');
var request = require("request");
var router = express.Router();
var User = require("../routes/models/user");
var Book = require("../routes/models/book");

module.exports = function(passport) {
    /* GET home page. */
    router.get('/', function(req, res, next) {
      Book.find({}, function(err, allBooks) {
          if(err)console.log(err);
          res.render('index', { user: req.user || null, allBooks: allBooks });
      });    
    });
    
    router.get('/setting', isLoggedIn ,function(req, res) {
        if(req.user) {
            User.findOne({'twitter.username': req.user.twitter.username}, function(err, user) {
              if(err) console.log(err);
              
              res.render('setting_page', { user: req.user ,personInfo: user.personInfo });
            });
        }else {
            res.render('index', {user: req.user});
        }    
      
        
    });
    
    router.get('/mybooks', isLoggedIn, function(req, res) {
        Book.find({'bookInfo.currentState.owner': req.user.twitter.username}, function(err, myBooks) {
           if(err)console.log(err);
           res.render('mybooks', {user: req.user, myBooks: myBooks});
        });
        
    });
    router.post('/update_setting', isLoggedIn, function(req, res) {
        console.log(req.body);
        var updateInfo = req.body;
        User.findOneAndUpdate({'twitter.username': req.user.twitter.username}, {
            $set: { personInfo: updateInfo
                }
            }, {returnNewDocument: true}, function(err, ret) {
                if(err) console.log("err: ", err);
                res.render('setting_page', { user: req.user ,personInfo: updateInfo });
            });
        
        
    });
    
    router.post('/addbook', isLoggedIn, function(req, res) {
        var url = "https://www.googleapis.com/books/v1/volumes?q=" + req.body.bookQuery;
        console.log(url);
        request({
            url: url,
            json: true
            }, function (error, response, body) {
          if (error || response.statusCode != 200) 
            console.log(response.statusCode, error);
          
          console.log(JSON.stringify(body.items[0]));
          
          var newBook = new Book({
            bookInfo    : {
                volumeId    : body.items[0].id,
                bookName    : body.items[0].volumeInfo.title,
                coverUrl    : body.items[0].volumeInfo.imageLinks?body.items[0].volumeInfo.imageLinks.thumbnail:"",
                firstOwner  : req.user.twitter.username,
                addOnDate   : new Date(),
                currentState    : {
                    preOwner    : "Google Books API",
                    owner       : req.user.twitter.username,    // owner changed when trading approved
                    requestBy   : null,    //username, only can request by one user at one time
                    isOnTrading   : false,
                    requestTimeStamp: null
                    
                }
                
            }
          });
          
          console.log(JSON.stringify(newBook));
          newBook.save(function(err) {
              if(err)console.log(err);
              
              res.send(newBook);
          });
           
        });
       
    });
    
    router.post('/requestBook', isLoggedIn, function(req, res){
       console.log(req.body);
       res.send("OK");
    });
    // route for twitter authentication and login
    router.get('/auth/twitter', passport.authenticate('twitter'));
    
    // handle the callback after twitter has authenticated the user
    router.get('/auth/twitter/callback',
        passport.authenticate('twitter', {
            successRedirect : '/',
            failureRedirect : '/'
        }));
        
    router.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });    
    
    return router;
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.status(400);
    res.send("Please login for booking!");
    // res.redirect('/auth/twitter');
}
