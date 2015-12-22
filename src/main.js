'use strict';

var _ = require('underscore');
var $ = require('jquery');
var fs = require('fs');
var esprima = require('esprima');
var {Q, Pass, Fail, Expect, Require, Forbid, And, Or, Not} = require('../src/expect.js');

var editor;

$(() => {
	editor = CodeMirror.fromTextArea(document.querySelector('main > textarea'),{
		lineNumbers: true,
		theme: 'ambiance',
		mode: 'javascript',
	});
	editor.on('change',_.throttle(onTextUpdate,1000));
	onTextUpdate();
	$('#notices #toggle-button').click(function() {
		$('#notices').toggleClass('closed');
	});
});

var test = Q({
	ForStatement: And(
		Expect.that("[for] loops may not be nested").forAll(Q({ForStatement: Forbid})),
		Expect.that("There should be an [if] statement inside of a [for] loop").exists().forSome(Q({IfStatement: Require}))
	),
	VariableDeclaration: And(
		Expect.that("The program should contain exactly two [var] declarations").has(s => s.length == 2),
		Expect.that("All variables should begin with the letter b.").forAll(x => x.declarations[0] && x.declarations[0].id.name.charAt(0).toLowerCase() == 'b')
	),
	WhileStatement: Expect.that("There should be no [while] loops").doesNotExist()
});

function onTextUpdate(e){
	$('#notices').removeClass('okay warning error');
	try {
		var ast = esprima.parse(e ? e.getValue() : '');
	} catch(e) {
		$('#notices').addClass('error');
		$('#notices #error > .text').html(e.toString());
		return;
	}
	var warnings = test(ast).filter(x => x != Pass);
	if(warnings.length) {
		$('#notices').addClass('warning');
		$('#notices #warning').html('');
		for(let w of warnings) {
			$('#notices #warning').append($(
				`
				<div class='warning-item'>
					<span class='icon fa fa-exclamation-triangle'></span>
					<span class='text'>${ w.message.replace(/\[.*?\]/g,x => `<span class='code-text'>${x.slice(1,-1)}</span>`) }</span>
				</div>
				`
			));
		}
	} else {
		$('#notices').addClass('okay');
	}
}

'foo';