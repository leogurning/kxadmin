const mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

const Schema = mongoose.Schema;

const TrfbalanceSchema = new Schema({
    labelid: {type:String, required: true},
    amount: {type:Number, required: true},
    insref: {type:String},
    bankaccno: {type:String, required: true},
    bankaccname: {type:String, required: true},
    bankname: {type:String, required: true},
    requestdt: {type:Date, required: true},
    transferdt: {type:Date},
    transferslippath: {type:String},
    transferslipname: {type:String},
    bankref: {type:String},
    status: {type:String, required: true},
    remarks: {type:String},
    extfield1: {type:String},
    extfield2: {type:String},
    extfield3: {type:String},
    extfield4: {type:String},
    objlabelid: { type:mongoose.Schema.ObjectId, required: true},
});

TrfbalanceSchema.plugin(mongoosePaginate);
TrfbalanceSchema.plugin(mongooseAggregatePaginate);

module.exports = mongoose.model('trfbalance', TrfbalanceSchema, 'trfbalance');