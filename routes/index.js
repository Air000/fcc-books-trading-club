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
    
    router.get('/books_manage', isLoggedIn, function(req, res) {
        Book.find({'bookInfo.currentState.owner': req.user.twitter.username}, function(err, myBooks) {
           if(err)console.log(err);
           res.render('books_manage', {user: req.user, myBooks: myBooks});
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
        
          var newBook = {
            bookInfo    : {
                volumeId    : body.items[0].id,
                bookName    : body.items[0].volumeInfo.title,
                coverUrl    : body.items[0].volumeInfo.imageLinks?body.items[0].volumeInfo.imageLinks.thumbnail:"",
                firstOwner  : req.user.twitter.username,
                addOnDate   : new Date(),
                currentState    : {
                    owner       : req.user.twitter.username,    // owner changed when trading approved
                }  
            }
          };
          addBookFromGoogle(newBook, function(err, bookAdded) {
              if(err)console.log(err);
              
              res.send(bookAdded);
          });
           
        });
       
    });
    
    router.post('/requestBook', isLoggedIn, function(req, res){
       console.log(req.body);
       requestForBook(req.body, req.user, function(err, doc){
            if(err){
                console.log(err);
                res.status(400);
                res.send("request book failed!");
            }else{
               
                res.send(doc);
            }
           
       });
       
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

function addBookFromGoogle(book, cb) {
    var newBook = new Book(book);
    newBook.save(function(err, bookAdded) {
        cb(err, bookAdded);
    });
}

function requestForBook(book, user, cb) {
    var newRecord = {
        requestTimeStamp    : new Date(),
        requestByUser       : user.twitter.username,
        requestFromOwner    : book.bookInfo.currentState.owner,
        state               : "pending", //pending, approved, unapproved
        endTimeStamp        : null    //aproved or unapproved timestamp
    };
    
    Book.findOneAndUpdate({_id: book._id}, {
        $push: {tradeRecords: newRecord},
        $set:  {
            'bookInfo.currentState.requestBy': user.twitter.username,
            'bookInfo.currentState.isOnTrading': true,
            'bookInfo.currentState.requestTimeStamp': new Date()
        }
    }, {'new': true}, function(err, newDoc) {
        if(err) console.log(err);
        
        cb(err, newDoc);
        console.log(newDoc);
    });
}