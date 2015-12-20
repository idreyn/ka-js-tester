'use strict';

var esprima = require('esprima');
var walk = require('esprima-walk');

function Q(query) {
	for(let type in query) {
		let exp = query[type];
		if(!exp.message) exp.message = `Assertion for type ${type} failed.`;
	}
	return function(element) {
		var matches = {},
			conditions = Pass;
		walk(element,function(node) {
			if(node != element) {
				if(query[node.type]) {
					matches[node.type] = matches[node.type] || [];
					matches[node.type].push(node);
				}
			}
		});
		for(let type in query) {
			let result = query[type].evaluate(matches[type] || []);
			if(result != Pass) {
				return result;
			}
		}
		return Pass;
	};
}

class Pass {
	static bool(x) {
		if(typeof x == 'boolean') {
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
		this.forSome(() => true);
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
				if(!Pass.bool(t(el))) return Fail.because(this.message);
			}
			for(let i=0;i<this.forSomeTests.length;i++) {
				forSomeRes[i] = forSomeRes[i] || Pass.bool(this.forSomeTests[i](el));
			}
		}
		return [true].concat(forSomeRes).reduce((a,b) => a && b) ? Pass : Fail.because(this.message);
	}

	static that(msg) {
		return new Expect(msg);
	}
}

function And(a,b) {
	return {
		evaluate(set) {
			var aEval = a.evaluate(set);
			if(aEval != Pass) {
				return aEval;
			}
			var bEval = b.evaluate(set);
			if(bEval != Pass) {
				return bEval;
			}
			return Pass;
		}
	}
}

function Or(a,b) {
	return {
		evaluate(set) {
			var aEval = a.evaluate(set);
			if(aEval == Pass) {
				return Pass;
			}
			var bEval = b.evaluate(set);
			if(bEval == Pass) {
				return Pass;
			}
			return bEval;
		}
	}
}

function Not(a) {
	return {
		evaluate(set) {
			var aEval = a.evaluate(set);
			if(aEval == Pass) {
				return Fail.because(`NOT ${a.message}`);
			}
		}
	}
}

var Require = Expect.that().exists();
var Forbid = Expect.that().has(s => s.length == 0);

module.exports = {
	Q: Q,
	Pass: Pass,
	Fail: Fail,
	Expect: Expect,
	Require: Require,
	Forbid: Forbid,
	And: And,
	Or: Or,
	Not: Not
};