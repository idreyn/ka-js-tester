'use strict';

var fs = require('fs');
var esprima = require('esprima');
var {Q, Pass, Fail, Expect, Require, Forbid, And, Or, Not} = require('../src/expect.js');

var trees = ['for-loops'].map(x => esprima.parse(fs.readFileSync(`scripts/${x}.js`).toString()));

var tests = {
	noNestedFor: Q({
		ForStatement: Expect.that("For loops may not be nested").forAll(Q({
			ForStatement: Forbid
		}))
	}),
	exactlyTwoVarDeclarations: Q({
		VariableDeclaration: Expect.that("The program should contain exactly two variable declarations").has(s => s.length == 2)
	})
};

console.log(Pass.bool(tests.exactlyTwoVarDeclarations(trees[0])));