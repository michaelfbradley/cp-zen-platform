var _ = require('lodash');
var path = require('path');

var base = require('./options.base.js');

module.exports = _.defaults({

  auth: {
    restrict: ['/dashboard'],
    redirect:{
      restrict: '/'
    },
    sendemail: false,
    email: {
      code: {
        register: 'auth-register',
        create_reset: 'auth-create-reset'
      },
      subject: {
        register: 'Welcome to CoderDojo!',
        create_reset: 'CoderDojo Password Reset'
      },
      content: {
        resetlinkprefix: 'http://127.0.0.1:8000/reset',
        confirmlinkprefix: 'http://127.0.0.1:8000/confirm'
      }
    }
  },

  mail: {
    folder: path.resolve(__dirname + '/../email-templates'),
    mail: {
      from:'youremail@example.com'
    },
    config: {
      service: 'Gmail',
      auth: {
        user: 'youremail@example.com',
        pass: 'yourpass'
      }
    }
  },

  client: [
    {type: 'web', host: '127.0.0.1', port: 10301, pin: 'role:cd-dojos,cmd:*'}
  ]



}, base);
