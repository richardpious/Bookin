// ----------------------------------------------------------------------
//
//  Matrix: Matrix Arbiter
//
// ----------------------------------------------------------------------

#ifndef _MATRIX_ARB_HPP_
#define _MATRIX_ARB_HPP_

#include <vector>

#include "arbiter.hpp"

using namespace std;

class MatrixArbiter : public Arbiter {

  // Priority matrix
  vector<vector<int> > _matrix ;

  int  _last_req ;

public:

  // Constructors
  MatrixArbiter( Module *parent, const string &name, int size ) ;

  // Print priority matrix to standard output
  virtual void PrintState() const ;
  
  // Update priority matrix based on last aribtration result
  virtual void UpdateState() ; 

  // Arbitrate amongst requests. Returns winning input and 
  // updates pointers to metadata when valid pointers are passed
  virtual int Arbitrate( int* id = 0, int* pri = 0) ;

  virtual void AddRequest( int input, int id, int pri ) ;

  virtual void Clear();

} ;

#endif
