const mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
    labelid: {type:String, required: true},
    listenerid: {type:String},
    purchaseid:{type:String, required: true},
    paymentmtd: {type:String},
    producttype: {type:String, required: true},
    productid: {type:String},
    dbcr: {type:String, required: true},
    amount: {type:Number, required: true},
    transactiondt: {type:Date, required: true},
    objpurchaseid: { type:mongoose.Schema.ObjectId},
    objproductid: { type:mongoose.Schema.ObjectId},
    objlabelid: { type:mongoose.Schema.ObjectId, required: true},
    objlistenerid: { type:mongoose.Schema.ObjectId},
});

TransactionSchema.plugin(mongoosePaginate);
TransactionSchema.plugin(mongooseAggregatePaginate);

module.exports = mongoose.model('transaction', TransactionSchema, 'transaction');