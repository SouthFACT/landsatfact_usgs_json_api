
function error_email() {
  var yaml = require('yamljs');

  //config data
  const CONFIG_YAML = yaml.load("./lib/email/config.yaml");

  var nodemailer = require('nodemailer');
  var generator = require('xoauth2').createXOAuth2Generator({
      user: CONFIG_YAML.username,
      clientId: CONFIG_YAML.clientId,
      clientSecret: CONFIG_YAML.clientSecret,
      refreshToken: CONFIG_YAML.refreshToken,
      accessToken: accessToken,
      scope: 'https://mail.google.com/',
  });

  //default subect and email text
  var subject = "Landsat FACT Error!";
  var text = "lsf text";
  var attachment = {path: "./none.txt"};

  var accessToken


  // listen for token updates
  // you probably want to store these to a db
  generator.on('token', function(token){
      accessToken = token.accessToken
      // console.log('New token for %s: %s', token.user, token.accessToken);
  });

  // login
  var transporter = nodemailer.createTransport(({
      service: 'gmail',
      auth: {
          xoauth2: generator
      }
  }));


  return {
    send_email: function() {
        // send mail
        transporter.sendMail({
            from: CONFIG_YAML.username,
            to: CONFIG_YAML.to_email_list,
            subject: subject,
            text: text,
            attachments: [ attachment ]
        }, function(error, response) {
           if (error) {
                console.log(error);
           } else {
                console.log('Message sent');
           }
        });
     },
    set_attachments: function(new_attachment){
      attachment = {path: new_attachment};
    },
    set_subject: function(new_subject) { subject = new_subject; },
    set_text: function(new_text) { text = new_text; },
  };
}


module.exports = error_email;
