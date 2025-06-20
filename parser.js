var numericConstant = "[0-9]*\\.?[0-9]+([eE][-+]?[0-9]+)?";
var variableName = "(e|pi|t|x|y)";
var functionName = "ln|log|exp|gamma|abs|sqrt|sinh?|cosh?|tanh?|asin|acos|atan|sech?|csch?|coth?";
var identifier = functionName + "|" + variableName;
var symbol = "[\\[\\]()+*/^!-]";
var whitespace = "(\\s|\\t|\\n|\\r|\\v)+";

function tokenize(expression) {
	var token = RegExp("(" + numericConstant + "|" + identifier + "|" + symbol + "|" + whitespace + ")", "g");
	
	var tokenStream = expression.match(token);
	if (!tokenStream) return false;
	if (tokenStream.join("") != expression) return false;
	
	tokenStream = tokenStream.filter(function(token) {
		return ! token.match("^(" + whitespace + ")$");
	});
	
	tokenStream.push("\n");
	
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

	function parseMultiplicativeExpression() {
		const i0 = i;
		let left = parseExponentialExpression();
		if (!left) return false;
		while (inputStream[i] == '*' || inputStream[i] == '/') {
			const operator = inputStream[i++];
			const right = parseExponentialExpression();
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
	let trimmed = exp.replace(/\s+/g, "");
	//if(!is_correctly_closed(trimmed)){console.log("Please close correctly all your parethesis"); return null;}

	let tokenized = tokenize(trimmed);
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
			return expression;
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
			return "(" + get_code(expression[1]) + " * " + get_code(expression[2]) + ")";
		case "/":
			return "(" + get_code(expression[1]) + " / " + get_code(expression[2]) + ")";
		case "^":
			return "pow(" + get_code(expression[1]) + "," + get_code(expression[2]) + ")";
	}
}


function toGLSL(expression)
{
	const parsed = parse_input(expression);
	if(!parsed) return "float f1(vec2 p){return 0.0;}";

	return "float f1(vec2 p){\nfloat x = p.x; float y = p.y;\n return " + get_code(parsed) + ";\n}";
}

const full_graph = parse_input('1.5 + 2.5 * exp(10 + 10.0 * pi) - 5 / cos(10x^2 / (3+y))')
console.log(toGLSL('1.5 + 2.5 * exp(10 + 10.0 * pi) - 5 / (10 + x^2)'))
//  
// Tokenize first, do my shit later