const mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

const bcrypt = require('bcrypt-nodejs');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: {type:String},
    email: {type:String},
    contactno: {type:String},
    bankaccno: {type:String},
    bankname: {type:String},  
    username: {type:String},
    password: {type:String},
    usertype: {type:String},  
    status: {type:String},  
    lastlogin: {type:Date},
    balance: {type:Number}
});

// Pre-save of user's hash password to database
UserSchema.pre('save', function (next) {
    const user = this,
      SALT_FACTOR = 5;
  
    if (!user.isModified('password')) return next();
  
    bcrypt.genSalt(SALT_FACTOR, (err, salt) => {
      if (err) return next(err);
  
      bcrypt.hash(user.password, salt, null, (err, hash) => {
        if (err) return next(err);
        user.password = hash;
        next();
      });
    });
  });

  // Method to compare password for login
UserSchema.methods.comparePassword = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
      if (err) { return cb(err); }
  
      cb(null, isMatch);
    });
  };

UserSchema.plugin(mongoosePaginate);
UserSchema.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model('user', UserSchema, 'user');