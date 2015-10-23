var app = require('express')();
var request = require('request');
var striptags = require('striptags');
var S = require('string');

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

    request.post(url, {form: {'tipo': 'D', cedula: params.cedula}}, function (error, response, body) {
        try {
            if (response.statusCode == 200) {
                body = S(striptags(body)).trim(); //remove html tags
                result.nombre = (regexName.exec(body)[1]).split(':')[1].trim();
                result.cedula = (regexCedula.exec(body)[1]).split(':')[1].trim();
                result.departamento = (regexDepartamento.exec(body)[1]).split(':')[1].trim();
                result.municipio = (regexMunicipio.exec(body)[1]).split(':')[1].trim();
                result.direccion = (regexDireccion.exec(body)[1]).split(':')[1].trim();
                res.json({data: result});
            }
        } catch (e) {
            res.status(505).json({error: 'Documento no encontrado'});
        }

    });
});

app.all('*', function (req, res) {
    res.send("Recurso no encontrado!");
});
