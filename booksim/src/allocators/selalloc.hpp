#ifndef _SELALLOC_HPP_
#define _SELALLOC_HPP_

#include <vector>

#include "allocator.hpp"

class SelAlloc : public SparseAllocator {
  int _iter;

  vector<int> _aptrs;
  vector<int> _gptrs;

  vector<int> _outmask;

public:
  SelAlloc( Module *parent, const string& name,
	    int inputs, int outputs, int iters );

  void Allocate( );

  void MaskOutput( int out, int mask = 1 );

  virtual void PrintRequests( ostream * os = NULL ) const;

};

#endif 
