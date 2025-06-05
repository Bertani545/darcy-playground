


class node
{
	constructor(expression, isWrapper)
	{
		this.next = null;
		this.conector = null; //+*/^
		this.parent = null;

		this.value = expression; // e, pi, cos, sin, 1.5, -2.5, sqrt, pow, (), ||, []

		this.isWrapper = isWrapper; // if value is 
		this.parenthesisContents = null; // some other expression
	}

}

class Graph
{
	constructor()
	{
		this.head = null;
		this.current = this.head;
	}

	add_node_normal(node)
	{
		this.current.next = node;
		node.parent = this.current.parent;
		this.current = node;

	}

	add_node_inside_wrap(node)
	{
		this.current.parenthesisContents = node;
		node.parent = this.current;
		this.current = node;
	}
	wrap_finished()
	{
		this.current = this.current.parent;
	}
	add_connector(conector)
	{
		this.current.conector = conector
	}
}


const number = "^([0-9]*[.])?[0-9]+$";
const variableName = "^(e|pi|t)$";
const functionName = "ln|log|lg|exp|sqrt|sinh?|cosh?|tanh?|asin|acos|atan|sech?|csch?|coth?|sqrt";
const identifier = functionName + "|" + variableName;
const symbol = "[\\[\\]()+*/^-\\|]";
const whitespace = "\\s+";



class expressionTraveler
{
	constructor(exp)
    {

    }
}


// Returns what it reads
function number_reader()
{

}

function function_reader()
{

}

function constant_reader()
{

}

function is_correctly_closed(exp)
{
	//Checks is (), [] and || are correctly closed
	const stack = [];

	const values = ['(', ')', '[', ']', '|'];
	for(let char of exp)
	{
		if(!values.includes(char)) continue;

		switch (char) {

			case '(':
			case '[':
			case '|':
				stack.push(char);
				break;
			// Both of these will never appear in the stack
			case ']':
				{
					if(stack[stack.length-1] == '(') return false;
					if(stack[stack.length-1] == '['){stack.pop(); break;}
					// Special case: a lot of |
					let poped = 0;
					let i = stack.length-1;
					while(stack[i] == '|' &&  i > -1){i--; stack.pop(); poped++; }
					if(i < 0 || stack[i] != '[' || (poped)%2 == 1) return false;
					stack.pop(); // pop the [

					break;
				}
			case ')':
				{
					if(stack[stack.length-1] == '[') return false;
					if(stack[stack.length-1] == '('){stack.pop(); break;}
					// Special case: a lot of |
					let poped = 0;
					let i = stack.length-1;
					while(stack[i] == '|' &&  i > -1){i--; stack.pop(); poped++;}
					if(i < 0 || stack[i] != '(' || (poped)%2 == 1) return false;
					stack.pop(); // pop the (

					break;
				}

			default:
				console.log("Something went wrong");
				break;
		}
	}

	console.log(stack)
	if(stack.length > 0)
	{
		let total = 0
		for(let char of stack)
		{
			if(char == '|')
			{
				total++;
			}
			else return false;
		}
	if(total%2 == 1) return false;
	} 

	return true;
}


function read_expression(exp)
{	
	const trimmed = exp.replace(/\s+/g, "");
	if(!is_correctly_closed(trimmed)) return null;
	const graph = new Graph();

	// Check if first letter is not valid = * / ] ) ^

	return trimmed

}

//const exp = read_expression(" 1.5 + 2.5 * exp(10.y + 10) - 5 / cos(10x)");
//console.log(exp)

const exp = "[(|)(|)]"
console.log(is_correctly_closed(exp));