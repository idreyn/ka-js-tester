'use strict';

var exp = require('./expect.js');
var esprima = require('esprima');

var {Q,Expect} = exp;

var test = esprima.parse('var foo = 5;');
console.log(test);
var query = Q({
	VariableDeclaration: Expect.that().exists().has(s => s.length > 1)
});
console.log(query(test));