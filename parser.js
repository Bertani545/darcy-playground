


class Node
{
	constructor()
	{
		this.next = null;
		this.conector = null; //+*/^
		this.parent = null;

		this.value = null; // e, pi, cos, sin, 1.5, -2.5, sqrt, pow, (), ||, []

		this.isWrapper = null; // if value is 
		this.parenthesisContents = null; // some other expression
	}

	set_value(expression, isWrapper)
	{
		this.value = expression;
		this.isWrapper = isWrapper;
	}

}

class Graph
{
	constructor()
	{
		this.head = new Node();;
		this.current = this.head;
	}

	add_connector(conector)
	{
		this.current.conector = conector
		this.current.next = new Node();
		this.current = this.current.next;
	}

	add_wrapper(wrapper)
	{
		this.current.value = wrapper;
		this.current.isWrapper = true;
		this.current.parenthesisContents = new Node();
		this.current.parenthesisContents.parent = this.current;
		this.current = this.current.parenthesisContents;

	}

	get current_value()
	{
		return this.current.value;
	}


	implicitMultiplication(value)
	{
		this.current.next = new Node();
		this.current.conector = "*";
		this.current = this.current.next;
		this.current.value = value;
	}
}




function is_correctly_closed(exp)
{
	//Checks is (), [] and || are correctly closed
	const stack = [];

	const values = ['(', ')', '[', ']'];
	for(let char of exp)
	{
		if(!values.includes(char)) continue;

		switch (char) {

			case '(':
			case '[':
				stack.push(char);
				break;
			// Both of these will never appear in the stack
			case ']':
				{
					if(stack[stack.length-1] == '(') return false;
					if(stack[stack.length-1] == '['){stack.pop(); break;}
				}
			case ')':
				{
					if(stack[stack.length-1] == '[') return false;
					if(stack[stack.length-1] == '('){stack.pop(); break;}
				}

			default:
				console.log("Something went wrong");
				break;
		}
	}

	if(stack.length > 0) return false;

	return true;
}



// Remeber to impement that if () or [] or || exists, it must pop the parent from the list

//const exp = parse_input(" 1.5 + 2.5 * exp(10.y + 10) - 5 / cos(10x)");
//console.log(exp)

var numericConstant = "[0-9]*\\.?[0-9]+([eE][-+]?[0-9]+)?";
var variableName = "(e|pi|tau|t|x|y)";
var functionName = "ln|log|lg|exp|abs|sqrt|sinh?|cosh?|tanh?|asin|acos|atan|sech?|csch?|coth?|sqrt";
var identifier = functionName + "|" + variableName;
var symbol = "[\\[\\]\\(\\)+*/^-]";
var whitespace = "(\\s|\\t|\\n|\\r|\\v)+";
var wrapper = functionName + "|\\[|\\(";

function tokenize(expression) {
	var token = RegExp("(" + numericConstant + "|" + identifier + "|" + symbol + "|" + whitespace + ")", "g");
	
	var tokenStream = expression.match(token);
	if (!tokenStream) return false;
	if (tokenStream.join("") != expression) return false;
	
	tokenStream = tokenStream.filter(function(token) {
		return ! token.match("^(" + whitespace + ")$");
	});
	
	//tokenStream.push("\n");
	
	return tokenStream;

}

function isVariableName(token) {
		if (token.match("^(" + variableName + ")$")) {
			//++i;
			//if (token == 't') {
				//timeDependent = true;
			//} 
			//return token;
			return true;
		} else return false;
	}
	
	function isFunctionName(token) {
		if (token.match("^(" + functionName + ")$")) {
			//++i;
			//return token;
			return true;
		} else return false;
	}
	
	function isWrapper(token){
		if(token.match("^(" + wrapper + ")$")) return true;
		return false;
	}

	function isNumericConstant(token) {
		if (token.match("^(" + numericConstant + ")$")) {
			//++i;
			//return token;
			return true;
		} else return false;
	}
	function isConector(token){
		if(token.match("^([+-/*^])$")) return true;
		return false;
	}


function read_expression(exp, graph)
{
	if(!exp) return 0;
	let i = 0;
	
	
	while(i < exp.length)
	{
		console.log(i, exp[i]);
		let currentToken = exp[i];
		if(isVariableName(currentToken) || isNumericConstant(currentToken))
		{
			if(graph.current.value != null)
			{
				graph.implicitMultiplication(currentToken);
			}
			else
			{
				graph.current.value = currentToken;
			}
			i++;
			continue;
		}
		if(isConector(currentToken))
		{
			if(currentToken == '+' || currentToken == '-')
			{
				graph.add_connector(currentToken);
				i++;
				continue;
			}
			if(['*', '/', '^'].includes(currentToken))
			{
				if(!graph.current_value){ console.log("*, / and ^ must have something before"); return 0;}
				graph.add_connector(currentToken);
				i++;
				continue;
			}
		}

		if(isWrapper(currentToken))
		{
			let closer = "";
			let opener = "";
			if(isFunctionName(currentToken))
			{
				i++;
				if(exp[i] != '('){console.log('Please wrap contents of functions between ()'); return 0;}
				closer = ")";
				opener = "(";
			}
			else
			{
				opener = currentToken;
				switch (opener) {
					case '(':
						closer = ')';
						break;
					case '[':
						closer = ']';
						break;
					default:
						console.log("Shouldn't get here");
						break;
				}
			}
			
			// Find close of (
			let j = i+1;
			let seen = 0;
			while(!(exp[j] == closer && seen == 0)) // No anidated | 1 + | 1 | + 1|
 			{
				if(exp[j] == opener) seen++;
				if(exp[j] == closer) seen--;
				j++;
			}
			// j hold where the end is
			// (i,j) is our new expression
			if(i+1 == j){console.log("Empty statement"); return 0;}
			const parent = graph.current;
			graph.add_wrapper(currentToken);
			const success = read_expression(exp.slice(i+1, j), graph);
			if(!success) return 0;
			graph.current = parent;
			i = j + 1;
		}

	}

	return 1;
}


function parse_input(exp)
{	
	let trimmed = exp.replace(/\s+/g, "");
	if(!is_correctly_closed(trimmed)){console.log("Please close correctly all your parethesis"); return null;}
	const graph = new Graph();
	console.log(graph)
	let tokenized = tokenize(trimmed);
	if(!tokenized) return null;
	let status_reader = read_expression(tokenized, graph);
	if(status_reader == 0) return null;
	console.log(graph)
	return graph;
}


function get_code(current)
{
	let ans = "";
	while(current)
	{
		if(current.isWrapper)
		{
			if(isFunctionName(current.value)) ans += current.value;
			ans += "(";
			ans += get_code(current.parenthesisContents);
			ans += ")";
		}
		else
		{
			if(current.value) ans += current.value;
			// Must have conector 
			if(current.conector) ans += current.conector;
		}
		current = current.next;
	}
	return ans;
}


function toGLSL(graph)
{
	if(!graph) return "float f1(vec2 p){return 0.0;}";

	return "float f1(vec2 p){\nfloat x = p.x; float y = p.y;\n return " + get_code(graph.head) + ";\n}";
}

const full_graph = parse_input('1.5 + 2.5 * exp(10 + 10.0.0pi) - 5 / cos(10x^2 / (3++++--++-y))')
console.log(toGLSL(full_graph))
//  
// Tokenize first, do my shit later