// ----------------------------------------------------------------------
//
//  SeparableInputFirstAllocator: Separable Input-First Allocator
//
// ----------------------------------------------------------------------

#include "separable_input_first.hpp"

#include "booksim.hpp"
#include "arbiter.hpp"

#include <vector>
#include <iostream>
#include <cstring>

SeparableInputFirstAllocator::
SeparableInputFirstAllocator( Module* parent, const string& name, int inputs,
			      int outputs, const string& arb_type )
  : SeparableAllocator( parent, name, inputs, outputs, arb_type )
{}

void SeparableInputFirstAllocator::Allocate() {
  
  set<int>::const_iterator port_iter = _in_occ.begin();
  while(port_iter != _in_occ.end()) {
    
    const int & input = *port_iter;

    // add requests to the input arbiter

    map<int, sRequest>::const_iterator req_iter = _in_req[input].begin();
    while(req_iter != _in_req[input].end()) {

      const sRequest & req = req_iter->second;
      
      _input_arb[input]->AddRequest(req.port, req.label, req.in_pri);

      ++req_iter;
    }

    // Execute the input arbiters and propagate the grants to the
    // output arbiters.

    int label = -1;
    const int output = _input_arb[input]->Arbitrate(&label, NULL);
    assert(output > -1);

    const sRequest & req = _out_req[output][input]; 
    assert((req.port == input) && (req.label == label));

    _output_arb[output]->AddRequest(req.port, req.label, req.out_pri);

    ++port_iter;
  }

  port_iter = _out_occ.begin();
  while(port_iter != _out_occ.end()) {

    const int & output = *port_iter;

    // Execute the output arbiters.
    
    const int input = _output_arb[output]->Arbitrate(NULL, NULL);

    if(input > -1) {
      assert((_inmatch[input] == -1) && (_outmatch[output] == -1));

      _inmatch[input] = output ;
      _outmatch[output] = input ;
      _input_arb[input]->UpdateState() ;
      _output_arb[output]->UpdateState() ;
    }

    ++port_iter;
  }
}
