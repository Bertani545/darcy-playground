//Asumes same size 
function dotProd_listOfNumbers_listOfVec2(L1, L2)
{
  if(L1.length != L2.length){throw new Error("Attemped a dot product with list of different sizes");}
  const ln = L1.length;

  let result = [0,0]

  for(let i = 0; i < ln; i++)
  {
    result[0] += L1[i] * L2[i][0];
    result[1] += L1[i] * L2[i][1];
  }
  return result;
}


//parameters are lists. Returns Vector2D
export function multiply_LML_4x4(v1, M, v2)
{
  //First multiplication
  const r1 = [M[ 0], M[ 1], M[ 2], M[ 3]];
  const r2 = [M[ 4], M[ 5], M[ 6], M[ 7]];
  const r3 = [M[ 8], M[ 9], M[10], M[11]];
  const r4 = [M[12], M[13], M[14], M[15]];
  


  const middle_res = [dotProd_listOfNumbers_listOfVec2(r1, v2),
                dotProd_listOfNumbers_listOfVec2(r2, v2),
                dotProd_listOfNumbers_listOfVec2(r3, v2),
                dotProd_listOfNumbers_listOfVec2(r4, v2)]
   return dotProd_listOfNumbers_listOfVec2(v1, middle_res);
}

export function multiply_LML_3x3(v1, M, v2)
{
  //First multiplication
  const r1 = [M[0], M[1], M[2]];
  const r2 = [M[3], M[4], M[5]];
  const r3 = [M[6], M[7], M[8]];
  
  const middle_res = [dotProd_listOfNumbers_listOfVec2(r1, v2),
                dotProd_listOfNumbers_listOfVec2(r2, v2),
                dotProd_listOfNumbers_listOfVec2(r3, v2)]
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


export function multiply_MM(m1, m2)
{
  return new Float32Array([
    m1[0]*m2[0] + m1[3]*m2[1] + m1[6]*m2[2],
    m1[1]*m2[0] + m1[4]*m2[1] + m1[7]*m2[2],
    m1[2]*m2[0] + m1[5]*m2[1] + m1[8]*m2[2],

    m1[0]*m2[3] + m1[3]*m2[4] + m1[6]*m2[5],
    m1[1]*m2[3] + m1[4]*m2[4] + m1[7]*m2[5],
    m1[2]*m2[3] + m1[5]*m2[4] + m1[8]*m2[5],

    m1[0]*m2[6] + m1[3]*m2[7] + m1[6]*m2[8],
    m1[1]*m2[6] + m1[4]*m2[7] + m1[7]*m2[8],
    m1[2]*m2[6] + m1[5]*m2[7] + m1[8]*m2[8],
  ]);
}


export function multiply_MV(m, v)
{
  return new Float32Array([
    m[0]*v[0] + m[3]*v[1] + m[6]*v[2],
    m[1]*v[0] + m[4]*v[1] + m[7]*v[2],
    m[2]*v[0] + m[5]*v[1] + m[8]*v[2],
  ]);
}