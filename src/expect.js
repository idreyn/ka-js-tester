'use strict';

var esprima = require('esprima');
var walk = require('esprima-walk');
var _ = require('underscore');

function walkAST(ast,callback,maxDepth=false,depth=0) {
	if(maxDepth !== false && depth > maxDepth) {
		return;
	} else {
		callback(ast);
		Object.keys(ast).map(k => ast[k]).forEach(function(c) {
			if(c instanceof Array) {
				c.filter(x => x).forEach(
					e => walkAST(e,callback,maxDepth,depth + 1)
				)
			} else if(c != void 0 && typeof c.type === 'string') {
				walkAST(c,callback,maxDepth,depth + 1);
			}
		});
	}
}

function Q(query,maxDepth=false) {
	for(let type in query) {
		let exp = query[type];
		if(!exp.message) exp.message = `Assertion for type ${type} failed.`;
	}
	return function(element) {
		var matches = {},
			conditions = Pass;
		walkAST(element,function(node) {
			if(node != element) {
				if(query[node.type]) {
					matches[node.type] = matches[node.type] || [];
					matches[node.type].push(node);
				}
			}
		},maxDepth);
		return _.flatten(Object.keys(query).map(type => query[type].evaluate(matches[type] || [])));
	};
}

class Pass {
	static is(x) {
		if(x instanceof Array) {
			return x.filter(i => i != Pass).length == 0;
		} else if(typeof x == 'boolean') {
			return x;
		} else {
			return x == Pass;
		}
	}
}

class Fail {
	constructor(msg) {
		this.message = msg;
	}

	static because(msg) {
		return new Fail(msg);
	}
}

class Expect {
	constructor(message) {
		this.message = message;
		this.forAllTests = [];
		this.forSomeTests = [];
		this.setTests = [];
	}

	exists() {
		this.has(x => x.length);
		return this;
	}

	doesNotExist() {
		this.has(x => !x.length);
		return this;
	}

	forAll(x) {
		this.forAllTests.push(x);
		return this;
	}

	forSome(x) {
		this.forSomeTests.push(x);
		return this;
	}

	has(x) {
		this.setTests.push(x);
		return this;
	}

	evaluate(set) {
		var status = Pass,
			forSomeRes = this.forSomeTests.map(() => false);
		for(let t of this.setTests) {
			if(!t(set)) return Fail.because(this.message);
		}
		for(let el of set) {
			for(let t of this.forAllTests) {
				if(!Pass.is(t(el))) return Fail.because(this.message);
			}
			for(let i=0;i<this.forSomeTests.length;i++) {
				let res = this.forSomeTests[i](el);
				forSomeRes[i] = forSomeRes[i] || Pass.is(res);
			}
		}
		return [true].concat(forSomeRes).reduce((a,b) => a && b) ? Pass : Fail.because(this.message);
	}

	static that(msg) {
		return new Expect(msg);
	}
}

function And(a,b,...rest) {
	if(rest.length) {
		return And(a,And(b,...rest));
	}
	return {
		evaluate(set) {
			var aEval = a.evaluate(set),
				bEval = b.evaluate(set),
				passA = Pass.is(aEval),
				passB = Pass.is(bEval);
			if(passA && passB) {
				return Pass;
			} else {
				if(passA) {
					return bEval;
				} else if(passB) {
					return aEval;
				} else {
					return [aEval,bEval];
				}
			}
		}
	}
}

function Or(a,b,...rest) {
	if(rest.length) {
		return Or(a,Or(b,...rest));
	}
	return {
		evaluate(set) {
			var aEval = a.evaluate(set);
			var bEval = b.evaluate(set);
			if(Pass.is(aEval) || Pass.is(bEval)) {
				return Pass;
			} else {
				return Fail.because(aEval.message + ' OR ' + bEval.message);
			}
		}
	}
}

function Not(a) {
	return {
		evaluate(set) {
			var aEval = a.evaluate(set);
			if(Pass.is(aEval)) {
				return Fail.because(`NOT ${a.message}`);
			} else {
				return Pass;
			}
		}
	}
}

var Require = Expect.that().exists();
var Forbid = Expect.that().doesNotExist();

module.exports = {
	Q: Q,
	Pass: Pass,
	Fail: Fail,
	Expect: Expect,
	Require: Require,
	Forbid: Forbid,
	And: And,
	Or: Or,
	Not: Not,
	walkAST: walkAST
};