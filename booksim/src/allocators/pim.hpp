#ifndef _PIM_HPP_
#define _PIM_HPP_

#include <vector>

#include "allocator.hpp"

class PIM : public DenseAllocator {
  int _PIM_iter;

public:
  PIM( Module *parent, const string& name,
       int inputs, int outputs, int iters );

  ~PIM( );

  void Allocate( );
};

#endif
