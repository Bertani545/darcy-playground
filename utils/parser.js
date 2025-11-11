/*
	Original parser by David Bau(github:davidbau) and  Sean Papay (github:person594)
	Modified by Jesus Bertani
*/
const numericConstant = "\\d*\\.?\\d+(?:[eE][-+]?\\d+)?";
const variableName = "(e|pi|t|x|y)";
const functionName = "ln|log|exp|Gamma|abs|sqrt|sinh?|cosh?|tanh?|asin|acos|atan|sech?|csch?|coth?|sign";
const identifier = functionName + "|" + variableName;
const symbol = "[\\[\\]\\(\\)+*/^-]";
const whitespace = "(\\s|\\t|\\n|\\r|\\v)+";

function tokenize(expression) {

	var token = RegExp("(" + numericConstant + "|" + identifier + "|" + symbol + "|" + whitespace + ")", "g");

	var tokenStream = expression.match(token);
	if (!tokenStream) return false;
	if (tokenStream.join("") != expression) return false;


	tokenStream = tokenStream.filter(function(token) {
		return ! token.match("^(" + whitespace + ")$");
	});

	// Replace implicit multiplcaiton with explicit ones
	let  tokenLen = tokenStream.length;
	let i = 1;
	while (i < tokenLen) {
		if (tokenStream[i-1].match("^(" + symbol + ")$") || tokenStream[i].match("^(" + symbol + ")$"))
		{
			// Your usual operator
			i++;
			continue;
		}

		tokenStream.splice(i, 0, '*');
		i += 2;
		tokenLen++;
	}


	for (i = 1; i < tokenLen-1; i++) {
		if (tokenStream[i] === '*') {
			const left = tokenStream[i-1];
			const right = tokenStream[i+1];

			if (right.match("^(" + numericConstant + ")$"))
				tokenStream[i] = '\#'
		}
	}
	
	tokenStream.push("\n");
	
	//console.log(tokenStream)
	return tokenStream;

}


let timeDependent = false;

function parse(inputStream) {
	if (!inputStream) return false;
	let oldTimeDependent = timeDependent;
	let i = 0;
	
	function parseVariableName() {
		const token = inputStream[i];
		if (token.match("^(" + variableName + ")$")) {
			++i;
			if (token == 't') {
				timeDependent = true;
			}
			return token;
		} else return false;
	}
	
	function parseFunctionName() {
		const token = inputStream[i];
		if (token.match("^(" + functionName + ")$")) {
			++i;
			return token;
		} else return false;
	}
	
	function parseNumericConstant() {
		const token = inputStream[i];
		if (token.match("^(" + numericConstant + ")$")) {
			++i;
			return token;
		} else return false;
	}

	function parseAtomicExpression() {
		const i0 = i;
		const fn = parseFunctionName();
		let closer;
		if (inputStream[i] == '(') closer = ')';
		else if (inputStream[i] == '[') closer = ']';
		else {
			// There must always be () or [] after functions
			i = i0;
			return parseVariableName() || parseNumericConstant();
		}
		++i;
		const inner = parseExpression();
		if (!inner) {
			i = i0;
			return false;
		}
		if (inputStream[i++] != closer) {
			 i = i0;
			 return false;
		}
		return fn ? [fn, inner] : inner;
	}
	//takes care of implied multiplication and unitary negation as well
	function parseExponentialExpression() {
		const i0 = i;
		let sign;
		if (inputStream[i] == '-' || inputStream[i] == '+') {
			sign = inputStream[i++];
		}
		const multiplicands = [parseAtomicExpression()];
		if (!multiplicands[0]) return false;
		let ae;
		while (ae = parseAtomicExpression()) {
			multiplicands.push(ae)
		}
		let power;
		if (inputStream[i] == '^') {
			++i;
			power = parseExponentialExpression();
			if (!power) {
				i = i0;
				return false;
			}
			const base = multiplicands.pop();
			multiplicands.push(["^", base, power]);
		}
		let expression = multiplicands[0]
		multiplicands.slice(1).forEach(function(multiplicand) {
			expression = ["*", expression, multiplicand];
		});
		if (sign == '-') {
			expression = ["-", expression];
		}
		return expression;
	}

	// We want this one to have priority
	function parseDivisiveExpression() {
		const i0 = i;
		let left = parseExponentialExpression();
		if (!left) return false;
		while (inputStream[i] == '/') {
			const operator = inputStream[i++];
			const right = parseExponentialExpression();
			if (! right) {
				i = i0;
				return false;
			}
			left = ['/', left, right];
		}
		return left;
	}


	function parseMultiplicativeExpression() {
		const i0 = i;
		let left = parseDivisiveExpression();
		if (!left) return false;
		while (inputStream[i] == '*' || inputStream[i] == '\#') {
			const operator = inputStream[i++];
			const right = parseDivisiveExpression();
			if (! right) {
				i = i0;
				return false;
			}
			left = [operator, left, right];
		}
		return left;
	}

	
	function parseAdditiveExpression() {
		const i0 = i;
		let left = parseMultiplicativeExpression();
		if (!left) return false;
		while (inputStream[i] == '+' || inputStream[i] == '-') {
			const operator = inputStream[i++];
			const right = parseMultiplicativeExpression();
			if (! right) {
				i = i0;
				return false;
			}
			left = [operator, left, right];
		}
		return left;
	}
	
	
	function parseExpression() {
		return parseAdditiveExpression();
	}
	
	
	var expression = parseExpression();
	if (inputStream[i] != '\n') { // Didn't reach the end of the stream
		timeDependent = oldTimeDependent;
		return false;
	}
	return expression;
}

function parse_input(exp)
{	
	let tokenized = tokenize(exp);
	if(!tokenized) return null;

	let expression = parse(tokenized);
	if(!expression) return null;
	return expression
}


function get_code(expression)
{
	let ans = "";
	if (typeof(expression) == "string") {
		if (expression.match("^(" + numericConstant + ")$")) {
			return "float("+expression+")";
		} else if (expression.match("^(" + variableName + ")$")) {
			switch(expression) {
				case "e":
					return "E";
				case "pi":
					return "PI";
				case "t":
					return "u_t";
				case "x":
					return "x";
				case "y":
					return "y";
			}
		}
		return "{It shouldn't have reached this place: " + expression + "}";
	}
	if (expression[0].match("^(" + functionName + ")$")) {
		if(expression[0] == "log") return "log10(" + get_code(expression[1]) + ")";
		if(expression[0] == "ln") return "log(" + get_code(expression[1]) + ")";
		return  expression[0] + "(" + get_code(expression[1]) + ")";
	}
	switch(expression[0]) {
		case "+":
			return "(" + get_code(expression[1]) + " + " + get_code(expression[2]) + ")";
		case "-":
			if (expression.length == 2)
				return "( -" + get_code(expression[1]) + ")";
			return "(" + get_code(expression[1]) + " - " + get_code(expression[2]) + ")"
		case "*":
		case "\#":
			return "(" + get_code(expression[1]) + " * " + get_code(expression[2]) + ")";
		case "/":
			return "(" + get_code(expression[1]) + " / " + get_code(expression[2]) + ")";
		case "^":
			return "safePow(" + get_code(expression[1]) + "," + get_code(expression[2]) + ")";
	}
}

function get_Tex(expression) {
	let ans = "";
	if (typeof(expression) == "string") {
		if (expression.match("^(" + numericConstant + ")$")) {
			return expression;
		} else if (expression.match("^(" + variableName + ")$")) {
			switch(expression) {
				case "e":
					return "e";
				case "pi":
					return "\\pi";
				case "t":
					return "t";
				case "x":
					return "x";
				case "y":
					return "y";
			}
		}
		return "{It shouldn't have reached this place: " + expression + "}";
	}
	if (expression[0].match("^(" + functionName + ")$")) {
		if(expression[0] == "log") return "\\log_{10}\\lp " + get_Tex(expression[1]) + "\\rp ";
		if(expression[0] == "ln") return "\\ln\\lp " + get_Tex(expression[1]) + "\\rp ";
		if(expression[0] == "sqrt") return "\\sqrt \{" + get_Tex(expression[1]) + "\}";
		if(expression[0] == "abs") return "\\left | " + get_Tex(expression[1]) + "\\right |"; 
		return  "\\" + expression[0] + " \\lp " + get_Tex(expression[1]) + "\\rp ";
	}
	switch(expression[0]) {
		case "+":
			return  get_Tex(expression[1]) + " + " + get_Tex(expression[2]) ;
		case "-":
			if (expression.length == 2) {
				if (typeof expression[1] !== 'string')
					if (expression[1][0] !== '^')
						return " -\\lp " + get_Tex(expression[1]) + " \\rp ";
				return "-" + get_Tex(expression[1]) ;
			}
			return get_Tex(expression[1]) + " - " + get_Tex(expression[2])
		case "*":
		case "\#":

			let left = "";
			let right = "";
			let middle = expression[0] === '*' ? " " : " \\cdot ";

			if (typeof expression[2] === 'string') {
				right = get_Tex(expression[2])
				//if (expression[2].match("^(" + numericConstant + ")$")) middle = " \\cdot ";
			} else {
				if (expression[2][0] === '+' || expression[2][0] === '-')
					right = " \\lp " + get_Tex(expression[2]) + " \\rp ";
				else right = get_Tex(expression[2]);
			}

			if (typeof expression[1] === 'string') {
				left = get_Tex(expression[1]);
			} else {
				if (expression[1][0] === '+' || expression[1][0] === '-')
					if (expression[1].length == 2)
						left = get_Tex(expression[1])
					else left = "\\lp " + get_Tex(expression[1]) + " \\rp ";
				else left = get_Tex(expression[1]);
			}

			return left + middle + right;

		case "/":
			return "\\frac\{" + get_Tex(expression[1]) + "\}\{ " + get_Tex(expression[2]) + "\}";
		case "^":
			if (typeof expression[1] !== 'string') 
				return "\\lp " + get_Tex(expression[1]) + "\\rp^\{" + get_Tex(expression[2]) + "\}";
			return  get_Tex(expression[1]) + "^\{" + get_Tex(expression[2]) + "\}";
	}
}



export function get_GLSL_and_Tex(expression, name) {
	if (name == "") return {};
	const parsed = parse_input(expression);
	if (!parsed) {
		if (name == "f1") return {"GLSL":"float f1(vec2 p){return p.x;}", "Tex":""};
		if (name == "f2") return {"GLSL":"float f2(vec2 p){return p.y;}", "Tex":""};
		return "";
	}


	const GLSL = "float " + name + "(vec2 p){\nfloat x = p.x; float y = p.y;\n return " + get_code(parsed) + ";\n}\n";
	const Tex = get_Tex(parsed);

	//console.log(GLSL)
	return {"GLSL": GLSL, "Tex": Tex};
}


export function toGLSL_f1(expression)
{
	const parsed = parse_input(expression);
	if(!parsed) return "float f1(vec2 p){return p.x;}";

	return "float f1(vec2 p){\nfloat x = p.x; float y = p.y;\n return " + get_code(parsed) + ";\n}\n";
}


export function toGLSL_f2(expression)
{
	const parsed = parse_input(expression);
	if(!parsed) return "float f2(vec2 p){return p.y;}";

	return "float f2(vec2 p){\nfloat x = p.x; float y = p.y;\n return " + get_code(parsed) + ";\n}\n";
}



//const full_graph = parse_input('1.5 + 2.5 * exp(10 + 10.0 * pi) - 5 / cos(10x^2 / (3+y))')
//console.log(toGLSL('1.5 + 2.5 * exp(10 + 10.0 * pi) - 5 / (10 + x^2)'))
//  