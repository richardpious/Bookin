// ----------------------------------------------------------------------
//
//  RoundRobin: RoundRobin Arbiter
//
// ----------------------------------------------------------------------

#include "roundrobin_arb.hpp"
#include <iostream>
#include <limits>

using namespace std ;

RoundRobinArbiter::RoundRobinArbiter( Module *parent, const string &name,
				      int size ) 
  : Arbiter( parent, name, size ), _pointer( 0 ) {
}

void RoundRobinArbiter::PrintState() const  {
  cout << "Round Robin Priority Pointer: " << endl ;
  cout << "  _pointer = " << _pointer << endl ;
}

void RoundRobinArbiter::UpdateState() {
  // update priority matrix using last grant
  if ( _selected > -1 ) 
    _pointer = ( _selected + 1 ) % _size ;
}

void RoundRobinArbiter::AddRequest( int input, int id, int pri )
{
  if(!_request[input].valid || (_request[input].pri < pri)) {
    if((_num_reqs == 0) || 
       Supersedes(input, pri, _best_input, _highest_pri, _pointer,_size )) {
      _highest_pri = pri;
      _best_input = input;
    }
  }
  Arbiter::AddRequest(input, id, pri);
}

int RoundRobinArbiter::Arbitrate( int* id, int* pri ) {
  
  _selected = _best_input;
  
  return Arbiter::Arbitrate(id, pri);
}

void RoundRobinArbiter::Clear()
{
  _highest_pri = numeric_limits<int>::min();
  _best_input = -1;
  Arbiter::Clear();
}
