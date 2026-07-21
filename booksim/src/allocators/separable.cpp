// ----------------------------------------------------------------------
//
//  SeparableAllocator: Separable Allocator Base Class
//
// ----------------------------------------------------------------------

#include "separable.hpp"

#include <sstream>

#include "arbiter.hpp"

SeparableAllocator::SeparableAllocator( Module* parent, const string& name,
					int inputs, int outputs,
					const string& arb_type )
  : SparseAllocator( parent, name, inputs, outputs )
{
  
  _input_arb.resize(inputs);

  for (int i = 0; i < inputs; ++i) {
    ostringstream arb_name("arb_i");
    arb_name << i;
    _input_arb[i] = Arbiter::NewArbiter(this, arb_name.str(), arb_type, outputs);
  }

  _output_arb.resize(outputs);

  for (int i = 0; i < outputs; ++i) {
    ostringstream arb_name("arb_o");
    arb_name << i;
    _output_arb[i] = Arbiter::NewArbiter(this, arb_name.str( ), arb_type, inputs);
  }

}

SeparableAllocator::~SeparableAllocator() {

  for (int i = 0; i < _inputs; ++i) {
    delete _input_arb[i];
  }

  for (int i = 0; i < _outputs; ++i) {
    delete _output_arb[i];
  }

}

void SeparableAllocator::Clear() {
  for ( int i = 0 ; i < _inputs ; i++ ) {
    if(_input_arb[i]-> _num_reqs)
      _input_arb[i]->Clear();
  }
  for ( int o = 0; o < _outputs; o++ ) {
    if(_output_arb[o]->_num_reqs)
      _output_arb[o]->Clear();
  }
  SparseAllocator::Clear();
}
