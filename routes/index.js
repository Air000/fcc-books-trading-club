var express = require('express');
var router = express.Router();
var User = require("../routes/models/user");

module.exports = function(passport) {
    /* GET home page. */
    router.get('/', function(req, res, next) {
      res.render('index', { user: req.user });
    });
    
    router.get('/setting', function(req, res) {
        if(req.user) {
            User.findOne({'twitter.username': req.user.twitter.username}, function(err, user) {
              if(err) console.log(err);
              
              res.render('setting_page', { user: req.user ,personInfo: user.personInfo });
            });
        }else {
            res.render('index', {user: req.user});
        }    
      
        
    });
    
    router.get('/mybooks', function(req, res) {
        
        res.render('mybooks', {user: req.user});
    });
    router.post('/update_setting', function(req, res) {
        console.log(req.body);
        var updateInfo = req.body;
        User.findOneAndUpdate({'twitter.username': req.user.twitter.username}, {
            $set: { personInfo: updateInfo
                }
            }, {returnNewDocument: true}, function(err, ret) {
                if(err) console.log("err: ", err);
                res.render('setting_page', { user: req.user ,personInfo: updateInfo });
            });
        
        
    })
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
}


// module.exports = router;
