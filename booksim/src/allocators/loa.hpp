#ifndef _LOA_HPP_
#define _LOA_HPP_

#include <vector>

#include "allocator.hpp"

class LOA : public DenseAllocator {
  vector<int> _counts;
  vector<int> _req;

  vector<int> _rptr;
  vector<int> _gptr;

public:
  LOA( Module *parent, const string& name,
       int inputs, int outputs );

  void Allocate( );
};

#endif
