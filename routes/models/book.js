// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for our book model
var bookSchema = mongoose.Schema({
    
    bookInfo    : {
        volumeId    : String,
        bookName    : String,
        coverUrl    : String,
        firstOwner  : String,
        addOnDate   : Date,
        currentState    : {
            preOwner    : String,
            owner       : String,    // owner changed when trading approved
            requestBy   : String,    //username, only can request by one user at one time
            isOnTrading   : Boolean,
            requestTimeStamp: Date
            
        }
        
    },
    
    tradeRecords   : [{
        requestTimeStamp    : Date,
        requestByUser       : String,
        requestFromOwner    : String,
        state               : String, //pending, approved, unapproved
        endTimeStamp        : Date    //aproved or unapproved timestamp
    }]
});    

module.exports = mongoose.model('Book', bookSchema);