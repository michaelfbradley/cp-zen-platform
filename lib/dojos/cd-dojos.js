'use strict';

var _ = require('lodash');
_.mixin(require('lodash-deep'));
var path = require('path');
var serve_static = require('serve-static');
var cacheTimes = require('../../web/config/cache-times');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'dojos';
  var version = '1.0';

  options = seneca.util.deepextend({
    prefix: '/api/'
  }, options);

  seneca.add({ role: plugin, spec: 'web' }, spec_web);

  seneca.add({role: plugin, cmd: 'search'}, proxy);
  seneca.add({role: plugin, cmd: 'load'}, proxy);
  seneca.add({role: plugin, cmd: 'find'}, proxy);
  seneca.add({role: plugin, cmd: 'list'}, proxy);
  seneca.add({role: plugin, cmd: 'create'}, proxyNeedUser);
  seneca.add({role: plugin, cmd: 'update'}, proxyNeedUser);
  seneca.add({role: plugin, cmd: 'delete'}, proxyNeedUser);
  seneca.add({role: plugin, cmd: 'my_dojos'}, proxyNeedUser);
  seneca.add({role: plugin, cmd: 'dojos_count'}, proxy);
  seneca.add({role: plugin, cmd: 'dojos_by_country'}, proxy);
  seneca.add({role: plugin, cmd: 'dojos_state_count'}, proxy);
  seneca.add({role: plugin, cmd: 'bulk_update'}, proxyNeedUser);
  seneca.add({role: plugin, cmd: 'bulk_delete'}, proxyNeedUser);
  seneca.add({role: plugin, cmd: 'get_stats'}, proxyNeedUser);
  seneca.add({role: plugin, cmd: 'save_dojo_lead'}, proxyNeedUser);
  seneca.add({role: plugin, cmd: 'update_dojo_lead'}, proxyNeedUser);
  seneca.add({role: plugin, cmd: 'load_user_dojo_lead'}, proxyNeedUser);
  seneca.add({role: plugin, cmd: 'load_dojo_lead'}, proxyNeedUser);
  seneca.add({role: plugin, cmd: 'load_setup_dojo_steps'}, proxyNeedUser);
  seneca.add({role: plugin, cmd: 'load_usersdojos'}, proxy);
  seneca.add({role: plugin, cmd: 'search_dojo_leads'}, proxy);
  seneca.add({role: plugin, cmd: 'uncompleted_dojos'}, proxy);
  seneca.add({role: plugin, cmd: 'load_dojo_users'}, proxy);
  seneca.add({role: plugin, cmd: 'send_email'}, proxy);
  seneca.add({role: plugin, cmd: 'generate_user_invite_token'}, proxy);
  seneca.add({role: plugin, cmd: 'accept_user_invite'}, proxy);
  seneca.add({role: plugin, cmd: 'request_user_invite'}, proxy);
  seneca.add({role: plugin, cmd: 'accept_user_request'}, proxy);
  seneca.add({role: plugin, cmd: 'dojos_for_user'}, proxy);
  seneca.add({role: plugin, cmd: 'save_usersdojos'}, proxy);
  seneca.add({role: plugin, cmd: 'remove_usersdojos'}, proxy);
  seneca.add({role: plugin, cmd: 'get_user_permissions'}, proxy);
  seneca.add({role: plugin, cmd: 'get_user_types'}, proxy);
  seneca.add({role: plugin, cmd: 'get_dojo_config'}, proxy);
  seneca.add({role: plugin, cmd: 'update_founder'}, proxyNeedUser);
  seneca.add({role: plugin, cmd: 'search_nearest_dojos'}, proxy);
  seneca.add({role: plugin, cmd: 'search_bounding_box'}, proxy);
  // from countries service
  seneca.add({role: plugin, cmd: 'countries_continents'}, proxy);
  seneca.add({role: plugin, cmd: 'list_countries'}, proxy);
  seneca.add({role: plugin, cmd: 'list_places'}, proxy);
  seneca.add({role: plugin, cmd: 'countries_lat_long'}, proxy);
  seneca.add({role: plugin, cmd: 'continents_lat_long'}, proxy);
  seneca.add({role: plugin, cmd: 'continent_codes'}, proxy);

  function proxy (args, done) {
    var user = null;
    var zenHostname = args.req$.headers.host || '127.0.0.1:8000';
    var reqId = args.req$.headers['X-REQ-ID'];

    var locality = (args.req$.cookies.NG_TRANSLATE_LANG_KEY && args.req$.cookies.NG_TRANSLATE_LANG_KEY.replace(/\"/g, '')) || args.req$.headers['accept-language'];
    if (!locality) locality = 'en_US';
    locality = formatLocaleCode(locality);
    if (args.req$.seneca.user) user = args.req$.seneca.user;
    args.reqId = reqId;

    seneca.act(seneca.util.argprops(
      {user: user, reqId: reqId, zenHostname: zenHostname, locality: locality, fatal$: false},
      args,
      {role: 'cd-dojos'}
    ), done);
  }

  function proxyNeedUser (args, done) {
    if (!_.deepHas(args.req$, 'user.user')) return done(null, {ok: false, why: 'Not logged in, please log in first.'});
    return proxy(args, done);
  }

  function spec_web (args, done) {
    var public_folder = path.join(__dirname, 'public');

    done(null, {
      name: 'dojos',
      public: public_folder
    });
  }

  function formatLocaleCode (code) {
    return code.slice(0, 3) + code.charAt(3).toUpperCase() + code.charAt(4).toUpperCase();
  }

  seneca.add({ init: plugin }, function (args, done) {
    var seneca = this;

    seneca.act({ role: plugin, spec: 'web' }, function (err, spec) {
      if (err) { return done(err); }

      var serve = serve_static(spec.public);
      var prefix = '/content/' + spec.name;

      seneca.act({ role: 'web', use: function (req, res, next) {
        var origurl = req.url;
        if (origurl.indexOf(prefix) === 0) {
          req.url = origurl.substring(prefix.length);
          serve(req, res, function () {
            req.url = origurl;
            next();
          });
        } else {
          return next();
        }
      }});

      done();
    });
  });

  // web interface
  seneca.act({ role: 'web', use: {
    prefix: options.prefix + version + '/',
    pin: { role: plugin, cmd: '*' },
    map: {
      'search': {POST: true, alias: 'dojos/search'},
      'create': {POST: true, alias: 'dojo_create'},
      'update': {PUT: true, alias: 'dojos/:id'},
      'delete': {DELETE: true, alias: 'dojos/:id'},
      'list': {POST: true, alias: 'dojos'},
      'load': {GET: true, alias: 'dojos/:id'},
      'find': {POST: true, alias: 'dojos/find'},
      'my_dojos': {POST: true, alias: 'dojos/my_dojos'},
      'dojos_count': {GET: true, alias: 'dojos_count'},
      'dojos_by_country': {POST: true, alias: 'dojos_by_country'},
      'dojos_state_count': {GET: true, alias: 'dojos_state_count/:country'},
      'bulk_update': {POST: true, alias: 'dojos/bulk_update'},
      'bulk_delete': {POST: true, alias: 'dojos/bulk_delete'},
      'get_stats': {POST: true, alias: 'dojos/stats'},
      'save_dojo_lead': {POST: true, alias: 'dojos/save_dojo_lead'},
      'update_dojo_lead': {PUT: true, alias: 'dojos/update_dojo_lead/:id'},
      'load_user_dojo_lead': {GET: true, alias: 'dojos/user_dojo_lead/:id'},
      'load_dojo_lead': {GET: true, alias: 'dojos/dojo_lead/:id'},
      'load_setup_dojo_steps': {GET: true, alias: 'load_setup_dojo_steps'},
      'load_usersdojos': {POST: true, alias: 'dojos/users'},
      'search_dojo_leads': {POST: true, alias: 'dojos/search_dojo_leads'},
      'uncompleted_dojos': {GET: true, alias: 'uncompleted_dojos'},
      'load_dojo_users': {POST: true, alias: 'dojos/load_dojo_users'},
      'generate_user_invite_token': {POST: true, alias: 'dojos/generate_user_invite_token'},
      'accept_user_invite': {POST: true, alias: 'dojos/accept_user_invite'},
      'request_user_invite': {POST: true, alias: 'dojos/request_user_invite'},
      'accept_user_request': {POST: true, alias: 'dojos/accept_user_request'},
      'dojos_for_user': {GET: true, alias: 'dojos/dojos_for_user/:id'},
      'save_usersdojos': {POST: true, alias: 'dojos/save_usersdojos'},
      'remove_usersdojos': {POST: true, alias: 'dojos/remove_usersdojos/:userId/:dojoId'},
      'get_user_permissions': {GET: true, alias: 'get_user_permissions'},
      'get_user_types': {GET: true, alias: 'get_user_types'},
      'get_dojo_config': {GET: true, alias: 'get_dojo_config'},
      'update_founder': {POST: true, alias: 'update_founder'},
      'search_nearest_dojos': {POST: true, alias: 'dojos/search_nearest_dojos'},
      'search_bounding_box': {POST: true, alias: 'dojos/search_bounding_box'},
      'list_countries': {GET: true, alias: 'countries', expiresIn: cacheTimes.long},
      'list_places': {POST: true, alias: 'places'},
      'continents_lat_long': {GET: true, alias: 'continents_lat_long', expiresIn: cacheTimes.long},
      'countries_lat_long': {GET: true, alias: 'countries_lat_long', expiresIn: cacheTimes.long},
      'continent_codes': {GET: true, alias: 'continent_codes', expiresIn: cacheTimes.long},
      'countries_continents': {GET: true, alias: 'countries_continents', expiresIn: cacheTimes.long}
    }
  }});

  return {
    name: plugin
  };
};
