// ----------------------------------------------------------------------
//
//  Matrix: Matrix Arbiter
//
// ----------------------------------------------------------------------

#include "matrix_arb.hpp"
#include <iostream>
using namespace std ;

MatrixArbiter::MatrixArbiter( Module *parent, const string &name, int size )
  : Arbiter( parent, name, size ), _last_req(-1) {
  _matrix.resize(size);
  for ( int i = 0 ; i < size ; i++ ) {
    _matrix[i].resize(size);
    for ( int j = 0; j < i; j++ ) {
      _matrix[i][j] = 1;
    }
  }
}

void MatrixArbiter::PrintState() const  {
  cout << "Priority Matrix: " << endl ;
  for ( int r = 0; r < _size ; r++ ) {
    for ( int c = 0 ; c < _size ; c++ ) {
      cout << _matrix[r][c] << " " ;
    }
    cout << endl ;
  }
  cout << endl ;
}

void MatrixArbiter::UpdateState() {
  // update priority matrix using last grant
  if ( _selected > -1 ) {
    for ( int i = 0; i < _size ; i++ ) {
      if( _selected != i ) {
	_matrix[_selected][i] = 0 ;
	_matrix[i][_selected] = 1 ;
      }
    }
  }
}

void MatrixArbiter::AddRequest( int input, int id, int pri )
{
  _last_req = input;
  Arbiter::AddRequest(input, id, pri);
}

int MatrixArbiter::Arbitrate( int* id, int* pri ) {
  
  // avoid running arbiter if it has not recevied at least two requests
  // (in this case, requests and grants are identical)
  if ( _num_reqs < 2 ) {
    
    _selected = _last_req ;
    
  } else {
    
    _selected = -1 ;

    for ( int input = 0 ; input < _size ; input++ ) {
      if(_request[input].valid) {
	
	bool grant = true;
	for ( int i = 0 ; i < _size ; i++ ) {
	  if ( _request[i].valid &&
	       ( ( ( _request[i].pri == _request[input].pri ) &&
		   _matrix[i][input]) ||
		 ( _request[i].pri > _request[input].pri )
		 ) ) {
	    grant = false ;
	    break ;
	  }
	}
	
	if ( grant ) {
	  _selected = input ;
	  break ; 
	}
      }
      
    }
  }
    
  return Arbiter::Arbitrate(id, pri);
}

void MatrixArbiter::Clear()
{
  _last_req = -1;
  Arbiter::Clear();
}
