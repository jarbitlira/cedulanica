var app = require('express')();
var request = require('request');
var striptags = require('striptags');
var S = require('string');

var util = require('util');
var memjs = require('memjs');
var memcached = memjs.Client.create();
var memcachedExpirationTime = (process.env.expirationTime || 60); // Default 1 min

var server = app.listen(process.env.PORT || 3000);

var url = 'http://www.cse.gob.ni/components/buscarcv.php';

var regexName = new RegExp('(NOMBRE:(\\s[\\w]+)+)');
var regexCedula = new RegExp('(CEDULA \/ DOCUMENTO SUPLETORIO: (\\d+){1,13}[A-Z])');
var regexDepartamento = new RegExp('(DEPARTAMENTO: (\\w\\s*)+\\n)');
var regexMunicipio = new RegExp('(MUNICIPIO: (\\w\\s*)+\\n)');
var regexDireccion = new RegExp('(DIRECCION: [\\w\\W]+)');

app.get('/', function (req, res) {
  res.send("Consulta de cedula Nica.");
});

app.get('/cedula/:cedula', function (req, res) {
  var params = req.params;
  var result = {};

  var memcachedKey = util.format('cedula_%d', params.cedula);
  memcached.get(memcachedKey, function (err, value, key) {
    // value is not cached
    if (value == null) {
      var options = {
        url: url,
        form: {
          'tipo': 'D',
          cedula: params.cedula
        },
        encoding:'binary'
      };

      request.post(options, function (error, response, body) {
        try {
          if (response.statusCode == 200) {
            body = S(striptags(body)).trim(); //remove html tags
            result.nombre = (regexName.exec(body)[1]).split(':')[1].trim();
            result.cedula = (regexCedula.exec(body)[1]).split(':')[1].trim();
            result.departamento = (regexDepartamento.exec(body)[1]).split(':')[1].trim();
            result.municipio = (regexMunicipio.exec(body)[1]).split(':')[1].trim();
            result.direccion = (regexDireccion.exec(body)[1]).split(':')[1].trim();

            // save result on memcached
            memcached.set(memcachedKey, JSON.stringify(result), function (err, success) {
              result.source = 'request';
              res.json({data: result});
            }, memcachedExpirationTime);

          }
        } catch (e) {
          res.status(404).json({error: 'Documento no encontrado'});
        }

      });
    } else {
      var memcachedResponse = JSON.parse(value);
      memcachedResponse.source = 'memcached';
      res.json(memcachedResponse);
    }
  });
});

app.all('*', function (req, res) {
  res.send("Recurso no encontrado!");
});
