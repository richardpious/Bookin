// ----------------------------------------------------------------------
//
//  SeparableOutputFirstAllocator: Separable Output-First Allocator
//
// ----------------------------------------------------------------------

#include "separable_output_first.hpp"

#include "booksim.hpp"
#include "arbiter.hpp"

#include <vector>
#include <iostream>
#include <cstring>

SeparableOutputFirstAllocator::
SeparableOutputFirstAllocator( Module* parent, const string& name, int inputs,
			       int outputs, const string& arb_type )
  : SeparableAllocator( parent, name, inputs, outputs, arb_type )
{}

void SeparableOutputFirstAllocator::Allocate() {
  
  set<int>::const_iterator port_iter = _out_occ.begin();
  while(port_iter != _out_occ.end()) {
    
    const int & output = *port_iter;

    // add requests to the output arbiter

    map<int, sRequest>::const_iterator req_iter = _out_req[output].begin();
    while(req_iter != _out_req[output].end()) {
      
      const sRequest & req = req_iter->second;

      _output_arb[output]->AddRequest(req.port, req.label, req.out_pri);

      ++req_iter;
    }
    
    // Execute the output arbiter and propagate the grants to the
    // input arbiters.

    int label = -1;
    const int input = _output_arb[output]->Arbitrate(&label, NULL);
    assert(input > -1);

    const sRequest & req = _in_req[input][output];
    assert((req.port == output) && (req.label == label));

    _input_arb[input]->AddRequest(req.port, req.label, req.in_pri);

    ++port_iter;
  }
  
  port_iter = _in_occ.begin();
  while(port_iter != _in_occ.end()) {
    
    const int & input = *port_iter;

    // Execute the input arbiters.
    
    const int output = _input_arb[input]->Arbitrate(NULL, NULL);
  
    if(output > -1) {
      assert((_inmatch[input] == -1) && (_outmatch[output] == -1));

      _inmatch[input] = output;
      _outmatch[output] = input;
      _input_arb[input]->UpdateState() ;
      _output_arb[output]->UpdateState() ;
    }
    
    ++port_iter;
  }
}
