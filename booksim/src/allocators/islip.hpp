#ifndef _ISLIP_HPP_
#define _ISLIP_HPP_

#include <vector>

#include "allocator.hpp"

class iSLIP_Sparse : public SparseAllocator {
  int _iSLIP_iter;

  vector<int> _gptrs;
  vector<int> _aptrs;

public:
  iSLIP_Sparse( Module *parent, const string& name,
		int inputs, int outputs, int iters );

  void Allocate( );
};

#endif 
