// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for our book model
var bookSchema = mongoose.Schema({
    
    bookInfo    : {
        volumeId    : {type: String, required: true},
        bookName    : {type: String, required: true},
        coverUrl    : String,
        firstOwner  : {type: String, required: true},
        addOnDate   : {type: String, required: true},
        currentState    : {
            preOwner    : {type: String, default: "Google Books API"},
            owner       : {type: String, required: true},    // owner changed when trading approved
            requestBy   : String,    //username, only can request by one user at one time
            isOnTrading : {type: Boolean, default: false},
            requestTimeStamp: Date
            
        }
        
    },
    
    tradeRecords   : [{
        requestTimeStamp    : Date,
        requestByUser       : String,
        requestFromOwner    : String,
        state               : {type: String, enum: ['pending', 'approved', 'disapproved']}, //pending, approved, unapproved
        endTimeStamp        : Date    //aproved or unapproved timestamp
    }]
});    

module.exports = mongoose.model('Book', bookSchema);