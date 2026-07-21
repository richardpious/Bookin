// ----------------------------------------------------------------------
//
//  SeparableAllocator: Separable Allocator Base Class
//
// ----------------------------------------------------------------------

#ifndef _SEPARABLE_HPP_
#define _SEPARABLE_HPP_

#include <vector>

#include "allocator.hpp"

class Arbiter;

class SeparableAllocator : public SparseAllocator {
  
protected:

  vector<Arbiter*> _input_arb ;
  vector<Arbiter*> _output_arb ;

public:
  
  SeparableAllocator( Module* parent, const string& name, int inputs,
		      int outputs, const string& arb_type ) ;
  
  virtual ~SeparableAllocator() ;

  virtual void Clear() ;

} ;

#endif
