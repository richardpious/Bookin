// ----------------------------------------------------------------------
//
//  Arbiter: Base class for Matrix and Round Robin Arbiter
//
// ----------------------------------------------------------------------

#include "arbiter.hpp"
#include "roundrobin_arb.hpp"
#include "matrix_arb.hpp"
#include "tree_arb.hpp"

#include <limits>
#include <cassert>

using namespace std ;

Arbiter::Arbiter( Module *parent, const string &name, int size )
  : Module( parent, name ),
    _size(size), _selected(-1), _highest_pri(numeric_limits<int>::min()),
    _best_input(-1), _num_reqs(0)
{
  _request.resize(size);
  for ( int i = 0 ; i < size ; i++ ) 
    _request[i].valid = false ;
}

void Arbiter::AddRequest( int input, int id, int pri )
{
  assert( 0 <= input && input < _size ) ;
  assert( !_request[input].valid );

  _num_reqs++ ;
  _request[input].valid = true ;
  _request[input].id = id ;
  _request[input].pri = pri ;
}

int Arbiter::Arbitrate( int* id, int* pri )
{
  if ( _selected != -1 ) {
    if ( id )
      *id  = _request[_selected].id ;
    if ( pri )
      *pri = _request[_selected].pri ;
  }

  assert((_selected >= 0) || (_num_reqs == 0));

  return _selected ;
}

void Arbiter::Clear()
{
  if(_num_reqs > 0) {
    
    // clear the request vector
    for ( int i = 0; i < _size ; i++ )
      _request[i].valid = false ;
    _num_reqs = 0 ;
    _selected = -1;
  }
}

Arbiter *Arbiter::NewArbiter( Module *parent, const string& name,
			      const string &arb_type, int size)
{
  Arbiter *a = NULL;
  if(arb_type == "round_robin") {
    a = new RoundRobinArbiter( parent, name, size );
  } else if(arb_type == "matrix") {
    a = new MatrixArbiter( parent, name, size );
  } else if(arb_type.substr(0, 5) == "tree(") {
    size_t left = 4;
    size_t middle = arb_type.find_first_of(',');
    assert(middle != string::npos);
    size_t right = arb_type.find_last_of(')');
    assert(right != string::npos);
    string groups_str = arb_type.substr(left+1, middle-left-1);
    int groups = atoi(groups_str.c_str());
    string sub_arb_type = arb_type.substr(middle+1, right-middle-1);
    a = new TreeArbiter( parent, name, size, groups, sub_arb_type );
  } else assert(false);
  return a;
}
