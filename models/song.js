const mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

const Schema = mongoose.Schema;

const SongSchema = new Schema({
    labelid: {type:String, required: true},
    artistid: {type:String, required: true},
    albumid: {type:String, required: true},
    songname: {type:String, required: true},
    songlyric: {type:String, required: true},
    songgenre: {type:String, required: true},
    songrate: {type:Number, required: true},
    songprice: {type:Number, required: true},
    songprvwpath: {type:String, required: true},
    songprvwname: {type:String, required: true},
    songfilepath: {type:String, required: true},
    songfilename: {type:String, required: true},
    songpublish:{type:String, required: true},
    songbuy:{type:Number, required: true},
    status: {type:String, required: true},
    objartistid: { type:mongoose.Schema.ObjectId, required: true},
    objalbumid: { type:mongoose.Schema.ObjectId, required: true}
});

SongSchema.plugin(mongoosePaginate);
SongSchema.plugin(mongooseAggregatePaginate);

module.exports = mongoose.model('song', SongSchema, 'song');