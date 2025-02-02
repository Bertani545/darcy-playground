//Asumes same size 
function dotProd_listOfNumbers_listOfVec2(L1, L2)
{
  if(L1.length != L2.length){throw new Error("Attemped a dot product with list of different sizes");}
  const ln = L1.length;

  let result = new Vector2D(0,0)

  for(let i = 0; i < ln; i++)
  {
    result = result.add(L2[i].multiply(L1[i]));
  }
  return result;
}


//parameters are lists. Returns Vector2D
export function multiply_LML_4x4(v1, M, v2)
{
  //First multiplication
  const r1 = [M[0], M[4], M[ 8], M[12]];
  const r2 = [M[1], M[5], M[ 9], M[13]];
  const r3 = [M[2], M[6], M[10], M[14]];
  const r4 = [M[3], M[7], M[11], M[15]];
  


  const middle_res = [dotProd_listOfNumbers_listOfVec2(r1, v2),
                dotProd_listOfNumbers_listOfVec2(r2, v2),
                dotProd_listOfNumbers_listOfVec2(r3, v2),
                dotProd_listOfNumbers_listOfVec2(r4, v2)]
   return dotProd_listOfNumbers_listOfVec2(v1, middle_res);
}


export class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  // Add another vector
  add(vector) {
    return new Vector2D(this.x + vector.x, this.y + vector.y);
  }

  // Subtract another vector
  subtract(vector) {
    return new Vector2D(this.x - vector.x, this.y - vector.y);
  }

  // Multiply by a scalar
  multiply(scalar) {
    return new Vector2D(this.x * scalar, this.y * scalar);
  }

  // Divide by a scalar
  divide(scalar) {
    if (scalar !== 0) {
      return new Vector2D(this.x / scalar, this.y / scalar);
    } else {
      throw new Error("Cannot divide by zero");
    }
  }

  // Calculate dot product with another vector
  dot(vector) {
    return this.x * vector.x + this.y * vector.y;
  }

  // Get magnitude (length) of the vector
  magnitude() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }

  // Normalize the vector (make it unit length)
  normalize() {
    const mag = this.magnitude();
    if (mag !== 0) {
      return this.divide(mag);
    } else {
      throw new Error("Cannot normalize a zero-length vector");
    }
  }

  // Calculate the distance to another vector
  distanceTo(vector) {
    return this.subtract(vector).magnitude();
  }

  // Display the vector as a string
  toString() {
    return `(${this.x}, ${this.y})`;
  }
}




export function get_rotation_matrix(theta)
{
  return new Float32Array([Math.cos(theta), Math.sin(theta), 0, 
                          -Math.sin(theta), Math.cos(theta), 0,
                            0, 0 , 1]);
}

export function get_translation_matrix(x, y)
{
  return new Float32Array([1, 0, 0,
                           0, 1, 0,
                           x, y, 1]);
}

export function get_scale_matrix(sx, sy)
{
  return new Float32Array([sx, 0, 0,
                           0, sy, 0,
                           0, 0, 1]);
}