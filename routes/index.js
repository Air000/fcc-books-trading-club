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
        // var myAllBooks = {};
        // var myRequests = {};
        // var requestsForMe = {};
          
        packedBooksForUser(req.user, function(err, packedData) {
            if(err){
                console.log(err);
                res.status(400);
                res.send("packedBooksForUser() failed!");
            }else{
               
                res.render('books_manage', packedData);
            }
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
    //   console.log(req.body);
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
    
    router.post('/answerForRequest', isLoggedIn, function(req, res) {
        answerForBook(req.body, req.user, function(err, doc) {
           if(err) {
               console.log("answerForBook err:", err);
               res.status(400);
               res.send("answer for book failed!");
           } else {
               packedBooksForUser(req.user, function(err, packedData) {
                   if(err) console.log(err);
                   
                   res.send(packedData);
               });
               
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
    res.redirect('/auth/twitter');
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

function answerForBook(data, user, cb) {
    var bookToUpdate = data.book;
    var action  = data.action;
    
    console.log("answerForBook1", bookToUpdate, action);
    
    if(bookToUpdate.bookInfo.currentState.owner === user.twitter.username && 
       bookToUpdate.bookInfo.currentState.isOnTrading) {
        
        if(action === "approve") {
            bookToUpdate.bookInfo.currentState.preOwner = bookToUpdate.bookInfo.currentState.owner;
            bookToUpdate.bookInfo.currentState.owner = bookToUpdate.bookInfo.currentState.requestBy;
            bookToUpdate.bookInfo.currentState.isOnTrading = false;

            bookToUpdate.tradeRecords[bookToUpdate.tradeRecords.length - 1].state = "approved";
            bookToUpdate.tradeRecords[bookToUpdate.tradeRecords.length - 1].endTimeStamp = new Date();
            Book.findOneAndUpdate({_id: bookToUpdate._id}, bookToUpdate,
                {'new': true}, function(err, newDoc) {
                    if(err) console.log(err);
                    
                    cb(err, newDoc);
                    console.log(newDoc);
                });
        }else if(action === "disapprove") {
            bookToUpdate.bookInfo.currentState.isOnTrading = false;

            bookToUpdate.tradeRecords[bookToUpdate.tradeRecords.length - 1].state = "disapproved";
            bookToUpdate.tradeRecords[bookToUpdate.tradeRecords.length - 1].endTimeStamp = new Date();
            Book.findOneAndUpdate({_id: bookToUpdate._id}, bookToUpdate,
                {'new': true}, function(err, newDoc) {
                    if(err) console.log(err);
                    
                    cb(err, newDoc);
                    console.log(newDoc);
                });
        }
                    
    } else {
        console.log("Error permission!");
        cb("Error permission!");
    }
    
}

function packedBooksForUser(user, cb) {
    var myAllBooks = {};
    var myRequests = {};
    var requestsForMe = {};
    
    Book.find({'bookInfo.currentState.owner': user.twitter.username}, function(err, myBooks) {
          if(err){ 
              console.log(err);
              cb(err); 
          }else {
              myAllBooks = myBooks;
              Book.find({'tradeRecords.requestByUser': user.twitter.username}, function(err, myReq) {
                  if(err){ 
                      console.log(err);
                      cb(err);  
                  }else {
                    myRequests = myReq;
                  
                    Book.find({'tradeRecords.requestFromOwner': user.twitter.username}, function(err, reqForMe) {
                        if(err){ 
                          console.log(err);
                          cb(err);   
                        }else {
                            requestsForMe = reqForMe;
                            // console.log("mybooks" , myAllBooks.length, JSON.stringify(myAllBooks) );
                            // console.log("myRequests", myRequests.length, JSON.stringify(myRequests) );
                            // console.log("requestForMe", requestsForMe.length, JSON.stringify(requestsForMe) );
                            cb(err, {user: user, 
                                    myBooks: myAllBooks, 
                                    myRequests: myRequests,
                                    requestsForMe: requestsForMe
                            });
                        }
                    })  
                  }
              })
          }
        });
}