'use strict';

var _ = require('underscore');
var fs = require('fs');
var walkReference = require('esprima-walk');
var esprima = require('esprima');
var {Q, Pass, Fail, Expect, Require, Forbid, And, Or, Not, walkAST} = require('../src/expect.js');

var trees = {}
fs.readdirSync('scripts').forEach(function(script) {
	var name = script.split('.')[0];
	var contents = fs.readFileSync('scripts/' + script).toString();
	trees[name] = esprima.parse(contents);
});

function isBVariable(node) {
	return node.declarations[0].id.name.charAt(0).toLowerCase() == 'b';
}

function compareASTWalks(tree,walkA,walkB) {
	var aRes = [],
		bRes = [];
	walkA(tree,function(x) {
		aRes.push(x.type);
	});
	walkB(tree,function(x) {
		bRes.push(x.type);
	});
	return _.isEqual(aRes.sort(),bRes.sort());
}

function assertTrue(x) {
	if(!x) {
		throw new Error("assertTrue failed");
	}
}

function assertFalse(x) {
	if(x) {
		throw new Error("assertFalse failed");
	}
}

function assertPass(treeName,query) {
	var result = query(trees[treeName]);
	if(!Pass.is(result)) {
		throw new Error(`assertPass failed for ${treeName}`);
	}
}

function assertFail(treeName,query) {
	var result = query(trees[treeName]);
	if(Pass.is(result)) {
		throw new Error(`assertFail failed for ${treeName}`);
	}
}

function runTests() {
	var count = 0;
	var failCount = 0;
	for(let k in tests) {
		count++;
		var test = tests[k];
		console.log(`Running ${k}...`)
		try {
			test();
		} catch(e) {
			failCount++;
			console.log('FAILED!',e);
		}
	}
	if(failCount) {
		console.log(`${failCount} of ${count} tests failed.`);
	} else {
		console.log('All tests passed!');
	}
}

var queries = {
	isVar: Q({
		VariableDeclaration: Require
	}),
	noWhile: Q({
		WhileStatement: Forbid
	}),
	allVarIsB: Q({
		VariableDeclaration: Expect.that("All variables begin with 'b'").forAll(isBVariable)
	}),
	someVarIsB: Q({
		VariableDeclaration: Expect.that("Some variables begin with 'b'").forSome(isBVariable)
	}),
	allForHasIf: Q({
		ForStatement: Expect.that("All [for] loops contain [if]").forAll(Q({
			IfStatement: Require
		}))
	}),
	someForHasIf: Q({
		ForStatement: Expect.that("Some [for] loop contains [if]").forSome(Q({
			IfStatement: Require
		}))
	}),
	hasMoreThanHalfVarsB: Q({
		VariableDeclaration: Expect.that("More than half of [var]s start with 'b'").has(
			s => s.length == 0 || (s.filter(isBVariable).length / s.length > 0.5)
		)
	}),
	noNestedFor: Q({
		ForStatement: Expect.that("For loops may not be nested").forAll(Q({
			ForStatement: Forbid
		}))
	}),
	exactlyTwoVar: Q({
		VariableDeclaration: Expect.that("The program should contain exactly two [var] statements").has(s => s.length == 2)
	}),
	noDirectlyNestedFor: Q({
		ForStatement: Expect.that("No [for] directly contains a [for]").forAll(Q({
			ForStatement: Forbid
		},2))
	}),
	compound: Q({
		VariableDeclaration: Expect.that("Two variables, both begin with 'b'").forAll(isBVariable).has(
			s => s.length == 2
		),
		ForStatement: Expect.that("All [for] loops contain [if]").forAll(Q({
			IfStatement: Require
		})),
		WhileStatement: Forbid
	}),
	andTest: Q({
		VariableDeclaration: And(
			Expect.that("The program should contain exactly two [var] statements").has(s => s.length == 2),
			Expect.that("All variables begin with 'b'").forAll(isBVariable)
		)
	}),
	orTest: Q({
		VariableDeclaration: Or(
			Expect.that("The program should contain exactly two [var] statements").has(s => s.length == 2),
			Expect.that("All variables begin with 'b'").forAll(isBVariable)
		)
	}),
	notTest: Q({
		VariableDeclaration: Not(Expect.that("All variables begin with 'b'").forAll(isBVariable))
	})
};

var tests = {
	walkTest() {
		for(let name in trees) {
			let tree = trees[name];
			assertTrue(compareASTWalks(tree, walkAST, walkReference))
		}
	},
	passTests() {
		assertTrue(Pass.is(Pass));
		assertTrue(Pass.is([Pass,Pass,Pass]));
		assertTrue(Pass.is(true));
		assertFalse(Pass.is(Fail.because("test")));
		assertFalse(Pass.is([
			Fail.because("test"),
			Fail.because("test"),
			Fail.because("test")
		]));
		assertFalse(Pass.is([
			Fail.because("test"),
			Pass,
			Fail.because("test")
		]))
		assertFalse(Pass.is(false));
		assertFalse(Pass.is(42));
	},
	exists() {
		assertPass("b-vars",queries.isVar);
		assertFail("no-var",queries.isVar);
	},
	doesNotExist() {
		assertPass("for-if",queries.noWhile);
		assertFail("while",queries.noWhile);
	},
	allVarIsB() {
		assertPass("b-vars",queries.allVarIsB);
		assertFail("one-third-b",queries.allVarIsB);
	},
	allForHasIf() {
		assertPass("for-if",queries.allForHasIf);
		assertFail("for-some-if",queries.allForHasIf);
		assertFail("for-nest",queries.allForHasIf);
	},
	someForHasIf() {
		assertPass("for-if",queries.someForHasIf);
		assertPass("for-some-if",queries.someForHasIf);
		assertFail("for-nest",queries.someForHasIf);
	},
	someVarIsB() {
		assertPass("b-vars",queries.someVarIsB);
		assertPass("one-third-b",queries.someVarIsB);
		assertFail("for-nest",queries.someVarIsB);
	},
	hasMoreThanHalfVarsB() {
		assertPass("no-var",queries.hasMoreThanHalfVarsB);
		assertPass("two-third-b",queries.hasMoreThanHalfVarsB);
		assertFail("one-third-b",queries.hasMoreThanHalfVarsB);
	},
	compoundTest() {
		assertPass("compound-pass",queries.compound);
		assertPass("b-vars",queries.compound);
		assertFail("for-nest",queries.compound);
		assertFail("while",queries.compound);
	},
	noNestedFor() {
		assertPass("while",queries.noNestedFor);
		assertPass("for-some-if",queries.noNestedFor);
		assertFail("for-nest",queries.noNestedFor);
		assertFail("for-nest-indirect",queries.noNestedFor);
	},
	noDirectlyNestedFor() {
		assertPass("for-nest-indirect",queries.noDirectlyNestedFor);
		assertFail("for-nest",queries.noDirectlyNestedFor);
	},
	andTest() {
		assertPass("b-vars",queries.andTest);
		assertFail("two-vars",queries.andTest);
		assertFail("one-b-var",queries.andTest);
		assertFail("one-non-b-var",queries.andTest);
	},
	orTest() {
		assertPass("b-vars",queries.orTest);
		assertPass("two-vars",queries.orTest);
		assertPass("one-b-var",queries.orTest);
		assertFail("one-non-b-var",queries.orTest);
	},
	notTest() {
		assertPass("one-third-b",queries.notTest);
		assertFail("b-vars",queries.notTest);
	}
}

runTests();