const mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

const Schema = mongoose.Schema;

const AdjustmentSchema = new Schema({
    labelid: {type:String, required: true},
    amount: {type:Number, required: true},
    dbcr: {type:String, required: true},
    requestdt: {type:Date, required: true},
    requestby: {type:String, required: true},
    approvedt: {type:Date},
    approveby: {type:String},
    status: {type:String, required: true},
    remarks: {type:String},
    extfield1: {type:String},
    extfield2: {type:String},
    extfield3: {type:String},
    extfield4: {type:String},
    objlabelid: { type:mongoose.Schema.ObjectId, required: true}
});

AdjustmentSchema.plugin(mongoosePaginate);
AdjustmentSchema.plugin(mongooseAggregatePaginate);

module.exports = mongoose.model('adjustment', AdjustmentSchema, 'adjustment');