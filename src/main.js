'use strict';

var $ = require('jquery');
var fs = require('fs');
var esprima = require('esprima');
var {Q, Pass, Fail, Expect, Require, Forbid, And, Or, Not} = require('../src/expect.js');

$(() => {
	console.log(document.querySelector('#main'));
	CodeMirror.fromTextArea(document.querySelector('main > textarea'),{
		lineNumbers: true,
		theme: 'ambiance',
		mode: 'javascript'
	});
});