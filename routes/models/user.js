// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for our user model
var userSchema = mongoose.Schema({

    twitter          : {
        id           : String,
        token        : String,
        displayName  : String,
        username     : String
    },
    
    personInfo       : {
        fullName     : String,
        city         : String,
        state        : String
    },
    
    myBookManege     : {
        myRequest    : [{
            volumeId : String,
            state    : {type: String, enum: ['pending', 'approved', 'disapproved']}
        }],
        
        requestForMe : [{
            volumeId : String,
            state    : {type: String, enum: ['pending', 'approved', 'disapproved']}
        }]
    }
    

});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('BookTradeUser', userSchema);