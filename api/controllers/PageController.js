/**
 * PageController
 *
 * @description :: Server-side logic for managing pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var _ = require('lodash'),
  view = sails.config.cms.view.default,
  fs = require('fs'),
  path = require('path')

var pageHook = function (req) {
  sails.emit("hook:page:render", req)
}

var exports = {
  //render page
  page: function (req, res) {
    var page = req.param('page') || 'index',
      file = view + '/' + page,
      cache = CacheService.cache(file)

    if (cache === undefined) {
      fs.exists(path.join('views', file +"."+ sails.config.views.engine.ext), function (result,err) {
        if (err || result=== false) {
          CacheService.cache(file, false)
          return res.notFound()
        } else {
          CacheService.cache(file, true)
          return res.view(file, {user: req.session.user || {}})
        }
      })
    } else if (cache === false) {
      res.notFound()
    } else if (cache === true) {
      res.view(file, {user: req.session.user || {}})
    }
  },
  //render a single node
  node: function (req, res) {
    var model = req.param('model'),
      modelIns = global[UtilService.upperCapital(model)],
      id = req.param('id'),
      file = view + '/' + model

    if( req.param('preload') == 'disable' ){
      res.view(file, {data:{'user':req.session.user }})
    }else{
      modelIns.findOne(id).then(function (record) {
        if (!record) {
          res.notFound()
        } else {
          var data = _.zipObject([model, 'user'], [record, req.session.user || {}])
          if( req.param('preload') == 'string' ){
            data = JSON.stringify(data)
          }
          res.view(file, {data : data})
        }
      }).fail(function (err) {
        sails.error(err)
        res.serverError()
      })
    }
  },
  //render a node list
  nodes: function (req, res) {
    var model = req.param('model'),
      modelIns = global[UtilService.upperCapital(model)],
      blackList = ['preload'],
      file = view + '/' + model + sails.config.cms.node.listSuffix

    req.query.limit = req.query.limit || sails.config.cms.node.limit
    req.query.sort = req.query.sort || {id: "desc"}

    if( req.param('preload') == 'disable' ){
      res.view(file, {data:{'user':req.session.user }})
    }else{
      modelIns.find(_.omit(req.query,blackList)).then(function (records) {
        var data = _.zipObject([model, 'user'], [records, req.session.user || {}])
        if( req.param('preload') == 'string' ){
          data = JSON.stringify( data )
        }
        //by default we will send preload data to view engine as object
        res.view(file, {data:data})

      }).fail(function (err) {
        sails.error(err)
        res.serverError()
      })
    }
  }
};

module.exports = exports
