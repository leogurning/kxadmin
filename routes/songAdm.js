const mongoose = require( 'mongoose' );
const Song = require('../models/song');
const config = require('../config');

var ObjId = mongoose.Types.ObjectId;
var merge = function() {
  var obj = {},
      i = 0,
      il = arguments.length,
      key;
  for (; i < il; i++) {
      for (key in arguments[i]) {
          if (arguments[i].hasOwnProperty(key)) {
              obj[key] = arguments[i][key];
          }
      }
  }
  return obj;
};

exports.getsong = function(req, res, next){
    Song.find({_id:req.params.id}).exec(function(err, song){
          if(err) { 
              res.status(400).json({ success: false, message:'Error processing request '+ err }); 
          }
          res.status(201).json({
          success: true, 
          data: song
        });
      });
}

exports.getsongaggregate = function(req, res, next){
    
    const songid = new mongoose.Types.ObjectId(req.params.id);
    let query = {};
    
    if (!songid) {
        return res.status(422).send({ error: 'Parameter data is not correct or incompleted.'});
    }else{
        query = { _id:songid };
    }     
  
    var aggregate = Song.aggregate();        
    var olookuplb = {
        from: 'user',
        localField: 'objlabelid',
        foreignField: '_id',
        as: 'labeldetails'
      };
    var olookup = {
      from: 'artist',
      localField: 'objartistid',
      foreignField: '_id',
      as: 'artistdetails'
    };
     var olookup1 = {
      from: 'album',
      localField: 'objalbumid',
      foreignField: '_id',
      as: 'albumdetails'
    };
    var ounwind = 'artistdetails';
    var ounwind1 = 'albumdetails';
    var ounwindlb = 'labeldetails';

    var oproject = { 
        _id:1,
        labelid:1,
        artistid:1,
        albumid:1,
        songname: 1,
        songgenre:1,
        songlyric:1,
        songprice:1,
        "label": "$labeldetails.name",
        "artist": "$artistdetails.artistname",
        "album": "$albumdetails.albumname",
        "albumyear": "$albumdetails.albumyear",
        objartistid:1,
        objalbumid:1,
        objlabelid:1,
        songpublish:1,
        songbuy:1,
        status:1,
        songprvwpath:1,
        songprvwname:1,    
        songfilepath:1,
        songfilename:1,
      };
        
    aggregate.match(query).lookup(olookuplb).unwind(ounwindlb);
    aggregate.lookup(olookup).unwind(ounwind);  
    aggregate.lookup(olookup1).unwind(ounwind1);  
    aggregate.project(oproject);      
  
    aggregate.exec(function(err, result) {
      if(err) 
      {
          res.status(400).json({
              success: false, 
              message: err.message
          });
      }
      else
      {
          res.status(201).json({
              success: true, 
              data: result
          });
      }
    });  
}

exports.songaggregateAdm = function(req, res, next){
  const labelid =  req.body.labelid || req.query.labelid; 
  const artistname = req.body.artistname || req.query.artistname;
  const albumname = req.body.albumname || req.query.albumname;
  const songname = req.body.songname || req.query.songname;
  const albumyear = req.body.albumyear || req.query.albumyear;
  const songgenre = req.body.songgenre || req.query.songgenre;
  const songpublish = req.body.songpublish || req.query.songpublish;
  const songbuy = req.body.songbuy || req.query.songbuy;  
  const status = req.body.status || req.query.status;
  var totalcount;

  let limit = parseInt(req.query.limit);
  let page = parseInt(req.body.page || req.query.page);
  let sortby = req.body.sortby || req.query.sortby;
  let query = {};
  //let qmatch = {};

  if(!limit || limit < 1) {
    limit = 10;
  }

  if(!page || page < 1) {
    page = 1;
  }

/*   if(!sortby) {
    sortby = 'songname';
  } */


    // returns songs records based on query
    query = { songname: new RegExp(songname,'i'),
        "albumdetails.albumyear": new RegExp(albumyear,'i'),
        songpublish: new RegExp(songpublish,'i')
    };
    if (labelid) {
        query = merge(query, {labelid:labelid});
    }
    if (artistname) {
        query = merge(query, {"artistdetails.artistname": new RegExp(artistname,'i')});
    }
    if (albumname) {
        query = merge(query, {"albumdetails.albumname": new RegExp(albumname,'i')});
    }
    if (songgenre) {
        query = merge(query, {songgenre:songgenre});
    }    
    if (songbuy) {
        if (songbuy == 'Y') {
        query = merge(query, {songbuy: { $gt: 0 }});
        } else {
        query = merge(query, {songbuy: { $lte: 0 }});
        }
    }  
    if (status) {
        query = merge(query, {status:status});
    }
    if(!sortby) {
        var options = {
            page: page,
            limit: limit
        }
    }
    else {
        var options = {
            page: page,
            limit: limit,
            sortBy: sortby
        }
    }

    var aggregate = Song.aggregate();  
    var olookuplb = {
        from: 'user',
        localField: 'objlabelid',
        foreignField: '_id',
        as: 'labeldetails'
      };      
    var olookup = {
        from: 'artist',
        localField: 'objartistid',
        foreignField: '_id',
        as: 'artistdetails'
    };
    var olookup1 = {
        from: 'album',
        localField: 'objalbumid',
        foreignField: '_id',
        as: 'albumdetails'
    };
    var ounwind = 'artistdetails';
    var ounwind1 = 'albumdetails';
    var ounwindlb = 'labeldetails';

    var oproject = { 
        _id:1,
        labelid:1,
        artistid:1,
        albumid:1,
        songname: 1,
        songgenre:1,
        songlyric:1,
        songprice:1,
        "label": "$labeldetails.name",
        "artist": "$artistdetails.artistname",
        "album": "$albumdetails.albumname",
        "albumyear": "$albumdetails.albumyear",
        objartistid:1,
        objalbumid:1,
        objlabelid:1,
        songpublish:1,
        songbuy:1,
        status:1,
        songprvwpath:1,
        songprvwname:1,    
        songfilepath:1,
        songfilename:1,
    };

    aggregate.lookup(olookup1).unwind(ounwind1);  
    aggregate.match(query);
    aggregate.lookup(olookuplb).unwind(ounwindlb);    
    aggregate.lookup(olookup).unwind(ounwind);
    
    aggregate.project(oproject);      
    if(!sortby) {
        var osort = { artistid: 1, albumid:1, songname:1};
        aggregate.sort(osort);
    }
    Song.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
        if(err) 
        {
            res.status(400).json({
                success: false, 
                message: err.message
            });
        }
        else
        { 
            res.status(201).json({
                success: true, 
                data: results,
                npage: pageCount,
                totalcount: count
            });
        }
      })
  
}

exports.publishsong = function(req, res, next){
    const songid = req.params.id;
  
    if (!songid) {
        return res.status(422).json({ success: false, message: 'Parameter data is not correct or incompleted.'});
    } else {
        Song.findById(songid).exec(function(err, song){
            if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                
            if(song){
                song.songpublish = 'Y';
                song.save(function(err){
                  if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err }); }
                  res.status(201).json({
                      success: true,
                      message: 'Song has been published successfully'
                  });
                });
            }
        });
    }
}
  
exports.cancelpublishsong = function(req, res, next){
const songid = req.params.id;

    if (!songid) {
        return res.status(422).json({ success: false, message: 'Parameter data is not correct or incompleted.'});
    } else {
        Song.findById(songid).exec(function(err, song){
            if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                
            if(song){
                if (song.songbuy > 0) {
                res.status(400).json({ success: false, message:'Published Song can not be canceled if the song has been sold. ' });
                } else {
                song.songpublish = 'N';
                song.save(function(err){
                    if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err }); }
                    res.status(201).json({
                        success: true,
                        message: 'Published Song has been canceled successfully'
                    });
                });
                }  
            }
        });
    }
}